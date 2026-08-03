import { AppError } from "./errors.mjs";

const OPAQUE_CONTEXT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const PLATFORM_NAMES = new Set(["meta", "google"]);
const MAX_JSON_HEADER_BYTES = 4096;
const MAX_COUNT = 1_000_000;

function metadataError(code, message) {
  return new AppError(400, code, message);
}

function requiredHeader(headers, name, maxBytes = 512) {
  const value = headers[name];
  if (typeof value !== "string" || !value.trim()) {
    throw metadataError(
      "publication_metadata_missing",
      "Required publication metadata is missing.",
    );
  }
  const normalized = value.trim();
  if (Buffer.byteLength(normalized, "utf8") > maxBytes) {
    throw metadataError(
      "publication_metadata_too_large",
      "Publication metadata is too large.",
    );
  }
  return normalized;
}

function contextId(headers, name, label) {
  const value = requiredHeader(headers, name, 180);
  if (!OPAQUE_CONTEXT_ID.test(value)) {
    throw metadataError("publication_metadata_invalid", `${label} is invalid.`);
  }
  return value;
}

function sourceDigest(headers) {
  const value = requiredHeader(
    headers,
    "x-luna-source-digest",
    64,
  ).toLowerCase();
  if (!SHA256.test(value)) {
    throw metadataError(
      "publication_metadata_invalid",
      "Source digest is invalid.",
    );
  }
  return value;
}

function reportDate(headers) {
  const value = requiredHeader(headers, "x-luna-report-date", 10);
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  ) {
    throw metadataError(
      "publication_metadata_invalid",
      "Report date is invalid.",
    );
  }
  return value;
}

function requestedPlatform(headers) {
  const value = requiredHeader(
    headers,
    "x-luna-requested-platform",
    10,
  ).toLowerCase();
  if (!["all", "meta", "google"].includes(value)) {
    throw metadataError(
      "publication_metadata_invalid",
      "Requested platform is invalid.",
    );
  }
  return value;
}

function jsonHeader(headers, name) {
  const raw = requiredHeader(headers, name, MAX_JSON_HEADER_BYTES);
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw metadataError(
      "publication_metadata_invalid",
      "Publication coverage JSON is invalid.",
    );
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw metadataError(
      "publication_metadata_invalid",
      "Publication coverage must be an object.",
    );
  }
  return value;
}

function onlyKeys(value, allowed, label) {
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw metadataError(
      "publication_metadata_invalid",
      `${label} contains unsupported fields.`,
    );
  }
}

function boundedCount(value, label, { min = 0, max = MAX_COUNT } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw metadataError("publication_metadata_invalid", `${label} is invalid.`);
  }
  return value;
}

function expectedPlatforms(requested) {
  return requested === "all" ? ["meta", "google"] : [requested];
}

function normalizePlatformSource(source, expectedName) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw metadataError(
      "publication_metadata_invalid",
      "Platform coverage source is invalid.",
    );
  }
  onlyKeys(
    source,
    new Set([
      "name",
      "status",
      "rowCount",
      "comparisonCount",
      "uniqueCampaignCount",
      "selectedCampaignCount",
      "truncatedCampaignCount",
      "accountCount",
      "mappedAccountCount",
      "unmappedAccountCount",
      "mappingCoverageScope",
    ]),
    "Platform coverage source",
  );
  if (
    source.name !== expectedName ||
    !PLATFORM_NAMES.has(source.name) ||
    source.status !== "ready"
  ) {
    throw metadataError(
      "publication_metadata_invalid",
      "Platform coverage source is incomplete.",
    );
  }
  const rowCount = boundedCount(source.rowCount, "Platform row count", {
    min: 1,
  });
  const comparisonCount = boundedCount(
    source.comparisonCount,
    "Platform comparison count",
    { max: rowCount },
  );
  const normalized = {
    name: expectedName,
    status: "ready",
    rowCount,
    comparisonCount,
  };

  const selection = [
    source.uniqueCampaignCount,
    source.selectedCampaignCount,
    source.truncatedCampaignCount,
  ];
  if (selection.some((value) => value !== undefined)) {
    if (
      selection.some((value) => !Number.isSafeInteger(value)) ||
      source.uniqueCampaignCount < 1 ||
      source.uniqueCampaignCount > rowCount ||
      source.selectedCampaignCount < 1 ||
      source.selectedCampaignCount > source.uniqueCampaignCount ||
      source.truncatedCampaignCount !==
        source.uniqueCampaignCount - source.selectedCampaignCount
    ) {
      throw metadataError(
        "publication_metadata_invalid",
        "Platform campaign selection coverage is invalid.",
      );
    }
    normalized.uniqueCampaignCount = source.uniqueCampaignCount;
    normalized.selectedCampaignCount = source.selectedCampaignCount;
    normalized.truncatedCampaignCount = source.truncatedCampaignCount;
  }

  const mapping = [
    source.accountCount,
    source.mappedAccountCount,
    source.unmappedAccountCount,
    source.mappingCoverageScope,
  ];
  if (mapping.some((value) => value !== undefined)) {
    if (
      !mapping.slice(0, 3).every(Number.isSafeInteger) ||
      source.accountCount < 1 ||
      source.accountCount > rowCount ||
      source.mappedAccountCount < 0 ||
      source.unmappedAccountCount < 0 ||
      source.mappedAccountCount + source.unmappedAccountCount !==
        source.accountCount ||
      !["source_snapshot", "dashboard_comparisons"].includes(
        source.mappingCoverageScope,
      )
    ) {
      throw metadataError(
        "publication_metadata_invalid",
        "Platform account mapping coverage is invalid.",
      );
    }
    normalized.accountCount = source.accountCount;
    normalized.mappedAccountCount = source.mappedAccountCount;
    normalized.unmappedAccountCount = source.unmappedAccountCount;
    normalized.mappingCoverageScope = source.mappingCoverageScope;
  }
  return normalized;
}

