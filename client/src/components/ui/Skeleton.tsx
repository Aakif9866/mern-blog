import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-md bg-line/70", className)} aria-hidden="true" />;
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="mt-4 h-5 w-4/5" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-2/3" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading posts">
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PostPageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8" role="status" aria-label="Loading post">
      <Skeleton className="aspect-[2/1] w-full rounded-xl" />
      <Skeleton className="mt-6 h-9 w-5/6" />
      <div className="mt-5 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className={clsx("h-4", i % 3 === 2 ? "w-3/5" : "w-full")} />
        ))}
      </div>
    </div>
  );
}
