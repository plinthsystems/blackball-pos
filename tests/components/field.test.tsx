import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, textInputProps } from "@/components/ui/field";

describe("Field", () => {
  it("renders the label and the wrapped children", () => {
    render(
      <Field label="Email">
        <input aria-label="Email" />
      </Field>
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
    // The wrapping <label> associates the label text with the nested input.
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders the error message when an error is provided", () => {
    render(
      <Field label="Email" error="Email is required">
        <input aria-label="Email" />
      </Field>
    );
    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });

  it("does not render an error message without the error prop", () => {
    render(
      <Field label="Email">
        <input aria-label="Email" />
      </Field>
    );
    expect(document.querySelector(".text-danger")).not.toBeInTheDocument();
  });

  it("textInputProps returns the shared input styling class", () => {
    const { container } = render(<input {...textInputProps()} aria-label="Styled input" />);
    const input = container.querySelector("input");
    expect(input).toHaveClass("h-10", "w-full", "rounded-material", "border-slate-600", "bg-slate-950");
  });
});
