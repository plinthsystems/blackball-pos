export default function InventoryLoading() {
  return (
    <section className="mx-auto max-w-6xl space-y-5" aria-busy="true" aria-label="Loading inventory">
      <header className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-lime-300 border-r-transparent" />
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Loading inventory…</h1>
          <p className="mt-1 text-sm text-slate-400">Fetching stock counts and menu items.</p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {["Tracked items", "Out of stock", "Overall stock", "Menu only"].map((label) => (
          <div key={label} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <div className="mt-3 h-7 w-20 rounded bg-slate-800" />
            <div className="mt-2 h-3 w-32 rounded bg-slate-800" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70" aria-hidden="true">
        <div className="h-16 animate-pulse border-b border-slate-800 bg-slate-900/50" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="grid animate-pulse gap-4 border-b border-slate-800 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_34rem]">
            <div className="h-10 rounded bg-slate-900" />
            <div className="h-10 rounded bg-slate-900" />
          </div>
        ))}
      </div>
    </section>
  );
}
