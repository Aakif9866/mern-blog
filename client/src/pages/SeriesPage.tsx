import { Link, useParams } from "react-router";
import { useSeries } from "@/api/hooks";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/misc";
import { PageSpinner } from "@/components/ui/Spinner";
import { displayName, formatDate } from "@/lib/format";
import type { PublicUser } from "@/lib/types";

export default function SeriesPage() {
  const { id = "" } = useParams();
  const { data, isLoading, error } = useSeries(id);
  if (isLoading) return <PageSpinner />;
  if (error || !data) return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState title="Series not found" /></div>;
  const author = data.author as PublicUser;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <title>{`${data.title} · Klyro`}</title>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-600 dark:text-brand-300">Series</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight [overflow-wrap:anywhere]">{data.title}</h1>
      {data.description && <p className="mt-2 text-ink-soft">{data.description}</p>}
      <Link to={`/u/${author.username}`} className="mt-4 inline-flex items-center gap-2 text-sm">
        <Avatar user={author} size="sm" /> {displayName(author)}
      </Link>
      <ol className="mt-8 space-y-3">
        {data.posts?.map((p, i) => (
          <li key={p._id}>
            <Link to={p.status === "published" ? `/post/${p.slug}` : `/write/${p._id}`} className="flex gap-4 rounded-xl border border-line bg-surface p-4 hover:shadow-md">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-semibold [overflow-wrap:anywhere]">{p.title || "Untitled"}</span>
                <span className="text-sm text-ink-soft">{p.status === "published" ? `${formatDate(p.publishedAt)} · ${p.readTime} min read` : p.status}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {!data.posts?.length && <EmptyState title="No posts in this series yet" />}
    </div>
  );
}
