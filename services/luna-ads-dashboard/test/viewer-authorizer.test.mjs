import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "../src/errors.mjs";
import {
  CapabilityViewerAuthorizer,
  IapViewerAuthorizer,
} from "../src/viewer-authorizer.mjs";

test("capability mode does not require an identity header", async () => {
  const authorizer = new CapabilityViewerAuthorizer();
  assert.deepEqual(await authorizer.authorize({ headers: {} }), {
    mode: "capability",
  });
});

test("IAP mode verifies the signed assertion, issuer, audience, and allowlist", async () => {
  let verification;
  const client = {
    async getIapPublicKeys() {
      return { pubkeys: { key1: "public-key" } };
    },
    async verifySignedJwtWithCertsAsync(...args) {
      verification = args;
      return {
        getPayload: () => ({
          sub: "iap-user-id",
          email: "OWNER@MOZTECH.CC",
        }),
      };
    },
  };
  const audience = "/projects/123/global/backendServices/456";
  const authorizer = new IapViewerAuthorizer({
    audience,
    allowedDomains: new Set(["moztech.cc"]),
    client,
  });

  const identity = await authorizer.authorize({
    headers: { "x-goog-iap-jwt-assertion": "signed-iap-jwt" },
  });

  assert.deepEqual(identity, {
    mode: "iap",
    actor: "owner@moztech.cc",
    subject: "iap-user-id",
  });
  assert.equal(verification[0], "signed-iap-jwt");
  assert.deepEqual(verification[1], { key1: "public-key" });
  assert.equal(verification[2], audience);
  assert.deepEqual(verification[3], ["https://cloud.google.com/iap"]);
});

test("IAP mode rejects missing, invalid, and non-allowlisted identities", async () => {
  const missing = new IapViewerAuthorizer({
    audience: "audience",
    client: {},
  });
  await assert.rejects(
    () => missing.authorize({ headers: {} }),
    (error) =>
      error instanceof AppError &&
      error.code === "iap_assertion_required" &&
      error.status === 401,
  );

  const invalid = new IapViewerAuthorizer({
    audience: "audience",
    client: {
      async getIapPublicKeys() {
        throw new Error("network or key error");
      },
    },
  });
  await assert.rejects(
    () =>
      invalid.authorize({
        headers: { "x-goog-iap-jwt-assertion": "invalid" },
      }),
    (error) =>
      error instanceof AppError &&
      error.code === "invalid_iap_assertion" &&
      error.status === 401,
  );

  const denied = new IapViewerAuthorizer({
    audience: "audience",
    allowedEmails: new Set(["allowed@example.com"]),
    client: {
      async getIapPublicKeys() {
        return { pubkeys: {} };
      },
      async verifySignedJwtWithCertsAsync() {
        return {
          getPayload: () => ({
            sub: "denied",
            email: "denied@example.com",
          }),
        };
      },
    },
  });
  await assert.rejects(
    () =>
      denied.authorize({
        headers: { "x-goog-iap-jwt-assertion": "valid" },
      }),
    (error) =>
      error instanceof AppError &&
      error.code === "iap_identity_not_allowed" &&
      error.status === 403,
  );
});
