import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
// A browser failure can include invitation URLs or field contents in the default
// call log. Report status and static test titles only; do not serialize errors,
// request bodies, DOM snapshots, console payloads or attachments.
export default class SafeReporter implements Reporter {
  onError() {
    console.error(
      "Browser runner setup failed; verify the dedicated port and browser installation.",
    );
  }
  onTestEnd(test: TestCase, result: TestResult) {
    console.log(`${result.status.toUpperCase()}: ${test.title}`);
    for (const error of result.errors) {
      console.log(
        (error.message || "Browser assertion failed")
          .split("\n")[0]
          .replace(/https?:\/\/\S+/g, "[URL]"),
      );
      console.log(
        error.stack?.match(/[\w-]+\.spec\.ts:\d+:\d+/g)?.join(", ") || "",
      );
    }
  }
}
