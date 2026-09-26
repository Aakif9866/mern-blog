import { env } from "../config/env";
import type { Mail } from "./mailer";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function layout(title: string, body: string, cta?: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2330">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;padding:28px">
<tr><td style="font-size:20px;font-weight:700;color:#4f46e5;padding-bottom:16px">Klyro</td></tr>
<tr><td style="font-size:18px;font-weight:600;padding-bottom:12px">${esc(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6">${body}</td></tr>
${cta ? `<tr><td style="padding-top:20px"><a href="${cta.url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${esc(cta.label)}</a></td></tr>` : ""}
<tr><td style="padding-top:28px;font-size:12px;color:#8a8fa3">Klyro · Where ideas come together.<br>You can change email preferences in <a href="${env.APP_URL}/settings/notifications" style="color:#8a8fa3">settings</a>.</td></tr>
</table></td></tr></table></body></html>`;
}

export function verifyEmailMail(to: string, name: string, token: string): Mail {
  const url = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject: "Verify your email for Klyro",
    html: layout(`Welcome, ${name}!`, "Confirm your email address to start writing and commenting on Klyro. This link expires in 24 hours.", { label: "Verify email", url }),
    text: `Welcome to Klyro! Verify your email: ${url}`,
  };
}

export function resetPasswordMail(to: string, token: string): Mail {
  const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject: "Reset your Klyro password",
    html: layout("Reset your password", "Someone asked to reset your Klyro password. If it wasn't you, ignore this email. The link expires in 1 hour.", { label: "Choose a new password", url }),
    text: `Reset your Klyro password: ${url}`,
  };
}

export function notificationMail(to: string, headline: string, detail: string, path: string): Mail {
  const url = `${env.APP_URL}${path}`;
  return {
    to,
    subject: headline,
    html: layout(headline, esc(detail), { label: "Open Klyro", url }),
    text: `${headline}\n\n${detail}\n\n${url}`,
  };
}

export function digestMail(to: string, name: string, posts: { title: string; slug: string; author: string; excerpt: string }[]): Mail {
  const items = posts
    .map(
      (p) => `<p style="margin:0 0 18px"><a href="${env.APP_URL}/post/${p.slug}" style="color:#4f46e5;font-weight:600;text-decoration:none">${esc(p.title)}</a><br>
<span style="color:#8a8fa3;font-size:13px">by ${esc(p.author)}</span><br><span style="font-size:14px">${esc(p.excerpt)}</span></p>`
    )
    .join("");
  return {
    to,
    subject: "Your weekly Klyro digest",
    html: layout(`Hi ${name}, here's what's trending this week`, items, { label: "Read more on Klyro", url: env.APP_URL }),
    text: posts.map((p) => `${p.title} — ${env.APP_URL}/post/${p.slug}`).join("\n"),
  };
}
