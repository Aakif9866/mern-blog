import { UserRound } from "lucide-react";
import { ButtonLink } from "./ui/Button";

/** Inline call-to-action shown where guests hit a members-only feature. */
export function GuestNotice({ action }: { action: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
      <UserRound className="hidden h-5 w-5 shrink-0 text-ink-soft sm:block" />
      <p className="text-sm text-ink-soft">
        Guests can't {action}. Create a free account to {action}. Everything you've done as a guest comes with you.
      </p>
      <ButtonLink to="/keep-account" size="sm" className="sm:ml-auto">
        Create account
      </ButtonLink>
    </div>
  );
}
