export function BossMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="boss-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffca55" />
          <stop offset="1" stopColor="#b9862a" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="#0c0e13" stroke="url(#boss-g)" strokeWidth="2" />
      {/* poker-chip notches */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 20 + Math.cos(a) * 18;
        const y1 = 20 + Math.sin(a) * 18;
        const x2 = 20 + Math.cos(a) * 14;
        const y2 = 20 + Math.sin(a) * 14;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="url(#boss-g)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx="20" cy="20" r="9.5" fill="none" stroke="url(#boss-g)" strokeWidth="1.4" opacity="0.6" />
      <text
        x="20"
        y="24.5"
        textAnchor="middle"
        fontSize="12"
        fontWeight="800"
        fill="url(#boss-g)"
        fontFamily="var(--font-display), sans-serif"
      >
        B
      </text>
    </svg>
  );
}
