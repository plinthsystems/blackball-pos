import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { DocsViewer } from "@/features/docs/docs-viewer";

export const dynamic = "force-dynamic";

export default async function IndependentDocsPage() {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && process.env.DOCS_ENABLED !== "true") {
    notFound();
  }

  const docsDir = path.join(process.cwd(), "docs", "handbook");

  let docs: Array<{ slug: string; title: string; content: string }> = [];

  if (fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir).filter((file) => file.endsWith(".md"));

    // Keep README first, then 01, 02, 03... 09
    files.sort((a, b) => {
      if (a === "README.md") return -1;
      if (b === "README.md") return 1;
      return a.localeCompare(b);
    });

    docs = files.map((file) => {
      const filePath = path.join(docsDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const slug = file.replace(".md", "");

      // Extract title from first H1 line or fallback to filename
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : slug;

      return { slug, title, content };
    });
  }

  return <DocsViewer docs={docs} />;
}
