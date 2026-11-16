export default function AdminLoading() {
  return (
    <section className="mx-auto max-w-6xl space-y-5" aria-busy="true" aria-label="Loading page">
      <div className="flex items-center gap-3 rounded-2xl border border-lime-300/20 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-lime-100" role="status" aria-live="polite">
        <span aria-hidden="true" className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        Loading page…
      </div>
      <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" aria-hidden="true" />
    </section>
  );
}
