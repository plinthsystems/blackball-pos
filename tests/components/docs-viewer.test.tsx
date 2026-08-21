import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("marked", () => {
  const mockParse = vi.fn((content: string) => `<div class="docs-content">${content}</div>`);
  const mockUse = vi.fn();
  return {
    marked: {
      use: mockUse,
      parse: mockParse,
      Renderer: class Renderer {}
    },
    __mocks__: { mockParse, mockUse }
  };
});

import { DocsViewer } from "@/features/docs/docs-viewer";

const docs = [
  { slug: "README", title: "Introduction", content: "Welcome to the project." },
  { slug: "setup", title: "Setup Guide", content: "How to set up the project." },
  { slug: "api", title: "API Reference", content: "API endpoints documentation." }
];

describe("DocsViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the first doc as active by default", () => {
    render(<DocsViewer docs={docs} />);
    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.getByText("Welcome to the project.")).toBeInTheDocument();
  });

  it("shows all docs in the sidebar", () => {
    render(<DocsViewer docs={docs} />);
    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.getByText("Setup Guide")).toBeInTheDocument();
    expect(screen.getByText("API Reference")).toBeInTheDocument();
  });

  it("switches to a different doc when clicked", async () => {
    const user = userEvent.setup();
    render(<DocsViewer docs={docs} />);
    await user.click(screen.getByText("Setup Guide"));
    expect(screen.getByText("How to set up the project.")).toBeInTheDocument();
  });

  it("filters docs by search query matching title", async () => {
    const user = userEvent.setup();
    render(<DocsViewer docs={docs} />);
    await user.type(screen.getByPlaceholderText(/Search handbook/), "API");
    expect(screen.getByText("API Reference")).toBeInTheDocument();
    expect(screen.queryByText("Introduction")).not.toBeInTheDocument();
    expect(screen.queryByText("Setup Guide")).not.toBeInTheDocument();
  });

  it("filters docs by search query matching slug", async () => {
    const user = userEvent.setup();
    render(<DocsViewer docs={docs} />);
    await user.type(screen.getByPlaceholderText(/Search handbook/), "setup");
    expect(screen.getByText("Setup Guide")).toBeInTheDocument();
    expect(screen.queryByText("Introduction")).not.toBeInTheDocument();
  });

  it("shows no results when search matches nothing", async () => {
    const user = userEvent.setup();
    render(<DocsViewer docs={docs} />);
    await user.type(screen.getByPlaceholderText(/Search handbook/), "zzzznotfound");
    expect(screen.getByText("Modules (0)")).toBeInTheDocument();
  });

  it("shows Previous button when not on first doc", async () => {
    const user = userEvent.setup();
    render(<DocsViewer docs={docs} />);
    await user.click(screen.getByText("Setup Guide"));
    expect(screen.getByText(/← Previous: Introduction/)).toBeInTheDocument();
  });

  it("shows Next button when not on last doc", async () => {
    const user = userEvent.setup();
    render(<DocsViewer docs={docs} />);
    await user.click(screen.getByText("Introduction"));
    expect(screen.getByText(/Next: Setup Guide/)).toBeInTheDocument();
  });

  it("hides Previous button on first doc", () => {
    render(<DocsViewer docs={docs} />);
    expect(screen.queryByText(/← Previous:/)).not.toBeInTheDocument();
  });

  it("hides Next button on last doc", async () => {
    const user = userEvent.setup();
    render(<DocsViewer docs={docs} />);
    await user.click(screen.getByText("API Reference"));
    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument();
  });

  it("handles empty docs array gracefully", () => {
    render(<DocsViewer docs={[]} />);
    expect(screen.getByText("Developer Project Handbook")).toBeInTheDocument();
  });

  it("handles single doc without prev/next", () => {
    render(<DocsViewer docs={[docs[0]]} />);
    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.queryByText(/← Previous:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument();
  });

  it("renders module count matching filtered docs", () => {
    render(<DocsViewer docs={docs} />);
    expect(screen.getByText("Modules (3)")).toBeInTheDocument();
  });

  it("renders the back to app link", () => {
    render(<DocsViewer docs={docs} />);
    const link = screen.getByRole("link", { name: "➔ Back to App" });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("highlights active doc with distinct styling", async () => {
    const user = userEvent.setup();
    render(<DocsViewer docs={docs} />);
    const firstBtn = screen.getByText("Introduction").closest("button");
    expect(firstBtn).toHaveClass("bg-emerald-500/15");
    await user.click(screen.getByText("Setup Guide"));
    const setupBtn = screen.getByText("Setup Guide").closest("button");
    expect(setupBtn).toHaveClass("bg-emerald-500/15");
  });
});