import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "../src/errors.mjs";
import { GoogleIdTokenVerifier } from "../src/google-id-token-verifier.mjs";

const ALLOWED = "luna@example.iam.gserviceaccount.com";

test("accepts only a Google-verified, email-verified, allowlisted service account", async () => {
  let verification;
  const client = {
    async verifyIdToken(options) {
      verification = options;
      return {
        getPayload: () => ({
          sub: "service-account-subject",
          email: ALLOWED,
          email_verified: true,
        }),
      };
    },
  };
  const verifier = new GoogleIdTokenVerifier({ client });

  const identity = await verifier.verify("signed-token", {
    audience: "https://publisher.example.run.app",
    allowedCallers: new Set([ALLOWED]),
  });

  assert.deepEqual(verification, {
    idToken: "signed-token",
    audience: "https://publisher.example.run.app",
  });
  assert.deepEqual(identity, {
    actor: ALLOWED,
    subject: "service-account-subject",
  });
});

test("rejects a valid token whose email is not allowlisted", async () => {
  const verifier = new GoogleIdTokenVerifier({
    client: {
      async verifyIdToken() {
        return {
          getPayload: () => ({
            sub: "other",
            email: "other@example.iam.gserviceaccount.com",
            email_verified: true,
          }),
        };
      },
    },
  });

  await assert.rejects(
    () =>
      verifier.verify("signed-token", {
        audience: "https://publisher.example.run.app",
        allowedCallers: new Set([ALLOWED]),
      }),
    (error) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.code === "caller_not_allowed",
  );
});

test("turns signature or audience verification failure into a generic 401", async () => {
  const verifier = new GoogleIdTokenVerifier({
    client: {
      async verifyIdToken() {
        throw new Error("signature details must not escape");
      },
    },
  });

  await assert.rejects(
    () =>
      verifier.verify("bad-token", {
        audience: "https://publisher.example.run.app",
        allowedCallers: new Set([ALLOWED]),
      }),
    (error) =>
      error instanceof AppError &&
      error.status === 401 &&
      error.code === "invalid_identity_token" &&
      !error.message.includes("signature"),
  );
});
