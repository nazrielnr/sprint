/** Small circular progress indicator; `color` is any CSS color. */
export function ProgressRing({
  value,
  color,
  size = 44,
}: {
  value: number; // 0-100
  color: string;
  size?: number;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${value}% done`}
      className="shrink-0 -rotate-90"
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.32,0.72,0,1)" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90 fill-[var(--label)] text-[11px] font-semibold tabular-nums"
        style={{ transformOrigin: "50% 50%" }}
      >
        {value}
      </text>
    </svg>
  );
}
