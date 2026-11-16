export function TableBoardToolbar() {
  return (
    <div className="relative isolate flex min-h-36 w-full items-end justify-between overflow-hidden rounded-2xl border border-lime-300/20 bg-slate-950 p-5 shadow-[0_0_34px_rgba(132,204,22,0.12)] sm:p-6">
      <img
        src="/the-nine/club-table-front.webp"
        alt="The Nine snooker table"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-45"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/75 to-slate-950/20" />
      <div>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Live Floor</h1>
        <p className="mt-1 text-sm font-semibold text-lime-100/70">Start, extend, add items, and close each table in one view.</p>
      </div>
    </div>
  );
}
