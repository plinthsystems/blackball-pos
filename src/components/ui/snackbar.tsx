"use client";

export function Snackbar({ message, tone = "neutral" }: { message: string | null; tone?: "neutral" | "success" | "danger" }) {
  if (!message) {
    return null;
  }

  const toneClass = tone === "success" ? "border-success" : tone === "danger" ? "border-danger" : "border-outline";
  return (
    <div className={`fixed bottom-4 right-4 z-50 rounded-material border ${toneClass} bg-surface px-4 py-3 text-sm shadow-material`}>
      {message}
    </div>
  );
}
