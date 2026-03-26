import { env } from "../config/env";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function readResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function sendVerificationEmail(input: {
  to: string;
  firstName?: string | null;
  verificationUrl: string;
  expiresInMinutes: number;
}) {
  if (!env.mail.apiKey || !env.mail.from) {
    throw new Error("Email service is not configured");
  }

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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.mail.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.mail.from,
      to: [input.to],
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    const detail = await readResponseText(response);
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`Email delivery failed${suffix}`);
  }
}
