import nodemailer from "nodemailer";
import { env } from "../config/env";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function resolveFromAddress() {
  const from = cleanEmail(env.mail.from);
  const user = cleanEmail(env.mail.user);

  if (isValidEmail(from)) {
    return from;
  }

  if (isValidEmail(user)) {
    return user;
  }

  return "";
}

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const user = cleanEmail(env.mail.user);
      const pass = String(env.mail.pass || "").trim();

      if (!isValidEmail(user) || !pass) {
        throw new Error("Email service is not configured");
      }

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user,
          pass
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
        tls: {
          servername: "smtp.gmail.com"
        }
      });

      await transporter.verify();
      return transporter;
    })().catch((error) => {
      transporterPromise = null;
      throw error;
    });
  }

  return transporterPromise;
}

async function sendMail(input: { from?: string; to: string; subject: string; text: string; html: string }) {
  const to = cleanEmail(input.to);
  const from = resolveFromAddress();

  if (!isValidEmail(to) || !from) {
    throw new Error("Email service is not configured");
  }

  const transporter = await getTransporter();

  await transporter.sendMail({
    from,
    sender: from,
    replyTo: from,
    to,
    subject: input.subject,
    text: input.text,
    html: input.html
  });
}

export async function sendVerificationEmail(input: {
  to: string;
  firstName?: string | null;
  verificationUrl: string;
  expiresInMinutes: number;
}) {
  const greetingName = input.firstName?.trim() || input.to;
  const escapedName = escapeHtml(greetingName);
  const escapedUrl = escapeHtml(input.verificationUrl);
  const subject = "ALUPLA - Επιβεβαίωση email";

  const text = [
    `Γεια σου ${greetingName},`,
    "",
    "Για να ολοκληρώσεις την εγγραφή σου στο ALUPLA, πάτησε τον παρακάτω σύνδεσμο:",
    input.verificationUrl,
    "",
    `Ο σύνδεσμος ισχύει για ${input.expiresInMinutes} λεπτά.`,
    "",
    "Αν δεν έκανες εσύ αυτή την εγγραφή, μπορείς να αγνοήσεις αυτό το email."
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <p>Γεια σου ${escapedName},</p>
      <p>Για να ολοκληρώσεις την εγγραφή σου στο ALUPLA, πάτησε το κουμπί επιβεβαίωσης.</p>
      <p>
        <a href="${escapedUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700">
          Επιβεβαίωση email
        </a>
      </p>
      <p>Ή άνοιξε αυτόν τον σύνδεσμο:</p>
      <p><a href="${escapedUrl}">${escapedUrl}</a></p>
      <p>Ο σύνδεσμος ισχύει για ${input.expiresInMinutes} λεπτά.</p>
      <p>Αν δεν έκανες εσύ αυτή την εγγραφή, μπορείς να αγνοήσεις αυτό το email.</p>
    </div>
  `;

  await sendMail({
    to: input.to,
    subject,
    text,
    html
  });
}
