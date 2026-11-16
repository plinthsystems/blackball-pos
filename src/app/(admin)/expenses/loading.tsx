export default function ExpensesLoading() {
  return (
    <section className="mx-auto max-w-6xl space-y-5" aria-busy="true" aria-label="Loading expenses">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-cyan-200">
          <span className="size-4 animate-spin rounded-full border-2 border-cyan-200 border-r-transparent" />
          Loading expenses…
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />)}</div>
      <div className="h-80 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
    </section>
  );
}
