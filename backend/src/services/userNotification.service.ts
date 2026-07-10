type NewUserAccountEmailInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: "super_admin" | "secretariat";
  setupUrl: string;
  language?: string;
};

type PasswordResetEmailInput = {
  firstName?: string;
  lastName?: string;
  email: string;
  resetUrl: string;
  language?: string;
};

type EmailPayload = {
  to: string;
  toName?: string;
  subject: string;
  textContent: string;
  htmlContent: string;
};

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function brevoApiKey() {
  return readEnv("BREVO_API_KEY", "SENDINBLUE_API_KEY");
}

function mailFrom() {
  return readEnv("MAIL_FROM", "BREVO_FROM", "BREVO_FROM_EMAIL", "SMTP_FROM", "SMTP_USER", "MAIL_USER", "EMAIL_FROM", "EMAIL_USER") || "alupla.platform@gmail.com";
}

function mailFromName() {
  return readEnv("MAIL_FROM_NAME", "BREVO_FROM_NAME", "BREVO_SENDER_NAME") || "ALUPLA";
}

function frontendUrl() {
  return readEnv("FRONTEND_URL", "PUBLIC_APP_URL", "CLIENT_URL", "VITE_APP_URL", "APP_URL") || "https://alupla.vercel.app";
}

function normalizedFrontendUrl() {
  return frontendUrl().replace(/\/+$/, "");
}

export function passwordResetUrl(token: string) {
  return `${normalizedFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

function isMailConfigured() {
  return Boolean(brevoApiKey() && mailFrom());
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function accountRoleLabel(role: NewUserAccountEmailInput["role"], language: "gr" | "en") {
  if (language === "en") return role === "super_admin" ? "Administrator" : "Secretariat";
  return role === "super_admin" ? "Διαχειριστής" : "Γραμματεία";
}

function bilingualRoleLabel(role: NewUserAccountEmailInput["role"]) {
  return `${accountRoleLabel(role, "gr")} / ${accountRoleLabel(role, "en")}`;
}

function fullName(input: { firstName?: string; lastName?: string; email: string }) {
  return `${String(input.firstName ?? "").trim()} ${String(input.lastName ?? "").trim()}`.trim() || input.email;
}

function buildInvitationText(input: NewUserAccountEmailInput) {
  const name = fullName(input);
  const role = bilingualRoleLabel(input.role);

  return [
    "Δημιουργήθηκε λογαριασμός στην πλατφόρμα ALUPLA.",
    "Your ALUPLA account has been created.",
    "",
    `Ονοματεπώνυμο / Full name: ${name}`,
    `Email σύνδεσης / Login email: ${input.email}`,
    `Ρόλος / Role: ${role}`,
    "",
    "Πατήστε τον παρακάτω σύνδεσμο για να ορίσετε τον προσωπικό σας κωδικό:",
    "Use the link below to set your personal password:",
    input.setupUrl,
    "",
    "Ο σύνδεσμος χρησιμοποιείται μία φορά και ισχύει για 24 ώρες.",
    "The link can be used once and is valid for 24 hours."
  ].join("\n");
}

function buildInvitationHtml(input: NewUserAccountEmailInput) {
  const name = escapeHtml(fullName(input));
  const email = escapeHtml(input.email);
  const role = escapeHtml(bilingualRoleLabel(input.role));
  const url = escapeHtml(input.setupUrl);

  return [
    "<div style=\"font-family:Arial,sans-serif;line-height:1.55;color:#1f2937\">",
    "<h2 style=\"color:#1e3a8a;margin:0 0 14px\">ALUPLA</h2>",
    "<p style=\"margin:0 0 6px\">Δημιουργήθηκε λογαριασμός στην πλατφόρμα ALUPLA.</p>",
    "<p style=\"margin:0 0 14px\">Your ALUPLA account has been created.</p>",
    "<table style=\"border-collapse:collapse;margin:14px 0\">",
    `<tr><td style=\"padding:6px 18px 6px 0;font-weight:700\">Ονοματεπώνυμο / Full name</td><td style=\"padding:6px 0\">${name}</td></tr>`,
    `<tr><td style=\"padding:6px 18px 6px 0;font-weight:700\">Email σύνδεσης / Login email</td><td style=\"padding:6px 0\">${email}</td></tr>`,
    `<tr><td style=\"padding:6px 18px 6px 0;font-weight:700\">Ρόλος / Role</td><td style=\"padding:6px 0\">${role}</td></tr>`,
    "</table>",
    `<p style=\"margin:18px 0 14px\"><a href=\"${url}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700\">Ορισμός κωδικού / Set password</a></p>`,
    "<p style=\"margin:0 0 6px\">Ο σύνδεσμος χρησιμοποιείται μία φορά και ισχύει για 24 ώρες.</p>",
    "<p style=\"margin:0\">The link can be used once and is valid for 24 hours.</p>",
    "</div>"
  ].join("");
}

