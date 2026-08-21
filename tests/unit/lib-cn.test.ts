import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn (classname merge)", () => {
  it("merges conflicting tailwind classes, last wins", () => {
    expect(cn("p-1", "p-4")).toBe("p-4");
    expect(cn("px-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-600")).toBe("text-blue-600");
  });

  it("keeps non-conflicting classes", () => {
    expect(cn("bg-black", "text-white", "rounded-md")).toBe("bg-black text-white rounded-md");
  });

  it("drops falsy values", () => {
    expect(cn("base", false, null, undefined, 0, "")).toBe("base");
  });

  it("handles conditional expressions that are falsy", () => {
    expect(cn("a", 1 > 2 && "b", "c")).toBe("a c");
  });

  it("flattens arrays and objects", () => {
    expect(cn(["p-1"], { "p-2": true, "p-3": false }, "p-4")).toBe("p-4");
  });

  it("returns empty string when no inputs", () => {
    expect(cn()).toBe("");
    expect(cn(false, null)).toBe("");
  });

  it("handles object with conditional keys", () => {
    const active = true;
    expect(cn("btn", { "btn-active": active, "btn-disabled": !active })).toBe("btn btn-active");
  });
});
