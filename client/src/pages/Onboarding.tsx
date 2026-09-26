import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { Me, Tag } from "@/lib/types";
import { useSuggestions } from "@/api/hooks";
import { keys } from "@/api/keys";
import { useAppDispatch, useMe } from "@/store";
import { signedIn } from "@/store/authSlice";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { displayName } from "@/lib/format";

const STARTER = ["javascript", "webdev", "react", "python", "ai", "machinelearning", "career", "dsa", "css", "backend", "devops", "security", "beginners", "opensource", "productivity", "design"];

export default function Onboarding() {
  const me = useMe();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [tags, setTags] = useState<string[]>(me?.followedTags ?? []);
  const [follows, setFollows] = useState<string[]>([]);
  const popular = useQuery({ queryKey: keys.popularTags, queryFn: () => api.get<{ items: Tag[] }>("/tags/popular") });
  const people = useSuggestions(step === 2);
  const options = [...new Set([...(popular.data?.items.map((t) => t.slug) ?? []), ...STARTER])].slice(0, 30);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const finish = useMutation({
    mutationFn: () => api.post<{ user: Me }>("/users/me/onboarding", { tags, follows }),
    onSuccess: (r) => {
      dispatch(signedIn(r.user));
      navigate("/", { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-14">
      <title>Welcome · Klyro</title>
      <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">Step {step} of 2</p>
      {step === 1 ? (
        <>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">What are you into?</h1>
          <p className="mt-2 text-ink-soft">Pick a few topics. We'll use them to fill your feed. You can change this anytime.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {popular.isLoading && Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-10 w-24 rounded-full" />)}
            {!popular.isLoading &&
              options.map((t) => {
                const on = tags.includes(t);
                return (
                  <button key={t} onClick={() => setTags(toggle(tags, t))} aria-pressed={on} className={clsx("flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors", on ? "border-brand-500 bg-brand-600 text-white" : "border-line bg-surface hover:border-brand-400")}>
                    {on && <Check className="h-4 w-4" />}#{t}
                  </button>
                );
              })}
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Writers you might like</h1>
          <p className="mt-2 text-ink-soft">Follow a few people to see their posts in your Following feed.</p>
          <ul className="mt-6 space-y-2">
            {people.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            {people.data?.items.length === 0 && <p className="text-sm text-ink-soft">No suggestions yet. You're early!</p>}
            {people.data?.items.map((u) => {
              const on = follows.includes(u.username);
              return (
                <li key={u._id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                  <Avatar user={u} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{displayName(u)}</div>
                    <div className="truncate text-sm text-ink-soft">{u.bio || `@${u.username}`}</div>
                  </div>
                  <Button size="sm" variant={on ? "outline" : "primary"} onClick={() => setFollows(toggle(follows, u.username))} aria-pressed={on}>
                    {on ? "Following" : "Follow"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div className="sticky bottom-20 mt-8 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/95 p-3 backdrop-blur sm:bottom-4">
        <Button variant="ghost" onClick={() => (step === 1 ? finish.mutate() : setStep(1))}>
          {step === 1 ? "Skip" : "Back"}
        </Button>
        <span className="hidden text-sm text-ink-soft sm:inline">{step === 1 ? `${tags.length} selected` : `${follows.length} selected`}</span>
        <Button onClick={() => (step === 1 ? setStep(2) : finish.mutate())} loading={finish.isPending}>
          {step === 1 ? "Continue" : "Finish"}
        </Button>
      </div>
    </div>
  );
}
