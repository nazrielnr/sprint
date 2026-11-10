import { useQueryClient } from "@tanstack/react-query";
import { useUsers } from "../../hooks/queries";
import type { User } from "../../types";
import { cn } from "../../lib/utils";

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const dims = size === "sm" ? "h-[22px] w-[22px]" : "h-6 w-6";
  if (!name) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border border-dashed border-subtle text-caption2 text-muted",
          dims,
          className,
        )}
      >
        ?
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent-soft text-caption2 font-semibold text-accent",
        dims,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AssigneeDot({
  userId,
  size = "md",
}: {
  userId: string | null;
  size?: "sm" | "md";
}) {
  const { data: users } = useUsers();
  const user = users?.find((u) => u.id === userId);
  return (
    <span title={user ? `${user.name} (${user.email})` : "Unassigned"} className="inline-flex">
      <Avatar name={user?.name ?? null} size={size} />
    </span>
  );
}

export function AssigneeName({ userId }: { userId: string | null }) {
  const { data: users } = useUsers();
  const user: User | undefined = users?.find((u) => u.id === userId);
  return <span className="text-muted">{user ? user.name : "Unassigned"}</span>;
}

/** Small helper for comment sections (avoids circular imports). */
export function useCachedUser(userId: string | null): User | undefined {
  const qc = useQueryClient();
  if (!userId) return undefined;
  const data = qc.getQueryData<{ items: User[] }>(["users"]);
  return data?.items.find((u) => u.id === userId);
}
