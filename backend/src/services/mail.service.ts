import nodemailer from "nodemailer";
import { env } from "../config/env";

function hasBasicSmtpConfig() {
  return Boolean(env.mail.user && env.mail.pass);
}

function hasGmailOAuthConfig() {
  return Boolean(
    env.mail.gmailUser &&
    env.mail.gmailClientId &&
    env.mail.gmailClientSecret &&
    env.mail.gmailRefreshToken
  );
}

function createTransport() {
  if (hasGmailOAuthConfig()) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: env.mail.gmailUser,
        clientId: env.mail.gmailClientId,
        clientSecret: env.mail.gmailClientSecret,
        refreshToken: env.mail.gmailRefreshToken
      }
    });
  }

  if (hasBasicSmtpConfig()) {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT ?? 465);
    const secure = String(process.env.SMTP_SECURE ?? (port === 465 ? "true" : "false")).toLowerCase() === "true";

    if (host) {
      return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: env.mail.user,
          pass: env.mail.pass
        }
      });
    }

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.mail.user,
        pass: env.mail.pass
      }
    });
  }

  throw new Error("Mail service is not configured");
}

function buildResetHtml(resetUrl: string) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 16px;color:#1d4ed8">ALUPLA</h2>
      <p>Ζητήθηκε επαναφορά κωδικού πρόσβασης για τον λογαριασμό σας.</p>
      <p>Πατήστε στο παρακάτω κουμπί για να ορίσετε νέο κωδικό:</p>
      <p style="margin:20px 0">
        <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700">Επαναφορά κωδικού</a>
      </p>
      <p>Αν το κουμπί δεν λειτουργεί, ανοίξτε αυτό το link:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p>A password reset was requested for your account.</p>
      <p>Use the button above or open this link:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="font-size:12px;color:#64748b">Ο σύνδεσμος λήγει σε 1 ώρα. / The link expires in 1 hour.</p>
    </div>
  `;
}

function buildResetText(resetUrl: string) {
  return [
    "ALUPLA",
    "",
    "Ζητήθηκε επαναφορά κωδικού πρόσβασης για τον λογαριασμό σας.",
    `Άνοιξε αυτό το link για να ορίσεις νέο κωδικό: ${resetUrl}`,
    "Ο σύνδεσμος λήγει σε 1 ώρα.",
    "",
    "A password reset was requested for your account.",
    `Open this link to set a new password: ${resetUrl}`,
    "The link expires in 1 hour."
  ].join("\n");
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const transporter = createTransport();
  await transporter.sendMail({
    from: env.mail.from,
    to: email,
    subject: "ALUPLA | Επαναφορά κωδικού / Password reset",
    text: buildResetText(resetUrl),
    html: buildResetHtml(resetUrl)
  });
}
