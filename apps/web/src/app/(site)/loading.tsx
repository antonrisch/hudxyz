export default function HomeLoading() {
  return (
    <main className="page-px mx-auto w-full max-w-6xl flex-1 pt-2 pb-10">
      <div className="h-95 animate-pulse rounded-2xl bg-muted sm:h-96" />

      <div className="mt-12">
        <div className="space-y-3">
          <div className="h-9 w-64 max-w-full animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded-md bg-muted" />
        </div>

        <div className="mt-10 space-y-10">
          {Array.from({ length: 2 }, (_, shelf) => (
            <section key={shelf} className="space-y-4">
              <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, card) => (
                  <div
                    key={card}
                    className="flex items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <div className="size-12 shrink-0 animate-pulse rounded-lg bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
