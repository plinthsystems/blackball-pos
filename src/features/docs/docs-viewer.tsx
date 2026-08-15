"use client";

import { useEffect, useRef, useState } from "react";
import { marked } from "marked";

type DocFile = {
  slug: string;
  title: string;
  content: string;
};

// Custom Marked renderer for clean HTML structure & Mermaid wrappers
const renderer = new marked.Renderer();
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  if (lang === "mermaid") {
    return `<div class="mermaid-container relative my-8 w-full overflow-hidden rounded-2xl border border-emerald-500/40 bg-[#161b22] shadow-xl flex flex-col">
      <div class="mermaid-toolbar flex items-center justify-between border-b border-[#30363d] bg-[#0d1117] px-5 py-2.5 text-xs text-slate-300 z-10 flex-shrink-0">
        <span class="font-semibold text-emerald-400 flex items-center gap-1.5">📊 Diagram View (Best Fit)</span>
        <div class="flex items-center gap-2">
          <button type="button" class="zoom-in-btn rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition">🔍 + Zoom In</button>
          <button type="button" class="zoom-out-btn rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition">🔍 - Zoom Out</button>
          <button type="button" class="reset-btn rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition">🔄 Reset</button>
        </div>
      </div>
      <div class="mermaid-wrapper overflow-auto p-6 min-h-[420px] max-h-[700px] flex justify-center items-start cursor-grab active:cursor-grabbing select-none bg-[#0d1117]/60">
        <div class="mermaid-diagram w-full flex justify-center transition-transform duration-75 origin-top">${text}</div>
      </div>
    </div>`;
  }
  const validLang = lang || "text";
  return `<div class="code-wrapper my-6 rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-md">
    <div class="code-header flex items-center justify-between border-b border-[#30363d] bg-[#0d1117] px-4 py-1.5 font-mono text-[11px] text-slate-400">
      <span>${validLang}</span>
    </div>
    <pre class="p-4 overflow-x-auto text-xs leading-relaxed"><code class="language-${validLang}">${escapeHtml(text)}</code></pre>
  </div>`;
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

marked.use({ renderer });

