import { render, screen, cleanup } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

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

// The DocsViewer component calls setTimeout in useEffect to load mermaid from CDN.
// After test completion, jsdom tears down and the setTimeout callback fires,
// accessing an undefined `window` → unhandled error.
// Workaround: intercept setTimeout/setInterval to track timer IDs, then clear
// them all in afterEach before jsdom teardown.
const trackedTimers: (ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>)[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const realSetTimeout: (...args: any[]) => ReturnType<typeof setTimeout> = globalThis.setTimeout;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const realSetInterval: (...args: any[]) => ReturnType<typeof setInterval> = globalThis.setInterval;

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.setTimeout = ((...args: any[]) => {
    const id = realSetTimeout(...args);
    trackedTimers.push(id);
    return id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.setInterval = ((...args: any[]) => {
    const id = realSetInterval(...args);
    trackedTimers.push(id);
    return id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
});

afterEach(() => {
  // Clear all tracked timers before jsdom teardown
  // Note: setTimeout and setInterval in jsdom both return numbers
  trackedTimers.forEach((id) => {
    if (typeof id === "number") {
      clearTimeout(id);
    } else {
      clearInterval(id);
    }
  });
  trackedTimers.length = 0;
  globalThis.setTimeout = realSetTimeout as typeof globalThis.setTimeout;
  globalThis.setInterval = realSetInterval as typeof globalThis.setInterval;
  cleanup();
});

import { DocsViewer } from "@/features/docs/docs-viewer";

const docs = [
  { slug: "README", title: "Introduction", content: "Welcome to the project." },
  { slug: "setup", title: "Setup Guide", content: "How to set up the project." },
  { slug: "api", title: "API Reference", content: "API endpoints documentation." }
];

describe("DocsViewer", () => {
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