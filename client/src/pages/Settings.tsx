import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, LogOut, Monitor, Smartphone, X } from "lucide-react";
import clsx from "clsx";
import { api, errorMessage } from "@/lib/api";
import type { EmailPrefs, Me, SessionInfo } from "@/lib/types";
import { keys } from "@/api/keys";
import { useAppDispatch, useMe } from "@/store";
import { userUpdated, signedOut } from "@/store/authSlice";
import { logout } from "@/lib/session";
import { Tabs } from "@/components/ui/Tabs";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Card, Badge } from "@/components/ui/misc";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { timeAgo } from "@/lib/format";
import { GuestNotice } from "@/components/GuestNotice";

type Section = "profile" | "notifications" | "account";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function ProfileSettings({ me }: { me: Me }) {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: me.name, username: me.username, bio: me.bio ?? "", website: me.website, location: me.location });
  const save = useMutation({
    mutationFn: () => api.patch<{ user: Me }>("/users/me", form),
    onSuccess: (r) => {
      dispatch(userUpdated(r.user));
      void qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const avatar = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post<{ user: Me }>("/users/me/avatar", fd);
    },
    onSuccess: (r) => {
      dispatch(userUpdated(r.user));
      toast.success("Profile picture updated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const removeAvatar = useMutation({
    mutationFn: () => api.patch<{ user: Me }>("/users/me", { avatar: "" }),
    onSuccess: (r) => dispatch(userUpdated(r.user)),
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Section title="Profile" description="This is how others see you on Klyro.">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative">
          <Avatar user={me} size="xl" className="h-20 w-20" />
          {avatar.isPending && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
              <Spinner />
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Camera className="h-4 w-4" /> Change photo
          </Button>
          {me.avatar && (
            <Button variant="ghost" size="sm" onClick={() => removeAvatar.mutate()}>
              <X className="h-4 w-4" /> Remove
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) avatar.mutate(f);
            e.target.value = "";
          }}
        />
      </div>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Name">{(id) => <Input id={id} value={form.name} onChange={set("name")} maxLength={60} />}</Field>
        <Field label="Username" hint="Changing it changes your profile URL.">
          {(id) => <Input id={id} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))} maxLength={30} autoCapitalize="none" />}
        </Field>
        <div className="sm:col-span-2">
          <Field label="Bio" hint={`${280 - form.bio.length} characters left`}>{(id) => <Textarea id={id} value={form.bio} onChange={set("bio")} maxLength={280} rows={3} />}</Field>
        </div>
        <Field label="Website">{(id) => <Input id={id} type="url" value={form.website} onChange={set("website")} placeholder="https://" />}</Field>
        <Field label="Location">{(id) => <Input id={id} value={form.location} onChange={set("location")} maxLength={60} />}</Field>
        <div className="sm:col-span-2">
          <Button type="submit" loading={save.isPending}>
            Save profile
          </Button>
        </div>
      </form>
    </Section>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-sm text-ink-soft">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-brand-600" : "bg-line")}
      >
        <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

