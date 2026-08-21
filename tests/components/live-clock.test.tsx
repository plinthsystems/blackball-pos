import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveClock, formatElapsed, formatDigitalElapsed } from "@/features/live-tables/components/live-clock";

describe("LiveClock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders inline variant by default", () => {
    render(<LiveClock initialSeconds={0} />);
    expect(screen.getByText("Elapsed 0m 00s")).toBeInTheDocument();
  });

  it("renders inline variant with given seconds", () => {
    render(<LiveClock initialSeconds={125} />);
    expect(screen.getByText("Elapsed 2m 05s")).toBeInTheDocument();
  });

  it("renders digital variant", () => {
    render(<LiveClock initialSeconds={0} variant="digital" />);
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText("Elapsed")).toBeInTheDocument();
  });

  it("renders digital variant with hours", () => {
    render(<LiveClock initialSeconds={3661} variant="digital" />);
    expect(screen.getByText("01:01:01")).toBeInTheDocument();
  });

  it("renders digital variant with minutes and seconds only", () => {
    render(<LiveClock initialSeconds={125} variant="digital" />);
    expect(screen.getByText("02:05")).toBeInTheDocument();
  });

  it("handles large initial seconds", () => {
    render(<LiveClock initialSeconds={99999} />);
    expect(screen.getByText("Elapsed 1666m 39s")).toBeInTheDocument();
  });

  it("handles zero initial seconds", () => {
    render(<LiveClock initialSeconds={0} />);
    expect(screen.getByText("Elapsed 0m 00s")).toBeInTheDocument();
  });
});

describe("formatElapsed", () => {
  it("formats zero seconds", () => {
    expect(formatElapsed(0)).toBe("0m 00s");
  });

  it("formats seconds less than a minute", () => {
    expect(formatElapsed(45)).toBe("0m 45s");
  });

  it("formats exactly one minute", () => {
    expect(formatElapsed(60)).toBe("1m 00s");
  });

  it("formats minutes and seconds", () => {
    expect(formatElapsed(125)).toBe("2m 05s");
  });

  it("pads seconds with leading zero", () => {
    expect(formatElapsed(65)).toBe("1m 05s");
  });

  it("handles negative seconds (not clamped)", () => {
    expect(formatElapsed(-10)).toBe("-1m 00s");
  });

  it("formats large values", () => {
    expect(formatElapsed(3661)).toBe("61m 01s");
  });

  it("formats exactly one hour in minutes", () => {
    expect(formatElapsed(3600)).toBe("60m 00s");
  });
});

describe("formatDigitalElapsed", () => {
  it("formats zero seconds", () => {
    expect(formatDigitalElapsed(0)).toBe("00:00");
  });

  it("formats seconds less than a minute", () => {
    expect(formatDigitalElapsed(30)).toBe("00:30");
  });

  it("formats minutes and seconds", () => {
    expect(formatDigitalElapsed(125)).toBe("02:05");
  });

  it("formats with hours", () => {
    expect(formatDigitalElapsed(3661)).toBe("01:01:01");
  });

  it("formats with hours and zero minutes", () => {
    expect(formatDigitalElapsed(3600)).toBe("01:00:00");
  });

  it("formats with hours and zero seconds", () => {
    expect(formatDigitalElapsed(3660)).toBe("01:01:00");
  });

  it("pads all components with leading zeros", () => {
    expect(formatDigitalElapsed(61)).toBe("01:01");
  });

  it("handles negative seconds by clamping to zero", () => {
    expect(formatDigitalElapsed(-10)).toBe("00:00");
  });

  it("handles large values", () => {
    expect(formatDigitalElapsed(90061)).toBe("25:01:01");
  });
});