export default function HubsLoading() {
  return (
    <main className="page-px mx-auto w-full max-w-3xl flex-1 py-10">
      {/* Title + description — mirrors hubs/page.tsx */}
      <div className="h-9 w-48 max-w-full animate-pulse rounded-md bg-muted" />
      <div className="mt-2 h-6 w-full max-w-xl animate-pulse rounded-md bg-muted" />

      {/* Muted notice Item */}
      <div className="mt-6 h-11 w-full animate-pulse rounded-lg bg-muted/50" />

      {/* “Don’t see your hub?” line */}
      <div className="mt-4 h-5 w-56 animate-pulse rounded-md bg-muted" />

      <div className="mt-8">
        {/* Search InputGroup (h-10) */}
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />

        {/* Hub rows — Item size=sm + image media + Try action */}
        <div className="mt-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index}>
              <div className="flex w-full items-center gap-2.5 py-2.5">
                <div className="size-8 shrink-0 animate-pulse rounded-sm bg-muted" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="h-5 w-32 max-w-[40%] animate-pulse rounded bg-muted" />
                  <div className="h-5 w-3/4 max-w-md animate-pulse rounded bg-muted" />
                </div>
                <div className="h-8 w-11 shrink-0 animate-pulse rounded-lg bg-muted" />
              </div>
              {index < 5 ? <div className="my-1 h-px w-full bg-border" /> : null}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
