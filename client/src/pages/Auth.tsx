import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Me } from "@/lib/types";
import { useAppDispatch, useMe } from "@/store";
import { signedIn, signedOut } from "@/store/authSlice";
import { LogoMark } from "@/components/ui/Logo";
import { Field, Input } from "@/components/ui/Input";
import { Button, ButtonLink } from "@/components/ui/Button";
import { GoogleButton } from "@/components/GoogleButton";
import { PageSpinner } from "@/components/ui/Spinner";

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-md flex-col justify-center px-4 py-10">
      <title>{`${title} · Klyro`}</title>
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <LogoMark className="h-10 w-10" />
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <p className="mt-5 text-center text-sm text-ink-soft">{footer}</p>}
    </div>
  );
}

function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
      {errorMessage(error)}
    </p>
  );
}

function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return {};
  return Object.fromEntries((error.details as { path: string; message: string }[]).map((d) => [d.path, d.message]));
}

export function SignIn() {
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () => api.post<{ user: Me }>("/auth/login", { identifier, password }, { noRefresh: true }),
    onSuccess: (r) => {
      dispatch(signedIn(r.user));
      navigate(next, { replace: true });
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate();
  };
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to write, react and join discussions." footer={<>New to Klyro? <Link to={`/sign-up${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-600 dark:text-brand-300">Create an account</Link></>}>
      <GoogleButton next={next} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email or username">{(id) => <Input id={id} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoCapitalize="none" required />}</Field>
        <Field label="Password">
          {(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />}
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">Forgot password?</Link>
        </div>
        <FormError error={login.error} />
        <Button type="submit" className="w-full" size="lg" loading={login.isPending} disabled={!identifier || !password}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}

export function SignUp() {
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const register = useMutation({
    mutationFn: () => api.post<{ user: Me }>("/auth/register", { ...form, name: form.name || undefined }, { noRefresh: true }),
    onSuccess: (r) => {
      dispatch(signedIn(r.user));
      navigate("/onboarding", { replace: true });
    },
  });
  const errs = fieldErrors(register.error);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: k === "username" ? e.target.value.toLowerCase() : e.target.value }));
  return (
    <AuthCard title="Join Klyro" subtitle="Where ideas come together." footer={<>Already have an account? <Link to="/sign-in" className="font-semibold text-brand-600 dark:text-brand-300">Sign in</Link></>}>
      <GoogleButton next={next} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          register.mutate();
        }}
        className="space-y-4"
        noValidate
      >
        <Field label="Name" hint="Shown on your profile and posts.">{(id) => <Input id={id} value={form.name} onChange={set("name")} autoComplete="name" maxLength={60} />}</Field>
        <Field label="Username" error={errs.username} hint="3-30 lowercase letters, numbers or underscores.">
          {(id) => <Input id={id} value={form.username} onChange={set("username")} autoComplete="username" autoCapitalize="none" invalid={Boolean(errs.username)} required />}
        </Field>
        <Field label="Email" error={errs.email}>{(id) => <Input id={id} type="email" value={form.email} onChange={set("email")} autoComplete="email" invalid={Boolean(errs.email)} required />}</Field>
        <Field label="Password" error={errs.password} hint="At least 8 characters.">
          {(id) => <Input id={id} type="password" value={form.password} onChange={set("password")} autoComplete="new-password" invalid={Boolean(errs.password)} required />}
        </Field>
        {!Object.keys(errs).length && <FormError error={register.error} />}
        <Button type="submit" className="w-full" size="lg" loading={register.isPending} disabled={!form.username || !form.email || !form.password}>
          Create account
        </Button>
        <p className="text-center text-xs text-ink-soft">
          By joining you agree to our <Link to="/guidelines" className="underline">community guidelines</Link>.
        </p>
      </form>
    </AuthCard>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const dispatch = useAppDispatch();
  const me = useMe();
  // A query (not an effect + mutation) so the one-time token is sent exactly once,
  // even when React runs effects twice or the component re-mounts.
  const verify = useQuery({
    queryKey: ["verify-email", token],
    queryFn: () => api.post<{ user: Me }>("/auth/verify-email", { token: token ?? "" }),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const verifiedUser = verify.data?.user;
  useEffect(() => {
    if (verifiedUser && me && me._id === verifiedUser._id && !me.emailVerified) dispatch(signedIn(verifiedUser));
  }, [verifiedUser, me, dispatch]);

  if (!token) return <AuthCard title="Check your inbox" subtitle="Open the link we emailed you to verify your address." children={<MailCheck className="h-10 w-10 text-brand-600" />} />;
  if (verify.isPending) return <PageSpinner />;
  return verify.isSuccess ? (
    <AuthCard title="Email verified" subtitle="You're all set to write and join discussions.">
      <CheckCircle2 className="mb-5 h-10 w-10 text-emerald-500" />
      <ButtonLink to={me ? (me.onboarded ? "/" : "/onboarding") : "/sign-in"} className="w-full" size="lg">
        {me ? "Continue" : "Sign in"}
      </ButtonLink>
    </AuthCard>
  ) : (
    <AuthCard title="Link expired" subtitle={errorMessage(verify.error)}>
      <XCircle className="mb-5 h-10 w-10 text-red-500" />
      <p className="text-sm text-ink-soft">Sign in and use “Resend email” in the banner to get a new link.</p>
    </AuthCard>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const send = useMutation({ mutationFn: () => api.post<{ message: string }>("/auth/forgot-password", { email }, { noRefresh: true }) });
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one." footer={<Link to="/sign-in" className="font-semibold text-brand-600 dark:text-brand-300">Back to sign in</Link>}>
      {send.isSuccess ? (
        <div className="flex gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <MailCheck className="h-5 w-5 shrink-0" /> {send.data.message}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Email">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />}</Field>
          <FormError error={send.error} />
          <Button type="submit" className="w-full" size="lg" loading={send.isPending} disabled={!email}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState("");
  const reset = useMutation({ mutationFn: () => api.post("/auth/reset-password", { token, password }, { noRefresh: true }), onSuccess: () => dispatch(signedOut()) });
  return (
    <AuthCard title="Choose a new password" subtitle="You'll be signed out of every device.">
      {reset.isSuccess ? (
        <>
          <p className="mb-5 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" /> Password updated.
          </p>
          <ButtonLink to="/sign-in" className="w-full" size="lg">Sign in</ButtonLink>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reset.mutate();
          }}
          className="space-y-4"
        >
          <Field label="New password" hint="At least 8 characters.">
            {(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />}
          </Field>
          <FormError error={reset.error} />
          <Button type="submit" className="w-full" size="lg" loading={reset.isPending} disabled={password.length < 8 || !token}>
            Update password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
