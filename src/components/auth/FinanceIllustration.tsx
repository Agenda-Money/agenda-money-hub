// Abstract animated finance-chart illustration for the auth pages —
// growing bars, a drawn trend line, and floating stat chips over a
// gradient/grid backdrop, built from the app's own brand tokens rather
// than a static image asset. Purely decorative (aria-hidden).
export function FinanceIllustration() {
  const bars = [38, 58, 46, 72, 64, 88, 78, 96];

  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden="true">
      {/* Dot grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(0 0% 100% / 0.6) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Soft glow orbs */}
      <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-12">
        <div className="w-full max-w-sm">
          {/* Chart card */}
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-sm shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Portfolio Value</p>
                <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1">GHS 4.86M</p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                +24.8%
              </div>
            </div>

            {/* Bars + line overlay */}
            <div className="relative h-32">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 128" preserveAspectRatio="none">
                <polyline
                  points="10,90 50,70 90,80 130,45 170,55 210,20 250,35 300,8"
                  fill="none"
                  stroke="hsl(330 90% 70%)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="auth-line-draw"
                />
              </svg>
              <div className="absolute inset-0 flex items-end justify-between gap-2">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-white/25 to-white/5 auth-bar-grow"
                    style={{ "--bar-height": `${h}%`, animationDelay: `${i * 80}ms` } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Floating stat chips */}
          <div className="mt-4 flex justify-between gap-3">
            <div className="auth-float rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 backdrop-blur-sm" style={{ animationDelay: "0.2s" }}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">Active Loans</p>
              <p className="text-lg font-bold text-white font-mono tabular-nums">12,489</p>
            </div>
            <div className="auth-float rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 backdrop-blur-sm" style={{ animationDelay: "0.6s" }}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">Repayment Rate</p>
              <p className="text-lg font-bold text-emerald-300 font-mono tabular-nums">96.4%</p>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center max-w-xs">
          <p className="text-white/70 text-sm leading-relaxed">
            Real-time visibility into every loan, every ledger entry, every projection — all in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
