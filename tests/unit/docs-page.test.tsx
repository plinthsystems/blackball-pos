import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IndependentDocsPage from "@/app/docs/page";
import { withEnv } from "./support/request-helpers";

/**
 * /docs server page — locks existing behavior: DOCS_ENABLED gating in
 * production, handbook markdown discovery (README first, .md only, H1 title
 * extraction with slug fallback), empty-dir safety. fs + DocsViewer mocked —
 * no real file I/O.
 */

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn()
}));

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  })
);

vi.mock("fs", () => ({
  default: {
    existsSync: fsMock.existsSync,
    readdirSync: fsMock.readdirSync,
    readFileSync: fsMock.readFileSync
  },
  existsSync: fsMock.existsSync,
  readdirSync: fsMock.readdirSync,
  readFileSync: fsMock.readFileSync
}));

vi.mock("next/navigation", () => ({ notFound }));

vi.mock("@/features/docs/docs-viewer", () => ({
  DocsViewer: ({ docs }: { docs: Array<{ slug: string; title: string }> }) => (
    <ul>
      {docs.map((doc) => (
        <li key={doc.slug}>{doc.title}</li>
      ))}
    </ul>
  )
}));

const README_CONTENT = "# Handbook\nWelcome to the pool club handbook.";
const SETUP_CONTENT = "No leading heading in this file.";

beforeEach(() => {
  fsMock.existsSync.mockReset();
  fsMock.readdirSync.mockReset();
  fsMock.readFileSync.mockReset();
  notFound.mockClear();
});

describe("GET /docs (IndependentDocsPage)", () => {
  it("calls notFound() in production when DOCS_ENABLED is not 'true'", async () => {
    fsMock.existsSync.mockReturnValue(false);

    await withEnv({ NODE_ENV: "production" }, async () => {
      await expect(IndependentDocsPage()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
      expect(notFound).toHaveBeenCalledTimes(1);
    });
  });

  it("renders the handbook in production when DOCS_ENABLED is 'true'", async () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readdirSync.mockReturnValue(["README.md"]);
    fsMock.readFileSync.mockReturnValue(README_CONTENT);

    await withEnv({ NODE_ENV: "production", DOCS_ENABLED: "true" }, async () => {
      render(await IndependentDocsPage());
      expect(screen.getByText("Handbook")).toBeInTheDocument();
      expect(notFound).not.toHaveBeenCalled();
    });
  });

  it("renders docs in non-production without DOCS_ENABLED", async () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readdirSync.mockReturnValue(["README.md"]);
    fsMock.readFileSync.mockReturnValue(README_CONTENT);

    render(await IndependentDocsPage());
    expect(screen.getByText("Handbook")).toBeInTheDocument();
  });

  it("sorts README first, keeps .md only, extracts H1 title with slug fallback", async () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readdirSync.mockReturnValue(["03-settings.md", "README.md", "01-setup.md", "notes.txt"]);
    fsMock.readFileSync.mockImplementation((filePath: string) =>
      filePath.endsWith("README.md") ? README_CONTENT : SETUP_CONTENT
    );

    render(await IndependentDocsPage());

    const titles = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(titles).toEqual(["Handbook", "01-setup", "03-settings"]);
    // notes.txt is not a markdown file — never read.
    expect(fsMock.readFileSync).not.toHaveBeenCalledWith(
      expect.stringContaining("notes.txt") as unknown as string,
      expect.anything()
    );
  });

  it("renders an empty list without crashing when the handbook directory is missing", async () => {
    fsMock.existsSync.mockReturnValue(false);

    render(await IndependentDocsPage());
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(fsMock.readdirSync).not.toHaveBeenCalled();
  });
});
