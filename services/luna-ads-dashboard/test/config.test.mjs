import assert from "node:assert/strict";
import { test } from "node:test";
import { loadConfig } from "../src/config.mjs";

function env(overrides = {}) {
  return {
    PUBLIC_ORIGIN: "https://ads.corely.cc",
    INGEST_AUDIENCE: "https://publisher.example.run.app",
    INGEST_ALLOWED_CALLERS: "luna-openclaw@example.iam.gserviceaccount.com",
    DASHBOARD_BUCKET: "private-dashboard-bucket",
    DATABASE_URL: "postgresql://example.invalid/db",
    ...overrides,
  };
}

test("loads a production-safe configuration", () => {
  const config = loadConfig(env());
  assert.equal(config.publicOrigin, "https://ads.corely.cc");
  assert.equal(config.enforcePublicHost, true);
  assert.equal(config.viewerAccessMode, "capability");
  assert.equal(config.defaultTtlSeconds, 30 * 24 * 60 * 60);
  assert.equal(config.maxTtlSeconds, 90 * 24 * 60 * 60);
  assert(
    config.allowedIngestCallers.has(
      "luna-openclaw@example.iam.gserviceaccount.com",
    ),
  );
});

test("requires an exact IAP audience when IAP viewer mode is selected", () => {
  assert.throws(
    () => loadConfig(env({ VIEWER_ACCESS_MODE: "iap" })),
    /IAP_AUDIENCE/,
  );
  const config = loadConfig(
    env({
      VIEWER_ACCESS_MODE: "iap",
      IAP_AUDIENCE: "/projects/123456/global/backendServices/987654",
      IAP_ALLOWED_DOMAINS: "@moztech.cc",
    }),
  );
  assert.equal(config.viewerAccessMode, "iap");
  assert(config.iapAllowedDomains.has("moztech.cc"));
});

test("rejects a non-HTTPS public origin and an origin with a path", () => {
  assert.throws(
    () => loadConfig(env({ PUBLIC_ORIGIN: "http://ads.corely.cc" })),
    /must use https/,
  );
  assert.throws(
    () => loadConfig(env({ PUBLIC_ORIGIN: "https://ads.corely.cc/reports" })),
    /without credentials or a path/,
  );
});

test("rejects user emails and wildcard-like ingest callers", () => {
  assert.throws(
    () =>
      loadConfig(
        env({
          INGEST_ALLOWED_CALLERS: "operator@example.com",
        }),
      ),
    /service account email/,
  );
  assert.throws(
    () =>
      loadConfig(
        env({
          INGEST_ALLOWED_CALLERS: "*.iam.gserviceaccount.com",
        }),
      ),
    /service account email/,
  );
});

test("does not allow a default TTL longer than the maximum TTL", () => {
  assert.throws(
    () =>
      loadConfig(
        env({
          DEFAULT_TTL_SECONDS: "7200",
          MAX_TTL_SECONDS: "3600",
        }),
      ),
    /MAX_TTL_SECONDS/,
  );
});
