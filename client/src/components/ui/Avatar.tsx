import clsx from "clsx";

const COLORS = ["bg-brand-500", "bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-teal-500", "bg-fuchsia-500"];
const SIZES = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg", xl: "h-24 w-24 text-3xl" };

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function Avatar({ user, size = "md", className }: { user: { username: string; name?: string; avatar?: string } | null; size?: keyof typeof SIZES; className?: string }) {
  const cls = clsx("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white", SIZES[size], className);
  if (!user) return <span className={clsx(cls, "bg-zinc-400")} aria-hidden="true">?</span>;
  if (user.avatar) return <img src={user.avatar} alt="" className={clsx(cls, "object-cover bg-muted")} loading="lazy" referrerPolicy="no-referrer" />;
  const initials = (user.name || user.username).split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className={clsx(cls, COLORS[hash(user.username) % COLORS.length])} aria-hidden="true">
      {initials}
    </span>
  );
}
