import { AuroraShader } from './AuroraShader'

export function LibrarySkeleton() {
  return (
    <div
      className="relative z-10 flex min-h-0 flex-1 overflow-hidden"
      aria-busy="true"
      aria-label="Loading Library"
    >
      <AuroraShader
        className="library-skeleton-aurora"
        amplitude={1.05}
        blend={0.76}
        speed={0.7}
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-8 sm:p-10">
        <div className="space-y-3">
          <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--glass-strong)]" />
          <div className="h-10 w-56 animate-pulse rounded-xl bg-[var(--glass-strong)]" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-[var(--glass)]" />
        </div>
        <div className="glass-card grid gap-3 p-3 md:grid-cols-[minmax(260px,1fr)_auto_auto]">
          <div className="h-11 animate-pulse rounded-2xl bg-[var(--glass-strong)]" />
          <div className="h-11 animate-pulse rounded-2xl bg-[var(--glass)]" />
          <div className="h-11 animate-pulse rounded-2xl bg-[var(--glass)]" />
        </div>
        <div className="flex items-center justify-between px-2">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--glass-strong)]" />
          <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--glass)]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="glass-card flex items-center gap-3 p-3">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-[var(--glass-strong)]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-[var(--glass-strong)]" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-[var(--glass)]" />
              </div>
            </div>
          ))}
        </div>
        <div className="min-h-0 space-y-3 overflow-hidden">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="row-panel flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-[var(--glass-strong)]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-2/5 animate-pulse rounded-full bg-[var(--glass-strong)]" />
                <div className="h-3 w-1/4 animate-pulse rounded-full bg-[var(--glass)]" />
              </div>
              <div className="h-3 w-12 animate-pulse rounded-full bg-[var(--glass)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
