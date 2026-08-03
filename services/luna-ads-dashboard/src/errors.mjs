export class AppError extends Error {
  constructor(status, code, message, options = {}) {
    super(message, options);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export class PublicIdCollisionError extends Error {
  constructor(options = {}) {
    super("Generated public id already exists.", options);
    this.name = "PublicIdCollisionError";
  }
}

export class ObjectIntegrityError extends Error {
  constructor(options = {}) {
    super("Stored object failed its integrity check.", options);
    this.name = "ObjectIntegrityError";
  }
}
