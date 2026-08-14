import { describe, expect, it } from "vitest";

describe("project scaffold", () => {
  it("runs the test runner", () => {
    expect("live-table-core").toContain("table");
  });
});