function normalizePlatformCoverage(value, requested) {
  onlyKeys(
    value,
    new Set(["requestedPlatform", "status", "sources"]),
    "Platform coverage",
  );
  const expected = expectedPlatforms(requested);
  if (
    value.requestedPlatform !== requested ||
    value.status !== "ready" ||
    !Array.isArray(value.sources) ||
    value.sources.length !== expected.length
  ) {
    throw metadataError(
      "publication_metadata_invalid",
      "Platform coverage is incomplete.",
    );
  }
  const sources = expected.map((name) =>
    normalizePlatformSource(
      value.sources.find((source) => source?.name === name),
      name,
    ),
  );
  return {
    requestedPlatform: requested,
    status: "ready",
    sources,
  };
}

function normalizeBrandSource(source, expectedName, platformSource) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw metadataError(
      "publication_metadata_invalid",
      "Brand mapping coverage source is invalid.",
    );
  }
  onlyKeys(
    source,
    new Set([
      "name",
      "label",
      "accountCount",
      "mappedAccountCount",
      "unmappedAccountCount",
      "scope",
      "visibleAccountCount",
    ]),
    "Brand mapping coverage source",
  );
  const expectedLabel = expectedName === "meta" ? "Meta" : "Google Ads";
  const accountCount = boundedCount(
    source.accountCount,
    "Brand mapping account count",
    { min: 1 },
  );
  const mappedAccountCount = boundedCount(
    source.mappedAccountCount,
    "Brand mapping mapped count",
    { max: accountCount },
  );
  const unmappedAccountCount = boundedCount(
    source.unmappedAccountCount,
    "Brand mapping unmapped count",
    { max: accountCount },
  );
  const visibleAccountCount = boundedCount(
    source.visibleAccountCount,
    "Brand mapping visible account count",
    { min: 1, max: accountCount },
  );
  if (
    source.name !== expectedName ||
    source.label !== expectedLabel ||
    mappedAccountCount + unmappedAccountCount !== accountCount ||
    !["source_snapshot", "dashboard_comparisons"].includes(source.scope)
  ) {
    throw metadataError(
      "publication_metadata_invalid",
      "Brand mapping coverage source is incomplete.",
    );
  }
  if (
    platformSource.accountCount !== undefined &&
    (platformSource.accountCount !== accountCount ||
      platformSource.mappedAccountCount !== mappedAccountCount ||
      platformSource.unmappedAccountCount !== unmappedAccountCount ||
      platformSource.mappingCoverageScope !== source.scope)
  ) {
    throw metadataError(
      "publication_metadata_invalid",
      "Brand mapping coverage conflicts with platform coverage.",
    );
  }
  return {
    name: expectedName,
    label: expectedLabel,
    accountCount,
    mappedAccountCount,
    unmappedAccountCount,
    scope: source.scope,
    visibleAccountCount,
  };
}

function normalizeBrandMappingCoverage(value, platformCoverage) {
  onlyKeys(
    value,
    new Set([
      "status",
      "accountCount",
      "mappedAccountCount",
      "unmappedAccountCount",
      "sources",
    ]),
    "Brand mapping coverage",
  );
  const expected = platformCoverage.sources;
  if (
    !Array.isArray(value.sources) ||
    value.sources.length !== expected.length
  ) {
    throw metadataError(
      "publication_metadata_invalid",
      "Brand mapping coverage is incomplete.",
    );
  }
  const sources = expected.map((platformSource) =>
    normalizeBrandSource(
      value.sources.find((source) => source?.name === platformSource.name),
      platformSource.name,
      platformSource,
    ),
  );
  const accountCount = sources.reduce(
    (total, source) => total + source.accountCount,
    0,
  );
  const mappedAccountCount = sources.reduce(
    (total, source) => total + source.mappedAccountCount,
    0,
  );
  const unmappedAccountCount = sources.reduce(
    (total, source) => total + source.unmappedAccountCount,
    0,
  );
  const status = unmappedAccountCount === 0 ? "complete" : "needs_mapping";
  if (
    value.status !== status ||
    value.accountCount !== accountCount ||
    value.mappedAccountCount !== mappedAccountCount ||
    value.unmappedAccountCount !== unmappedAccountCount
  ) {
    throw metadataError(
      "publication_metadata_invalid",
      "Brand mapping coverage totals are invalid.",
    );
  }
  return {
    status,
    accountCount,
    mappedAccountCount,
    unmappedAccountCount,
    sources,
  };
}

export function parsePublicationMetadata(headers) {
  const requested = requestedPlatform(headers);
  const platformCoverage = normalizePlatformCoverage(
    jsonHeader(headers, "x-luna-platform-coverage"),
    requested,
  );
  const brandMappingCoverage = normalizeBrandMappingCoverage(
    jsonHeader(headers, "x-luna-brand-mapping-coverage"),
    platformCoverage,
  );
  return Object.freeze({
    entityId: contextId(headers, "x-luna-entity-id", "Entity id"),
    sourceDigest: sourceDigest(headers),
    reportDate: reportDate(headers),
    taskId: contextId(headers, "x-luna-task-id", "Task id"),
    requestedPlatform: requested,
    platformCoverage,
    brandMappingCoverage,
  });
}