function NotificationSettings({ me }: { me: Me }) {
  const dispatch = useAppDispatch();
  const save = useMutation({
    mutationFn: (emailPrefs: Partial<EmailPrefs>) => api.patch<{ user: Me }>("/users/me", { emailPrefs }),
    onMutate: (p) => dispatch(userUpdated({ emailPrefs: { ...me.emailPrefs, ...p } })),
    onSuccess: (r) => dispatch(userUpdated(r.user)),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const unfollow = useMutation({
    mutationFn: (tag: string) => api.delete(`/tags/${tag}/follow`),
    onSuccess: (_d, tag) => dispatch(userUpdated({ followedTags: me.followedTags.filter((t) => t !== tag) })),
  });
  const items: { key: keyof EmailPrefs; label: string; description: string }[] = [
    { key: "comments", label: "Comments and replies", description: "When someone comments on your post or replies to you." },
    { key: "mentions", label: "Mentions", description: "When someone @mentions you." },
    { key: "follows", label: "New followers", description: "When someone follows you." },
    { key: "reactions", label: "Reactions", description: "When someone likes your post or finds it helpful." },
    { key: "digest", label: "Weekly digest", description: "A Monday email with the week's best posts in your topics." },
  ];
  return (
    <div className="space-y-5">
      <Section title="Email notifications" description="In-app notifications are always on. Choose what we also email you about.">
        <div className="divide-y divide-line">
          {items.map((i) => (
            <Toggle key={i.key} label={i.label} description={i.description} checked={me.emailPrefs[i.key]} onChange={(v) => save.mutate({ [i.key]: v })} />
          ))}
        </div>
      </Section>
      <Section title="Followed topics" description="Posts in these tags appear in your Following feed.">
        {me.followedTags.length === 0 ? (
          <p className="text-sm text-ink-soft">You're not following any topics.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {me.followedTags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pl-3 pr-1 text-sm">
                #{t}
                <button onClick={() => unfollow.mutate(t)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-line" aria-label={`Unfollow ${t}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function AccountSettings({ me }: { me: Me }) {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [deleting, setDeleting] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const sessions = useQuery({ queryKey: keys.sessions, queryFn: () => api.get<{ items: SessionInfo[] }>("/auth/sessions") });

  const change = useMutation({
    mutationFn: () => api.post("/auth/change-password", { currentPassword: pw.currentPassword || undefined, newPassword: pw.newPassword }),
    onSuccess: () => {
      setPw({ currentPassword: "", newPassword: "" });
      toast.success("Password changed");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const revoke = useMutation({ mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`), onSuccess: () => void qc.invalidateQueries({ queryKey: keys.sessions }) });
  const del = useMutation({
    mutationFn: () => api.delete("/users/me", { password: deletePw || undefined }),
    onSuccess: () => {
      dispatch(signedOut());
      qc.clear();
      toast.success("Your account was deleted");
      navigate("/");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-5">
      <Section title="Email">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium [overflow-wrap:anywhere]">{me.email}</span>
          {me.emailVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Not verified</Badge>}
          {me.googleLinked && <Badge>Google linked</Badge>}
        </div>
      </Section>
      {!me.isGuest && (
      <Section title="Password" description={me.googleLinked ? "Set a password to also sign in with email." : undefined}>
        <form
          className="grid gap-4 sm:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate();
          }}
        >
          <Field label="Current password" hint={me.googleLinked ? "Leave empty if you've only used Google." : undefined}>
            {(id) => <Input id={id} type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" />}
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            {(id) => <Input id={id} type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} autoComplete="new-password" />}
          </Field>
          <div>
            <Button type="submit" loading={change.isPending} disabled={pw.newPassword.length < 8}>
              Update password
            </Button>
          </div>
        </form>
      </Section>
      )}
      <Section title="Where you're signed in">
        <ul className="divide-y divide-line">
          {sessions.data?.items.map((s) => {
            const mobile = /mobile|iphone|android/i.test(s.userAgent);
            const Icon = mobile ? Smartphone : Monitor;
            return (
              <li key={s._id} className="flex items-center gap-3 py-3">
                <Icon className="h-5 w-5 shrink-0 text-ink-soft" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{s.userAgent ? s.userAgent.replace(/\(.*?\)/g, "").slice(0, 60) : "Unknown device"}</div>
                  <div className="text-xs text-ink-soft">
                    {s.current ? "This device" : `Active ${timeAgo(s.lastUsedAt)}`} · {s.ip || "unknown IP"}
                  </div>
                </div>
                {!s.current && (
                  <Button size="sm" variant="ghost" onClick={() => revoke.mutate(s._id)}>
                    Sign out
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <Button variant="outline" className="mt-3" onClick={async () => (await logout(dispatch, qc, true), navigate("/sign-in"))}>
          <LogOut className="h-4 w-4" /> Sign out everywhere
        </Button>
      </Section>
      <Section title="Delete account" description="Your posts and comments will be removed. This can't be undone.">
        <Button variant="danger" onClick={() => setDeleting(true)}>
          Delete my account
        </Button>
      </Section>
      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete your account?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => del.mutate()} loading={del.isPending}>Delete forever</Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-soft">Everything you've written on Klyro will be removed.</p>
        <Field label="Confirm with your password" hint={me.googleLinked ? "Google-only accounts can leave this empty." : undefined}>
          {(id) => <Input id={id} type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} autoComplete="current-password" />}
        </Field>
      </Modal>
    </div>
  );
}

export default function Settings() {
  const me = useMe()!;
  const [params, setParams] = useSearchParams();
  const section = (params.get("tab") as Section) || "profile";
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <title>Settings · Klyro</title>
      <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
      {me.isGuest && (
        <div className="mt-5">
          <GuestNotice action="keep these settings" />
        </div>
      )}
      <Tabs
        className="mt-5"
        value={section}
        onChange={(v) => setParams(v === "profile" ? {} : { tab: v }, { replace: true })}
        tabs={[
          { value: "profile", label: "Profile" },
          { value: "notifications", label: "Notifications" },
          { value: "account", label: "Account" },
        ]}
      />
      <div className="mt-6">
        {section === "profile" && <ProfileSettings key={me._id} me={me} />}
        {section === "notifications" && <NotificationSettings me={me} />}
        {section === "account" && <AccountSettings me={me} />}
      </div>
    </div>
  );
}
