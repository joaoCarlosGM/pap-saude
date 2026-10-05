export class InvalidMeowsInputError
  extends Error {
  constructor(
    public readonly parameter: string,
  ) {
    super(
      `Invalid MEOWS input: ${parameter}.`,
    );

    this.name =
      "InvalidMeowsInputError";
  }
}

export class MeowsPolicyCoverageError
  extends Error {
  constructor(
    public readonly parameter: string,
    public readonly value: number,
  ) {
    super(
      `MEOWS policy does not cover ${parameter}=${value}.`,
    );

    this.name =
      "MeowsPolicyCoverageError";
  }
}
