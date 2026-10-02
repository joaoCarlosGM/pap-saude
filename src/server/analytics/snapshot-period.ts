export function utcDayPeriod(
  date: Date,
) {
  const periodStart =
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
      ),
    )

  const periodEnd =
    new Date(
      periodStart.getTime() +
        24 * 60 * 60 * 1000,
    )

  return {
    periodStart,
    periodEnd,
  }
}
