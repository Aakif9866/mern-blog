import { Link } from "react-router";
import { LogoMark } from "../ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface pb-20 sm:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2 font-bold">
            <LogoMark className="h-7 w-7" />
            Klyro
          </div>
          <p className="mt-2 text-sm text-ink-soft">Where ideas come together. A community for people who write to think and share what they learn.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3">
          <Link to="/about" className="text-ink-soft hover:text-ink">About</Link>
          <Link to="/tags" className="text-ink-soft hover:text-ink">Tags</Link>
          <Link to="/search" className="text-ink-soft hover:text-ink">Search</Link>
          <Link to="/guidelines" className="text-ink-soft hover:text-ink">Guidelines</Link>
          <a href="/api/docs" className="text-ink-soft hover:text-ink">API</a>
          <Link to="/write" className="text-ink-soft hover:text-ink">Start writing</Link>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-ink-soft">© {new Date().getFullYear()} Klyro. Where ideas come together.</div>
    </footer>
  );
}
