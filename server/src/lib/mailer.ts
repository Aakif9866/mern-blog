import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = env.mailEnabled
      ? nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
        })
      : nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Sent mail in tests, so specs can read verification links. */
export const sentMail: Mail[] = [];

export async function sendMail(mail: Mail): Promise<void> {
  if (env.isTest) {
    sentMail.push(mail);
    return;
  }
  await getTransporter().sendMail({ from: env.MAIL_FROM, ...mail });
  if (!env.mailEnabled) {
    // No SMTP configured: print the mail so links can be used in development.
    logger.info({ to: mail.to, subject: mail.subject, text: mail.text }, "Email (SMTP not configured)");
  }
}
