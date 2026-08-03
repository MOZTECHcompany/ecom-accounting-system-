import { OAuth2Client } from "google-auth-library";
import { AppError } from "./errors.mjs";

export class GoogleIdTokenVerifier {
  constructor({ client = new OAuth2Client() } = {}) {
    this.client = client;
  }

  async verify(token, { audience, allowedCallers }) {
    let ticket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken: token,
        audience,
      });
    } catch (error) {
      throw new AppError(
        401,
        "invalid_identity_token",
        "Authentication failed.",
        {
          cause: error,
        },
      );
    }

    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    if (
      !payload ||
      payload.email_verified !== true ||
      !email ||
      !allowedCallers.has(email)
    ) {
      throw new AppError(403, "caller_not_allowed", "Caller is not allowed.");
    }

    return Object.freeze({
      actor: email,
      subject: payload.sub,
    });
  }
}
