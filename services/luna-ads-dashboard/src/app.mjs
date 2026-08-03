import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  AppError,
  ObjectIntegrityError,
  PublicIdCollisionError,
} from "./errors.mjs";
import {
  newPublicId,
  parseExpiry,
  publicationState,
  readBody,
  requireArtifactId,
  requirePublicId,
  requireSha256,
  sha256,
} from "./security.mjs";
import { parsePublicationMetadata } from "./publication-metadata.mjs";

const HTML_CONTENT_TYPE = /^text\/html(?:\s*;|$)/i;
const MAX_PUBLIC_ID_ATTEMPTS = 4;

function securityHeaders() {
  return {
    "cache-control": "private, no-store, max-age=0, must-revalidate",
    pragma: "no-cache",
    expires: "0",
    "content-security-policy":
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:; " +
      "script-src 'none'; connect-src 'none'; font-src 'none'; object-src 'none'; " +
      "base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "cross-origin-resource-policy": "same-origin",
    "permissions-policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "referrer-policy": "no-referrer",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-robots-tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
  };
}

function writeHeaders(response, status, requestId, extra = {}) {
  response.writeHead(status, {
    ...securityHeaders(),
    "x-request-id": requestId,
    ...extra,
  });
}

function sendJson(response, status, requestId, body) {
  const bytes = Buffer.from(JSON.stringify(body));
  writeHeaders(response, status, requestId, {
    "content-type": "application/json; charset=utf-8",
    "content-length": bytes.length,
  });
  response.end(bytes);
}

function requestBearer(request) {
  const header = request.headers.authorization || "";
  const match = /^Bearer ([^\s]+)$/.exec(header);
  if (!match) {
    throw new AppError(
      401,
      "identity_token_required",
      "Authentication is required.",
    );
  }
  return match[1];
}

function requireHtmlContentType(request) {
  if (!HTML_CONTENT_TYPE.test(request.headers["content-type"] || "")) {
    throw new AppError(
      415,
      "unsupported_media_type",
      "Artifact must use text/html.",
    );
  }
}

function assertCompatible(existing, digest, byteLength, metadata) {
  if (
    existing.sha256 !== digest ||
    existing.byteLength !== byteLength ||
    existing.entityId !== metadata.entityId ||
    existing.sourceDigest !== metadata.sourceDigest ||
    existing.reportDate !== metadata.reportDate ||
    existing.taskId !== metadata.taskId ||
    existing.requestedPlatform !== metadata.requestedPlatform ||
    !isDeepStrictEqual(existing.platformCoverage, metadata.platformCoverage) ||
    !isDeepStrictEqual(
      existing.brandMappingCoverage,
      metadata.brandMappingCoverage,
    )
  ) {
    throw new AppError(
      409,
      "artifact_id_conflict",
      "Artifact id is already bound to different bytes or source context.",
    );
  }
}

function canonicalUrl(config, publicId) {
  return `${config.publicOrigin}/d/${publicId}`;
}

function ingestResponse(publication, config, now, idempotent) {
  const state = publicationState(publication, now);
  return {
    artifactId: publication.artifactId,
    publicId: publication.publicId,
    url: state === "active" ? canonicalUrl(config, publication.publicId) : null,
    sha256: publication.sha256,
    byteLength: publication.byteLength,
    createdAt: publication.createdAt.toISOString(),
    expiresAt: publication.expiresAt.toISOString(),
    entityId: publication.entityId,
    sourceDigest: publication.sourceDigest,
    reportDate: publication.reportDate,
    taskId: publication.taskId,
    requestedPlatform: publication.requestedPlatform,
    platformCoverage: publication.platformCoverage,
    brandMappingCoverage: publication.brandMappingCoverage,
    state,
    idempotent,
  };
}

function routeClass(pathname) {
  if (pathname.startsWith("/d/")) return "viewer";
  if (pathname.startsWith("/v1/publications")) return "publication_api";
  if (
    pathname === "/health" ||
    pathname === "/ready" ||
    pathname === "/healthz" ||
    pathname === "/readyz"
  ) {
    return "health";
  }
  return "unknown";
}

async function authorize(request, tokenVerifier, config) {
  return tokenVerifier.verify(requestBearer(request), {
    audience: config.ingestAudience,
    allowedCallers: config.allowedIngestCallers,
  });
}

function hostIsCanonical(request, config) {
  if (!config.enforcePublicHost) return true;
  const expected = new URL(config.publicOrigin).host.toLowerCase();
  return `${request.headers.host || ""}`.toLowerCase() === expected;
}

function decodePathValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new AppError(404, "not_found", "Not found.");
  }
}

