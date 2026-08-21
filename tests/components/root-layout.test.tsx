import { describe, expect, it } from "vitest";
import { metadata } from "@/app/layout";

describe("Root layout metadata", () => {
  it("sets the correct page title", () => {
    expect(metadata.title).toBe("Cue Club Admin");
  });

  it("sets a descriptive page description", () => {
    expect(metadata.description).toBe("Pool and snooker club operations");
  });
});