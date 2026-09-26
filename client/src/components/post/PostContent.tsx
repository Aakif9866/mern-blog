import { useEffect, useRef } from "react";

/**
 * Renders server-sanitized post HTML (cleaned by the API's allow-list before
 * it is stored) and syntax-highlights code blocks when there are any.
 */
export function PostContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el?.querySelector("pre code")) return;
    let cancelled = false;
    void import("./highlight").then(({ highlightAll }) => !cancelled && highlightAll(el));
    return () => {
      cancelled = true;
    };
  }, [html]);
  return <div ref={ref} className="klyro-prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
