import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.mail.host,
  port: env.mail.port,
  secure: env.mail.secure,
  auth: {
    user: env.mail.user,
    pass: env.mail.pass
  }
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  await transporter.sendMail({
    from: env.mail.from,
    to: input.to,
    subject,
    text,
    html
  });
}
