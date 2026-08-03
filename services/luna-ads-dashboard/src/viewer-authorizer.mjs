import { OAuth2Client } from "google-auth-library";
import { AppError } from "./errors.mjs";

const IAP_ISSUERS = ["https://cloud.google.com/iap"];

export class CapabilityViewerAuthorizer {
  async authorize() {
    return Object.freeze({ mode: "capability" });
  }
}

export class IapViewerAuthorizer {
  constructor({
    audience,
    allowedEmails = new Set(),
    allowedDomains = new Set(),
    client = new OAuth2Client(),
  }) {
    this.audience = audience;
    this.allowedEmails = allowedEmails;
    this.allowedDomains = allowedDomains;
    this.client = client;
  }

  async authorize(request) {
    const assertion = request.headers["x-goog-iap-jwt-assertion"];
    if (typeof assertion !== "string" || !assertion) {
      throw new AppError(
        401,
        "iap_assertion_required",
        "Authentication is required.",
      );
    }

    let ticket;
    try {
      const keys = await this.client.getIapPublicKeys();
      ticket = await this.client.verifySignedJwtWithCertsAsync(
        assertion,
        keys.pubkeys,
        this.audience,
        IAP_ISSUERS,
      );
    } catch (error) {
      throw new AppError(
        401,
        "invalid_iap_assertion",
        "Authentication failed.",
        {
          cause: error,
        },
      );
    }

    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    if (!email) {
      throw new AppError(
        403,
        "iap_identity_not_allowed",
        "Caller is not allowed.",
      );
    }
    const domain = email.includes("@") ? email.split("@").at(-1) : "";
    const hasAppAllowlist =
      this.allowedEmails.size > 0 || this.allowedDomains.size > 0;
    if (
      hasAppAllowlist &&
      !this.allowedEmails.has(email) &&
      !this.allowedDomains.has(domain)
    ) {
      throw new AppError(
        403,
        "iap_identity_not_allowed",
        "Caller is not allowed.",
      );
    }

    return Object.freeze({
      mode: "iap",
      actor: email,
      subject: payload.sub,
    });
  }
}

export function createViewerAuthorizer(config) {
  if (config.viewerAccessMode === "iap") {
    return new IapViewerAuthorizer({
      audience: config.iapAudience,
      allowedEmails: config.iapAllowedEmails,
      allowedDomains: config.iapAllowedDomains,
    });
  }
  return new CapabilityViewerAuthorizer();
}
