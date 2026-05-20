export default function Loading() {
  return (
    <div className="min-h-full bg-zinc-100">
      <div className="h-9 bg-brand-blue-dark" />
      <div className="mx-auto max-w-6xl px-4 py-5">
        <div className="h-10 w-56 animate-pulse rounded bg-zinc-300" />
      </div>
      <div className="h-11 bg-brand-blue" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-10 grid gap-5 lg:grid-cols-3">
          <div className="col-span-2 aspect-[16/9] animate-pulse rounded-xl bg-zinc-300" />
          <div className="space-y-3 rounded-xl bg-white p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-zinc-200" />
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-zinc-200" />
          ))}
        </div>
      </main>
    </div>
  );
}
