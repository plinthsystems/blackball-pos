import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TemporaryCredential } from "@/features/platform/components/temporary-credential";

describe("TemporaryCredential", () => {
  let originalDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, "clipboard");
  });

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(Navigator.prototype, "clipboard", originalDescriptor);
    }
  });

  it("renders label and value", () => {
    render(<TemporaryCredential label="API Key" value="sk-test-12345" />);
    expect(screen.getByText("API Key")).toBeInTheDocument();
    expect(screen.getByText("sk-test-12345")).toBeInTheDocument();
  });

  it("shows Copy button by default", () => {
    render(<TemporaryCredential label="Password" value="secret123" />);
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
  });

  it("renders empty label", () => {
    render(<TemporaryCredential label="" value="some-value" />);
    expect(screen.getByText("some-value")).toBeInTheDocument();
  });

  it("renders very long value with word break", () => {
    const longValue = "a".repeat(500);
    render(<TemporaryCredential label="Long Value" value={longValue} />);
    expect(screen.getByText(longValue)).toBeInTheDocument();
  });

  it("renders very long label with title tooltip", () => {
    const longLabel = "This is a very long label that should be truncated in the UI but shown in the title attribute".repeat(3);
    render(<TemporaryCredential label={longLabel} value="value" />);
    const labelEl = screen.getByText(longLabel);
    expect(labelEl).toHaveAttribute("title", longLabel);
  });
});