import { Link } from "react-router";
import clsx from "clsx";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx("shrink-0", className ?? "h-8 w-8")} aria-hidden="true">
      <defs>
        <linearGradient id="klyro-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#klyro-g)" />
      <path d="M11 8.5v15" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M21.5 9.5 14 16l7.5 6.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="16" r="2.4" fill="#fff" />
      <circle cx="21.5" cy="9.5" r="2.2" fill="#e0e7ff" />
      <circle cx="21.5" cy="22.5" r="2.2" fill="#e0e7ff" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={clsx("flex items-center gap-2 font-bold tracking-tight", className)} aria-label="Klyro home">
      <LogoMark />
      <span className="text-xl">Klyro</span>
    </Link>
  );
}
