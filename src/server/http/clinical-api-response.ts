import { NextResponse } from "next/server";

function getErrorCode(error: Error): string | null {
  const code = (
    error as Error & {
      code?: unknown;
    }
  ).code;

  return typeof code === "string" ? code : null;
}

function isHiddenAccessError(error: Error): boolean {
  return (
    error.name === "HttpAccessDeniedError" ||
    error.name === "ClinicalResourceNotFoundError" ||
    getErrorCode(error) === "ACCESS_DENIED"
  );
}

function statusForError(error: Error): number {
  const name = error.name;

  if (name === "HttpAuthenticationRequiredError") {
    return 401;
  }

  if (isHiddenAccessError(error)) {
    return 403;
  }

  if (name === "InvalidRequestOriginError") {
    return 403;
  }

  if (name.includes("NotFound") || error.message === "Encounter not found.") {
    return 404;
  }

  if (name.includes("Conflict") || name.includes("Already")) {
    return 409;
  }

  if (
    name.includes("Invalid") ||
    name.includes("Validation") ||
    name.includes("Inactive") ||
    name.includes("Finalized") ||
    name.includes("Required") ||
    name.includes("Transition")
  ) {
    return 400;
  }

  return 500;
}

export function clinicalJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,

    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export function clinicalErrorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    return clinicalJson(
      {
        error: "INTERNAL_ERROR",
      },
      500,
    );
  }

  if (isHiddenAccessError(error)) {
    return clinicalJson(
      {
        error: "ACCESS_DENIED",

        message: "Access to this resource is denied.",
      },
      403,
    );
  }

  if (error.name === "InvalidRequestOriginError") {
    return clinicalJson(
      {
        error: "INVALID_REQUEST_ORIGIN",
      },
      403,
    );
  }

  const status = statusForError(error);

  if (status === 500) {
    console.error("clinical-api", error);

    return clinicalJson(
      {
        error: "INTERNAL_ERROR",
      },
      500,
    );
  }

  return clinicalJson(
    {
      error: error.name,

      message: error.message,
    },
    status,
  );
}
