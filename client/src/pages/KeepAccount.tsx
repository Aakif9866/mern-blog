import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark, Heart, UserPlus } from "lucide-react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Me } from "@/lib/types";
import { useAppDispatch, useMe } from "@/store";
import { signedIn } from "@/store/authSlice";
import { guestTimeLeft } from "@/lib/guest";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

/** Turns a guest session into a full account without losing follows, reactions, bookmarks or drafts. */
export default function KeepAccount() {
  const me = useMe();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const upgrade = useMutation({
    mutationFn: () => api.post<{ user: Me }>("/auth/guest/upgrade", { ...form, name: form.name || undefined }),
    onSuccess: (r) => {
      dispatch(signedIn(r.user));
      toast.success("Welcome to Klyro! Check your inbox to verify your email.");
      navigate("/", { replace: true });
    },
  });
  if (me && !me.isGuest) return <Navigate to="/" replace />;

  const errs =
    upgrade.error instanceof ApiError && Array.isArray(upgrade.error.details)
      ? Object.fromEntries((upgrade.error.details as { path: string; message: string }[]).map((d) => [d.path, d.message]))
      : {};
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: k === "username" ? e.target.value.toLowerCase() : e.target.value }));

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <title>Create your account · Klyro</title>
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <LogoMark className="h-10 w-10" />
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Keep your Klyro account</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Your guest session ends in {guestTimeLeft(me?.guestExpiresAt)}. Create an account to keep it and to publish, comment and upload.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
          <li className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-brand-600 dark:text-brand-300" /> People and topics you follow</li>
          <li className="flex items-center gap-2"><Heart className="h-4 w-4 text-brand-600 dark:text-brand-300" /> Your likes and helpful reactions</li>
          <li className="flex items-center gap-2"><Bookmark className="h-4 w-4 text-brand-600 dark:text-brand-300" /> Bookmarks and drafts</li>
        </ul>
        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            upgrade.mutate();
          }}
        >
          <Field label="Name">{(id) => <Input id={id} value={form.name} onChange={set("name")} autoComplete="name" maxLength={60} />}</Field>
          <Field label="Username" error={errs.username} hint="3-30 lowercase letters, numbers or underscores.">
            {(id) => <Input id={id} value={form.username} onChange={set("username")} autoComplete="username" autoCapitalize="none" invalid={Boolean(errs.username)} />}
          </Field>
          <Field label="Email" error={errs.email}>{(id) => <Input id={id} type="email" value={form.email} onChange={set("email")} autoComplete="email" invalid={Boolean(errs.email)} />}</Field>
          <Field label="Password" error={errs.password} hint="At least 8 characters.">
            {(id) => <Input id={id} type="password" value={form.password} onChange={set("password")} autoComplete="new-password" invalid={Boolean(errs.password)} />}
          </Field>
          {upgrade.error && !Object.keys(errs).length && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorMessage(upgrade.error)}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={upgrade.isPending} disabled={!form.username || !form.email || !form.password}>
            Create account
          </Button>
        </form>
      </div>
    </div>
  );
}
