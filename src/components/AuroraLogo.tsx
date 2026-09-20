export function AuroraLogo({ size = 40, showWordmark = false }: { size?: number; showWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3" aria-label="Aurora Player">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role="img"
        aria-hidden={showWordmark}
        className="shrink-0 drop-shadow-[0_8px_18px_var(--accent-glow)]"
      >
        <defs>
          <linearGradient id="aurora-logo-gradient" x1="7" y1="7" x2="41" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--accent-light)" />
            <stop offset="1" stopColor="var(--accent-dark)" />
          </linearGradient>
        </defs>
        <path d="M24 3.5c3.5 0 6.6 5.8 7.4 13.9C38.8 18.2 44.5 21 44.5 24s-5.7 5.8-13.1 6.6C30.6 38.7 27.5 44.5 24 44.5s-6.6-5.8-7.4-13.9C9.2 29.8 3.5 27 3.5 24s5.7-5.8 13.1-6.6C17.4 9.3 20.5 3.5 24 3.5Z" fill="url(#aurora-logo-gradient)" opacity=".95" />
        <circle cx="24" cy="24" r="7.5" fill="var(--background)" opacity=".9" />
        <circle cx="24" cy="24" r="3.5" fill="var(--text-primary)" />
      </svg>
      {showWordmark && (
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-none tracking-tight text-text-primary">Aurora</span>
          <span className="mt-1 block text-[10.5px] font-medium uppercase tracking-[0.16em] text-text-muted">Music</span>
        </span>
      )}
    </span>
  )
}
