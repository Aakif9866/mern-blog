import { Fragment } from "react";
import { Link } from "react-router";

const TOKEN = /(@[a-z0-9_]{3,30}\b|https?:\/\/[^\s<]+)/gi;

/** Plain-text comment with @mentions and URLs turned into links. */
export function CommentText({ text }: { text: string }) {
  const parts = text.split(TOKEN);
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-relaxed [overflow-wrap:anywhere]">
      {parts.map((part, i) => {
        if (/^@[a-z0-9_]{3,30}$/i.test(part)) {
          return (
            <Link key={i} to={`/u/${part.slice(1).toLowerCase()}`} className="font-medium text-brand-600 hover:underline dark:text-brand-300">
              {part}
            </Link>
          );
        }
        if (/^https?:\/\//i.test(part)) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 underline underline-offset-2 dark:text-brand-300">
              {part}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </p>
  );
}
