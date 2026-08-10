import { AppError } from "./errors.mjs";

const SERVICE_ACCOUNT_EMAIL =
  /^[a-z0-9][a-z0-9._-]*@[a-z0-9-]+\.iam\.gserviceaccount\.com$/;

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function integer(env, name, fallback, { min, max }) {
  const raw = env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function boolean(env, name, fallback) {
  const raw = env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be true or false.`);
}

function publicOrigin(env) {
  const raw = required(env, "PUBLIC_ORIGIN");
  const url = new URL(raw);
  if (url.protocol !== "https:") {
    throw new Error("PUBLIC_ORIGIN must use https.");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname && url.pathname !== "/")
  ) {
    throw new Error(
      "PUBLIC_ORIGIN must be an origin without credentials or a path.",
    );
  }
  return url.origin;
}

function allowedCallers(env) {
  const callers = required(env, "INGEST_ALLOWED_CALLERS")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(callers)];
  if (
    unique.length === 0 ||
    unique.some((email) => !SERVICE_ACCOUNT_EMAIL.test(email))
  ) {
    throw new Error(
      "INGEST_ALLOWED_CALLERS must contain exact service account email addresses.",
    );
  }
  return new Set(unique);
}

function optionalCsv(env, name, normalize = (value) => value) {
  return new Set(
    (env[name] || "")
      .split(",")
      .map((value) => normalize(value.trim()))
      .filter(Boolean),
  );
}

function viewerAccess(env) {
  const mode = (env.VIEWER_ACCESS_MODE || "capability").trim().toLowerCase();
  if (mode !== "capability" && mode !== "iap") {
    throw new Error("VIEWER_ACCESS_MODE must be capability or iap.");
  }
  const iapAudience = env.IAP_AUDIENCE?.trim() || null;
  if (mode === "iap" && !iapAudience) {
    throw new Error("IAP_AUDIENCE is required when VIEWER_ACCESS_MODE=iap.");
  }
  return {
    mode,
    iapAudience,
    iapAllowedEmails: optionalCsv(env, "IAP_ALLOWED_EMAILS", (value) =>
      value.toLowerCase(),
    ),
    iapAllowedDomains: optionalCsv(env, "IAP_ALLOWED_DOMAINS", (value) =>
      value.toLowerCase().replace(/^@/, ""),
    ),
  };
}

export function loadConfig(env = process.env) {
  const defaultTtlSeconds = integer(
    env,
    "DEFAULT_TTL_SECONDS",
    30 * 24 * 60 * 60,
    { min: 300, max: 90 * 24 * 60 * 60 },
  );
  const maxTtlSeconds = integer(env, "MAX_TTL_SECONDS", 90 * 24 * 60 * 60, {
    min: defaultTtlSeconds,
    max: 365 * 24 * 60 * 60,
  });

  const viewer = viewerAccess(env);
  return Object.freeze({
    port: integer(env, "PORT", 8080, { min: 1, max: 65535 }),
    publicOrigin: publicOrigin(env),
    ingestAudience: required(env, "INGEST_AUDIENCE"),
    allowedIngestCallers: allowedCallers(env),
    bucketName: required(env, "DASHBOARD_BUCKET"),
    objectPrefix: (env.DASHBOARD_OBJECT_PREFIX || "luna-ads-dashboards")
      .trim()
      .replace(/^\/+|\/+$/g, ""),
    databaseUrl: required(env, "DATABASE_URL"),
    defaultTtlSeconds,
    maxTtlSeconds,
    maxArtifactBytes: integer(env, "MAX_ARTIFACT_BYTES", 5 * 1024 * 1024, {
      min: 1024,
      max: 20 * 1024 * 1024,
    }),
    enforcePublicHost: boolean(env, "ENFORCE_PUBLIC_HOST", true),
    viewerAccessMode: viewer.mode,
    iapAudience: viewer.iapAudience,
    iapAllowedEmails: viewer.iapAllowedEmails,
    iapAllowedDomains: viewer.iapAllowedDomains,
  });
}

export function assertRuntimeConfig(config) {
  if (!config.objectPrefix) {
    throw new AppError(
      500,
      "invalid_runtime_config",
      "Runtime configuration is invalid.",
    );
  }
}
