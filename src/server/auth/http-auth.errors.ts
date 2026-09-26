export class HttpAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HttpAuthError";
  }
}

export class InvalidRequestOriginError extends HttpAuthError {
  constructor() {
    super("Invalid request origin");
    this.name = "InvalidRequestOriginError";
  }
}

export class UntrustedClientOriginError extends HttpAuthError {
  constructor() {
    super("Trusted client origin is unavailable");
    this.name = "UntrustedClientOriginError";
  }
}

export class InvalidLoginPayloadError extends HttpAuthError {
  constructor() {
    super("Invalid login payload");
    this.name = "InvalidLoginPayloadError";
  }
}