export function DocsViewer({ docs }: { docs: DocFile[] }) {
  const [activeSlug, setActiveSlug] = useState<string>(docs[0]?.slug ?? "README");
  const [searchQuery, setSearchQuery] = useState("");
  const mainRef = useRef<HTMLElement>(null);

  const activeDoc = docs.find((d) => d.slug === activeSlug) ?? docs[0];
  const currentIndex = docs.findIndex((d) => d.slug === activeSlug);

  const prevDoc = currentIndex > 0 ? docs[currentIndex - 1] : null;
  const nextDoc = currentIndex < docs.length - 1 ? docs[currentIndex + 1] : null;

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectDoc = (slug: string) => {
    setActiveSlug(slug);
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Compile raw Markdown using marked
  const compiledHtml = activeDoc ? marked.parse(activeDoc.content) : "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Load Highlight.js CSS theme
    const hljsStyleId = "hljs-theme-style";
    if (!document.getElementById(hljsStyleId)) {
      const link = document.createElement("link");
      link.id = hljsStyleId;
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/tokyo-night-dark.min.css";
      link.integrity = "sha384-6PRNB60loRkq5oYgj0ETV33K0YsTUlab8qtfTGXhRgW5Nz1IpzS2zwj6UmlJEnyV";
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }

    // 2. Load Highlight.js Script
    const loadHighlightScript = () => {
      const hljsScriptId = "hljs-cdn-script";
      if (!document.getElementById(hljsScriptId)) {
        const script = document.createElement("script");
        script.id = hljsScriptId;
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js";
        script.integrity = "sha384-F/bZzf7p3Joyp5psL90p/p89AZJsndkSoGwRpXcZhleCWhd8SnRuoYo4d0yirjJp";
        script.crossOrigin = "anonymous";
        script.onload = () => highlightCode();
        document.body.appendChild(script);
      } else {
        highlightCode();
      }
    };

    const highlightCode = () => {
      // @ts-expect-error hljs global
      if (window.hljs) {
        document.querySelectorAll("pre code").forEach((block) => {
          // @ts-expect-error hljs global
          window.hljs.highlightElement(block);
        });
      }
    };

    // 3. Load Mermaid & Apply Best-Fit Sizing + Pan & Pinch-Zoom
    const loadMermaidAndSetupControls = () => {
      const mermaidScriptId = "mermaid-cdn-script";

      const initMermaid = () => {
        // @ts-expect-error Mermaid global
        if (window.mermaid) {
          try {
            // @ts-expect-error Mermaid global
            window.mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
            // @ts-expect-error Mermaid global
            window.mermaid.run({
              querySelector: ".mermaid-diagram",
              postRenderCallback: () => {
                setTimeout(attachInteractiveControls, 100);
              }
            });
          } catch (err) {
            console.error("Mermaid error:", err);
          }
        }
      };

      const attachInteractiveControls = () => {
        document.querySelectorAll(".mermaid-container").forEach((container) => {
          const target = container.querySelector(".mermaid-diagram") as HTMLElement | null;
          const wrapper = container.querySelector(".mermaid-wrapper") as HTMLElement | null;
          const svg = container.querySelector(".mermaid-diagram svg") as SVGElement | null;
          const zoomInBtn = container.querySelector(".zoom-in-btn") as HTMLButtonElement | null;
          const zoomOutBtn = container.querySelector(".zoom-out-btn") as HTMLButtonElement | null;
          const resetBtn = container.querySelector(".reset-btn") as HTMLButtonElement | null;

          if (!target || !wrapper) return;

          // Force SVG to Best-Fit width
          if (svg) {
            svg.style.width = "100%";
            svg.style.maxWidth = "100%";
            svg.style.height = "auto";
            svg.style.minHeight = "360px";
          }

          let currentScale = 1;
          let isDragging = false;
          let startX = 0;
          let startY = 0;
          let initialScrollLeft = 0;
          let initialScrollTop = 0;
          let initialTouchDist = 0;

          const applyScale = () => {
            target.style.transform = `scale(${currentScale})`;
          };

          // --- 1. Zoom Buttons ---
          if (zoomInBtn) {
            zoomInBtn.onclick = (e) => {
              e.preventDefault();
              currentScale = Math.min(3.5, currentScale + 0.15);
              applyScale();
            };
          }

          if (zoomOutBtn) {
            zoomOutBtn.onclick = (e) => {
              e.preventDefault();
              currentScale = Math.max(0.4, currentScale - 0.15);
              applyScale();
            };
          }

          if (resetBtn) {
            resetBtn.onclick = (e) => {
              e.preventDefault();
              currentScale = 1;
              applyScale();
              wrapper.scrollLeft = 0;
              wrapper.scrollTop = 0;
            };
          }

          // --- 2. Smooth Click & Drag Panning ---
          wrapper.onmousedown = (e) => {
            isDragging = true;
            startX = e.pageX - wrapper.offsetLeft;
            startY = e.pageY - wrapper.offsetTop;
            initialScrollLeft = wrapper.scrollLeft;
            initialScrollTop = wrapper.scrollTop;
            wrapper.style.cursor = "grabbing";
          };

          wrapper.onmouseleave = () => {
            isDragging = false;
            wrapper.style.cursor = "grab";
          };

          wrapper.onmouseup = () => {
            isDragging = false;
            wrapper.style.cursor = "grab";
          };

          wrapper.onmousemove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - wrapper.offsetLeft;
            const y = e.pageY - wrapper.offsetTop;
            const walkX = (x - startX) * 1.2;
            const walkY = (y - startY) * 1.2;
            wrapper.scrollLeft = initialScrollLeft - walkX;
            wrapper.scrollTop = initialScrollTop - walkY;
          };

          // --- 3. Pinch-In / Pinch-Out Trackpad & Touch Gesture Zoom ---
          wrapper.onwheel = (e) => {
            if (e.ctrlKey) {
              e.preventDefault();
              const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
              currentScale = Math.min(3.5, Math.max(0.4, currentScale * zoomFactor));
              applyScale();
            }
          };

          // 2-Finger Touch Pinch Gesture
          wrapper.ontouchstart = (e) => {
            if (e.touches.length === 2) {
              const t1 = e.touches[0]!;
              const t2 = e.touches[1]!;
              initialTouchDist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
            }
          };

          wrapper.ontouchmove = (e) => {
            if (e.touches.length === 2 && initialTouchDist > 0) {
              e.preventDefault();
              const t1 = e.touches[0]!;
              const t2 = e.touches[1]!;
              const currentDist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
              const diff = currentDist / initialTouchDist;
              currentScale = Math.min(3.5, Math.max(0.4, currentScale * diff));
              applyScale();
              initialTouchDist = currentDist;
            }
          };
        });
      };

      if (!document.getElementById(mermaidScriptId)) {
        const script = document.createElement("script");
        script.id = mermaidScriptId;
        script.src = "https://cdn.jsdelivr.net/npm/mermaid@10.9.3/dist/mermaid.min.js";
        script.integrity = "sha384-R63zfMfSwJF4xCR11wXii+QUsbiBIdiDzDbtxia72oGWfkT7WHJfmD/I/eeHPJyT";
        script.crossOrigin = "anonymous";
        script.onload = () => initMermaid();
        document.body.appendChild(script);
      } else {
        setTimeout(initMermaid, 150);
      }
    };

    loadHighlightScript();
    loadMermaidAndSetupControls();
  }, [activeSlug, compiledHtml]);

  return (
    <div className="h-screen bg-[#0d1117] text-[#c9d1d9] font-sans flex flex-col overflow-hidden">
      {/* Top Fixed Header */}
      <header className="h-16 border-b border-[#30363d] bg-[#161b22] px-6 flex items-center justify-between z-30 shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg">
            📖
          </div>
          <div>
            <h1 className="font-extrabold text-base text-white tracking-wide">Developer Project Handbook</h1>
            <p className="text-xs text-slate-400">Technical Documentation & Visual Guides</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <span>➔ Back to App</span>
          </a>
        </div>
      </header>

      {/* Main Independent Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Left Navigation Sidebar */}
        <aside className="w-80 flex-shrink-0 border-r border-[#30363d] bg-[#161b22]/70 p-4 flex flex-col gap-3 overflow-y-auto h-[calc(100vh-4rem)]">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search handbook modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 pt-2">
            Modules ({filteredDocs.length})
          </div>

          {/* Module Nav Links */}
          <div className="space-y-1">
            {filteredDocs.map((doc) => {
              const isActive = doc.slug === activeSlug;
              return (
                <button
                  key={doc.slug}
                  onClick={() => handleSelectDoc(doc.slug)}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-left text-xs transition-all ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={isActive ? "text-emerald-400" : "text-slate-500"}>📄</span>
                    <span className="truncate">{doc.title}</span>
                  </div>
                  {isActive && <span className="text-emerald-400 font-extrabold text-sm">›</span>}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Independent Content Scroll Container */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#0d1117] h-[calc(100vh-4rem)]">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Resource Indicator */}
            <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
              <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold">
                Resource File: docs/handbook/{activeDoc?.slug}.md
              </span>
            </div>

            {/* Compiled HTML Article Output */}
            <article
              className="docs-content text-slate-200 text-sm leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: typeof compiledHtml === "string" ? compiledHtml : "" }}
            />

            {/* Next / Previous Module Navigation Footer */}
            <div className="mt-12 pt-8 border-t border-[#30363d] flex items-center justify-between pb-8">
              {prevDoc ? (
                <button
                  onClick={() => handleSelectDoc(prevDoc.slug)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#30363d] bg-[#161b22] text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-emerald-400 transition"
                >
                  <span>← Previous: {prevDoc.title}</span>
                </button>
              ) : (
                <div />
              )}

              {nextDoc ? (
                <button
                  onClick={() => handleSelectDoc(nextDoc.slug)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
                >
                  <span>Next: {nextDoc.title} →</span>
                </button>
              ) : (
                <div />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* High-Readability GitHub/Developer CSS Styling */}
      <style jsx global>{`
        .docs-content h1 {
          font-size: 1.85rem;
          font-weight: 900;
          color: #34d399;
          border-bottom: 2px solid #30363d;
          padding-bottom: 0.75rem;
          margin-top: 1.5rem;
          margin-bottom: 1.25rem;
        }
        .docs-content h2 {
          font-size: 1.35rem;
          font-weight: 800;
          color: #f3f4f6;
          margin-top: 2rem;
          margin-bottom: 0.85rem;
          border-bottom: 1px solid #30363d;
          padding-bottom: 0.4rem;
        }
        .docs-content h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #6ee7b7;
          margin-top: 1.5rem;
          margin-bottom: 0.6rem;
        }
        .docs-content p {
          margin-bottom: 1.1rem;
          color: #e5e7eb;
          line-height: 1.75;
          font-size: 0.925rem;
        }
        .docs-content ul, .docs-content ol {
          margin-left: 1.75rem;
          margin-bottom: 1.25rem;
          list-style-type: disc;
        }
        .docs-content li {
          margin-bottom: 0.5rem;
          color: #e5e7eb;
        }
        .docs-content code:not(pre code) {
          background-color: #161b22;
          border: 1px solid #30363d;
          color: #58a6ff;
          padding: 0.2rem 0.45rem;
          border-radius: 0.375rem;
          font-size: 0.85rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .docs-content table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1.25rem;
          margin-bottom: 1.75rem;
          border-radius: 0.75rem;
          overflow: hidden;
          border: 1px solid #30363d;
        }
        .docs-content th {
          background-color: #161b22;
          color: #34d399;
          font-weight: 700;
          text-align: left;
          padding: 0.85rem 1rem;
          border-bottom: 1px solid #30363d;
        }
        .docs-content td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #21262d;
          color: #e5e7eb;
        }
        .docs-content tr:hover {
          background-color: #161b22;
        }
        .docs-content blockquote {
          border-left: 4px solid #f59e0b;
          background-color: rgba(245, 158, 11, 0.1);
          color: #fef3c7;
          padding: 0.85rem 1.25rem;
          border-radius: 0.5rem;
          margin-top: 1.25rem;
          margin-bottom: 1.25rem;
        }
      `}</style>
    </div>
  );
}
