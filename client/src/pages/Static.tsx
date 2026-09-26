import { Compass, HeartHandshake, PenLine, Shield, Sparkles, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

export function About() {
  const points = [
    { icon: PenLine, title: "Write to think", text: "A focused editor with Markdown shortcuts, code highlighting, drafts that save themselves and scheduled publishing." },
    { icon: Users, title: "Grow together", text: "Follow people and topics, react with Like or Helpful, and discuss in threaded comments with @mentions." },
    { icon: Compass, title: "Find what matters", text: "Following, Latest and Trending feeds, full-text search, topic pages and related posts." },
    { icon: Sparkles, title: "Helpful AI, not noisy AI", text: "Short TL;DR summaries and tag suggestions help readers and writers, and stay out of the way." },
    { icon: Shield, title: "Safe by default", text: "Community reporting, a moderation team, and security practices like httpOnly sessions and sanitized content." },
    { icon: HeartHandshake, title: "Open community", text: "Klyro is for developers, students and curious minds. Everyone starts as a reader and everyone can write." },
  ];
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <title>About · Klyro</title>
      <LogoMark className="h-12 w-12" />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">Where ideas come together.</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">
        Klyro is a community blogging platform. It's a place to write down what you're learning and building, and to meet people who care about the same things.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {points.map((p) => (
          <div key={p.title} className="rounded-xl border border-line bg-surface p-5">
            <p.icon className="h-6 w-6 text-brand-600 dark:text-brand-300" />
            <h2 className="mt-3 font-semibold">{p.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{p.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <ButtonLink to="/sign-up" size="lg">Join Klyro</ButtonLink>
        <ButtonLink to="/guidelines" variant="outline" size="lg">Community guidelines</ButtonLink>
      </div>
    </div>
  );
}

export function Guidelines() {
  const rules = [
    ["Be kind and constructive", "Critique ideas, not people. Assume good intent and help others improve."],
    ["Share original work", "Credit your sources. Don't copy other people's posts or code without attribution."],
    ["No spam or self-promotion floods", "Promotion is fine when it's relevant and occasional. Repetitive links and ads will be removed."],
    ["No harassment or hate", "Threats, slurs, doxxing and targeted harassment lead to suspension or a ban."],
    ["Keep it safe for work", "No sexual or graphic content."],
    ["Don't spread misinformation", "Especially about health, security or safety. Link to evidence when you make claims."],
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <title>Community guidelines · Klyro</title>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Community guidelines</h1>
      <p className="mt-3 text-ink-soft">Klyro works because people treat each other well. These guidelines apply to posts, comments and profiles.</p>
      <ol className="mt-8 space-y-4">
        {rules.map(([title, text], i) => (
          <li key={title} className="flex gap-4 rounded-xl border border-line bg-surface p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">{i + 1}</span>
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="text-sm text-ink-soft">{text}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-sm text-ink-soft">
        See something that breaks these rules? Use <strong>Report</strong> in the post or comment menu. Moderators review every report, and can remove content, suspend or ban accounts.
      </p>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <title>Page not found · Klyro</title>
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">This page doesn't exist</h1>
      <p className="mt-2 text-ink-soft">The link may be broken, or the page may have been removed.</p>
      <ButtonLink to="/" className="mt-6">Go home</ButtonLink>
    </div>
  );
}