export function createDashboardApp({
  repository,
  objectStore,
  tokenVerifier,
  viewerAuthorizer = { authorize: async () => ({ mode: "capability" }) },
  config,
  clock = () => new Date(),
  publicIdFactory = newPublicId,
  logger = console,
}) {
  async function ingest(request, response, requestId) {
    const identity = await authorize(request, tokenVerifier, config);
    requireHtmlContentType(request);

    const artifactId = requireArtifactId(request.headers["x-luna-artifact-id"]);
    const expectedDigest = requireSha256(request.headers["x-luna-sha256"]);
    const metadata = parsePublicationMetadata(request.headers);
    const now = clock();
    const expiresAt = parseExpiry(
      request.headers["x-luna-expires-at"],
      now,
      config,
    );
    const bytes = await readBody(request, config.maxArtifactBytes);
    const actualDigest = sha256(bytes);
    if (actualDigest !== expectedDigest) {
      throw new AppError(
        422,
        "sha256_mismatch",
        "Artifact did not match its declared SHA-256.",
      );
    }

    const existing = await repository.findByArtifactId(artifactId);
    if (existing) {
      assertCompatible(existing, actualDigest, bytes.length, metadata);
      await objectStore.readVerified({
        objectName: existing.objectName,
        objectGeneration: existing.objectGeneration,
        digest: existing.sha256,
        byteLength: existing.byteLength,
      });
      sendJson(
        response,
        200,
        requestId,
        ingestResponse(existing, config, now, true),
      );
      return;
    }

    const storedObject = await objectStore.putImmutable({
      artifactId,
      digest: actualDigest,
      bytes,
    });

    for (let attempt = 0; attempt < MAX_PUBLIC_ID_ATTEMPTS; attempt += 1) {
      try {
        const result = await repository.insertOrGet({
          artifactId,
          publicId: publicIdFactory(),
          sha256: actualDigest,
          objectName: storedObject.objectName,
          objectGeneration: storedObject.objectGeneration,
          byteLength: bytes.length,
          createdAt: now,
          expiresAt,
          createdBy: identity.actor,
          ...metadata,
        });
        assertCompatible(
          result.publication,
          actualDigest,
          bytes.length,
          metadata,
        );
        sendJson(
          response,
          result.created ? 201 : 200,
          requestId,
          ingestResponse(result.publication, config, now, !result.created),
        );
        return;
      } catch (error) {
        if (error instanceof PublicIdCollisionError) continue;
        throw error;
      }
    }

    throw new AppError(
      503,
      "public_id_generation_failed",
      "Publication could not be created.",
    );
  }

  async function revoke(request, response, requestId, artifactIdValue) {
    const identity = await authorize(request, tokenVerifier, config);
    const artifactId = requireArtifactId(artifactIdValue);
    const now = clock();
    const publication = await repository.revokeArtifact(
      artifactId,
      identity.actor,
      now,
    );
    if (!publication) {
      throw new AppError(404, "not_found", "Not found.");
    }
    sendJson(response, 200, requestId, {
      artifactId: publication.artifactId,
      state: "revoked",
      revokedAt: publication.revokedAt.toISOString(),
    });
  }

  async function view(request, response, requestId, publicIdValue) {
    if (!hostIsCanonical(request, config)) {
      throw new AppError(
        421,
        "canonical_host_required",
        "Canonical host required.",
      );
    }
    const publicId = requirePublicId(publicIdValue);
    await viewerAuthorizer.authorize(request);
    const publication = await repository.findByPublicId(publicId);
    if (!publication || publicationState(publication, clock()) !== "active") {
      throw new AppError(404, "not_found", "Not found.");
    }

    let bytes;
    try {
      bytes = await objectStore.readVerified({
        objectName: publication.objectName,
        objectGeneration: publication.objectGeneration,
        digest: publication.sha256,
        byteLength: publication.byteLength,
      });
    } catch (error) {
      if (error instanceof ObjectIntegrityError) {
        throw new AppError(
          503,
          "artifact_integrity_failure",
          "Dashboard is temporarily unavailable.",
          { cause: error },
        );
      }
      throw error;
    }

    writeHeaders(response, 200, requestId, {
      "content-type": "text/html; charset=utf-8",
      "content-length": bytes.length,
      "content-disposition": 'inline; filename="luna-ads-dashboard.html"',
      etag: `"sha256-${publication.sha256}"`,
    });
    response.end(request.method === "HEAD" ? undefined : bytes);
  }

  return async function dashboardHandler(request, response) {
    const requestId = randomUUID();
    try {
      const url = new URL(request.url, "http://service.invalid");
      if (
        request.method === "GET" &&
        (url.pathname === "/health" || url.pathname === "/healthz")
      ) {
        sendJson(response, 200, requestId, { status: "ok" });
        return;
      }
      if (
        request.method === "GET" &&
        (url.pathname === "/ready" || url.pathname === "/readyz")
      ) {
        await repository.ping();
        sendJson(response, 200, requestId, { status: "ready" });
        return;
      }
      if (request.method === "POST" && url.pathname === "/v1/publications") {
        await ingest(request, response, requestId);
        return;
      }

      const revokeMatch =
        request.method === "POST" &&
        /^\/v1\/publications\/([^/]+)\/revoke$/.exec(url.pathname);
      if (revokeMatch) {
        await revoke(
          request,
          response,
          requestId,
          decodePathValue(revokeMatch[1]),
        );
        return;
      }

      const viewerMatch =
        (request.method === "GET" || request.method === "HEAD") &&
        /^\/d\/([^/]+)$/.exec(url.pathname);
      if (viewerMatch) {
        await view(
          request,
          response,
          requestId,
          decodePathValue(viewerMatch[1]),
        );
        return;
      }

      throw new AppError(404, "not_found", "Not found.");
    } catch (error) {
      const status =
        error instanceof AppError && Number.isInteger(error.status)
          ? error.status
          : 500;
      const code = error instanceof AppError ? error.code : "internal_error";
      if (status >= 500) {
        logger.error?.({
          event: "dashboard_request_failed",
          requestId,
          route: routeClass(
            new URL(request.url, "http://service.invalid").pathname,
          ),
          status,
          code,
          errorName: error?.name || "Error",
        });
      } else if (status >= 400 && status !== 404) {
        logger.warn?.({
          event: "dashboard_request_rejected",
          requestId,
          route: routeClass(
            new URL(request.url, "http://service.invalid").pathname,
          ),
          status,
          code,
        });
      }
      if (!response.headersSent) {
        sendJson(response, status, requestId, {
          error: {
            code,
            message:
              error instanceof AppError
                ? error.message
                : "Internal server error.",
          },
        });
      } else {
        response.end();
      }
    }
  };
}
