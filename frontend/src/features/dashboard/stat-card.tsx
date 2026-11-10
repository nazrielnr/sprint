import { Link } from "react-router";
import { cn } from "../../lib/utils";

const TONES = {
  default: "text-text",
  accent: "text-accent",
  success: "text-green-text",
  warning: "text-orange-text",
  danger: "text-red-text",
} as const;

export type StatTone = keyof typeof TONES;

/** A stat tile. Pass `to` to make it a link into a pre-filtered view. */
export function StatCard({
  label,
  value,
  tone = "default",
  to,
}: {
  label: string;
  value: number;
  tone?: StatTone;
  to?: string;
}) {
  const body = (
    <>
      <p className="text-caption font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-[28px] font-semibold leading-8 tracking-tight tabular-nums",
          TONES[tone],
        )}
      >
        {value}
      </p>
    </>
  );
  const cls = "block rounded-card bg-surface p-4 shadow-card";
  return to ? (
    <Link to={to} className={cn(cls, "press hover:bg-elevated")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
