import { useState } from "react";
import { formatDate } from "@/lib/format";

/**
 * One series of daily counts as thin columns: rounded tops anchored to the
 * baseline, 2px gaps, full-height hover targets and a tooltip. Colour is the
 * brand-500 step, validated against both light and dark surfaces.
 */
export function DailyBars({ title, data }: { title: string; data: { date: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const W = 300;
  const H = 96;
  const slot = W / data.length;
  const bar = Math.max(2, slot - 2);
  const active = hover !== null ? data[hover] : null;

  return (
    <figure className="min-w-0 rounded-xl border border-line bg-surface p-4">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink-soft">{title}</span>
        <span className="text-lg font-bold tabular-nums">{total}</span>
      </figcaption>
      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label={`${title}, ${total} over the last ${data.length} days`}>
          <line x1="0" x2={W} y1={H} y2={H} className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {data.map((d, i) => {
            const h = d.value ? Math.max(3, (d.value / max) * (H - 4)) : 0;
            const x = i * slot + (slot - bar) / 2;
            const r = Math.min(4, bar / 2, h);
            return (
              <g key={d.date} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
                {h > 0 && (
                  <path
                    d={`M${x},${H} V${H - h + r} Q${x},${H - h} ${x + r},${H - h} H${x + bar - r} Q${x + bar},${H - h} ${x + bar},${H - h + r} V${H} Z`}
                    fill="#6366f1"
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                )}
              </g>
            );
          })}
        </svg>
        {active && hover !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs shadow-md"
            style={{ left: `${Math.min(88, Math.max(12, ((hover + 0.5) / data.length) * 100))}%` }}
          >
            <span className="text-ink-soft">{formatDate(active.date)}</span> <strong className="tabular-nums">{active.value}</strong>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-soft">
        <span>{formatDate(data[0]?.date)}</span>
        <span>peak {max}</span>
        <span>{formatDate(data[data.length - 1]?.date)}</span>
      </div>
    </figure>
  );
}