function buildPasswordResetText(input: PasswordResetEmailInput) {
  return [
    "Ζητήθηκε αλλαγή κωδικού για τον λογαριασμό σας στην πλατφόρμα ALUPLA.",
    "A password reset was requested for your ALUPLA account.",
    "",
    "Πατήστε τον παρακάτω σύνδεσμο για να ορίσετε νέο κωδικό:",
    "Use the link below to set a new password:",
    input.resetUrl,
    "",
    "Ο σύνδεσμος ισχύει για 1 ώρα.",
    "The link is valid for 1 hour.",
    "",
    "Αν δεν ζητήσατε εσείς αυτήν την αλλαγή, αγνοήστε αυτό το email.",
    "If you did not request this change, ignore this email."
  ].join("\n");
}

function buildPasswordResetHtml(input: PasswordResetEmailInput) {
  const url = escapeHtml(input.resetUrl);
  const email = escapeHtml(input.email);
  const name = escapeHtml(fullName(input));

  return [
    "<div style=\"font-family:Arial,sans-serif;line-height:1.55;color:#1f2937\">",
    "<h2 style=\"color:#1e3a8a;margin:0 0 14px\">ALUPLA</h2>",
    "<p style=\"margin:0 0 6px\">Ζητήθηκε αλλαγή κωδικού για τον λογαριασμό σας στην πλατφόρμα ALUPLA.</p>",
    "<p style=\"margin:0 0 14px\">A password reset was requested for your ALUPLA account.</p>",
    "<table style=\"border-collapse:collapse;margin:14px 0\">",
    `<tr><td style=\"padding:6px 18px 6px 0;font-weight:700\">Ονοματεπώνυμο / Full name</td><td style=\"padding:6px 0\">${name}</td></tr>`,
    `<tr><td style=\"padding:6px 18px 6px 0;font-weight:700\">Email λογαριασμού / Account email</td><td style=\"padding:6px 0\">${email}</td></tr>`,
    "</table>",
    `<p style=\"margin:18px 0 14px\"><a href=\"${url}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700\">Αλλαγή κωδικού / Reset password</a></p>`,
    "<p style=\"margin:0 0 6px\">Ο σύνδεσμος ισχύει για 1 ώρα.</p>",
    "<p style=\"margin:0 0 14px\">The link is valid for 1 hour.</p>",
    "<p style=\"margin:0 0 6px\">Αν δεν ζητήσατε εσείς αυτήν την αλλαγή, αγνοήστε αυτό το email.</p>",
    "<p style=\"margin:0\">If you did not request this change, ignore this email.</p>",
    "</div>"
  ].join("");
}

async function sendBrevoEmail(payload: EmailPayload) {
  const senderEmail = mailFrom();
  const body: Record<string, unknown> = {
    sender: { email: senderEmail, name: mailFromName() },
    to: [payload.toName ? { email: payload.to, name: payload.toName } : { email: payload.to }],
    subject: payload.subject,
    textContent: payload.textContent,
    htmlContent: payload.htmlContent
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": brevoApiKey(),
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new Error(`Brevo email failed (${response.status}) ${responseBody}`.trim());
  }

  return true;
}

export async function sendNewUserAccountEmail(input: NewUserAccountEmailInput) {
  if (!isMailConfigured()) return false;
  return sendBrevoEmail({
    to: input.email,
    toName: fullName(input),
    subject: "ALUPLA - Πρόσκληση λογαριασμού / Account invitation",
    textContent: buildInvitationText(input),
    htmlContent: buildInvitationHtml(input)
  });
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  if (!isMailConfigured()) return false;
  return sendBrevoEmail({
    to: input.email,
    toName: fullName(input),
    subject: "ALUPLA - Αλλαγή κωδικού / Password reset",
    textContent: buildPasswordResetText(input),
    htmlContent: buildPasswordResetHtml(input)
  });
}
