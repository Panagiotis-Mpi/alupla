type EmailLanguage = "gr" | "en";

type NewUserAccountEmailInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: "super_admin" | "secretariat";
  password: string;
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

function loginUrl() {
  return `${normalizedFrontendUrl()}/login`;
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

function accountRoleLabel(role: NewUserAccountEmailInput["role"], language: EmailLanguage) {
  if (language === "en") return role === "super_admin" ? "Administrator" : "Secretariat";
  return role === "super_admin" ? "Διαχειριστής" : "Γραμματεία";
}

function bilingualRoleLabel(role: NewUserAccountEmailInput["role"]) {
  return `${accountRoleLabel(role, "gr")} / ${accountRoleLabel(role, "en")}`;
}

function fullName(input: { firstName?: string; lastName?: string; email: string }) {
  return `${String(input.firstName ?? "").trim()} ${String(input.lastName ?? "").trim()}`.trim() || input.email;
}

function buildText(input: NewUserAccountEmailInput) {
  const name = fullName(input);
  const role = bilingualRoleLabel(input.role);

  return [
    "Δημιουργήθηκε λογαριασμός στην πλατφόρμα ALUPLA.",
    "Your ALUPLA account has been created.",
    "",
    `Ονοματεπώνυμο / Full name: ${name}`,
    `Email σύνδεσης / Login email: ${input.email}`,
    `Ρόλος / Role: ${role}`,
    `Προσωρινός κωδικός / Temporary password: ${input.password}`,
    "",
    "Παρακαλούμε συνδεθείτε στην πλατφόρμα και αλλάξτε τον κωδικό σας από το προφίλ σας.",
    "Please sign in to the platform and change your password from your profile."
  ].join("\n");
}

function buildHtml(input: NewUserAccountEmailInput) {
  const name = escapeHtml(fullName(input));
  const email = escapeHtml(input.email);
  const role = escapeHtml(bilingualRoleLabel(input.role));
  const password = escapeHtml(input.password);
  const url = escapeHtml(loginUrl());

  return [
    "<div style=\"font-family:Arial,sans-serif;line-height:1.55;color:#1f2937\">",
    "<h2 style=\"color:#1e3a8a;margin:0 0 14px\">ALUPLA</h2>",
    "<p style=\"margin:0 0 6px\">Δημιουργήθηκε λογαριασμός στην πλατφόρμα ALUPLA.</p>",
    "<p style=\"margin:0 0 14px\">Your ALUPLA account has been created.</p>",
    "<table style=\"border-collapse:collapse;margin:14px 0\">",
    `<tr><td style=\"padding:6px 18px 6px 0;font-weight:700\">Ονοματεπώνυμο / Full name</td><td style=\"padding:6px 0\">${name}</td></tr>`,
    `<tr><td style=\"padding:6px 18px 6px 0;font-weight:700\">Email σύνδεσης / Login email</td><td style=\"padding:6px 0\">${email}</td></tr>`,
    `<tr><td style=\"padding:6px 18px 6px 0;font-weight:700\">Ρόλος / Role</td><td style=\"padding:6px 0\">${role}</td></tr>`,
    `<tr><td style=\"padding:6px 18px 6px 0;font-weight:700\">Προσωρινός κωδικός / Temporary password</td><td style=\"padding:6px 0\"><strong>${password}</strong></td></tr>`,
    "</table>",
    `<p style=\"margin:18px 0 14px\"><a href=\"${url}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:700\">Άνοιγμα ALUPLA / Open ALUPLA</a></p>`,
    "<p style=\"margin:0 0 6px\">Παρακαλούμε συνδεθείτε στην πλατφόρμα και αλλάξτε τον κωδικό σας από το προφίλ σας.</p>",
    "<p style=\"margin:0\">Please sign in to the platform and change your password from your profile.</p>",
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

async function sendWithBrevo(input: NewUserAccountEmailInput) {
  return sendBrevoEmail({
    to: input.email,
    toName: fullName(input),
    subject: "ALUPLA - Δημιουργία λογαριασμού / Account created",
    textContent: buildText(input),
    htmlContent: buildHtml(input)
  });
}

async function sendPasswordResetWithBrevo(input: PasswordResetEmailInput) {
  return sendBrevoEmail({
    to: input.email,
    toName: fullName(input),
    subject: "ALUPLA - Αλλαγή κωδικού / Password reset",
    textContent: buildPasswordResetText(input),
    htmlContent: buildPasswordResetHtml(input)
  });
}

export async function sendNewUserAccountEmail(input: NewUserAccountEmailInput) {
  if (!isMailConfigured()) return false;
  return sendWithBrevo(input);
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  if (!isMailConfigured()) return false;
  return sendPasswordResetWithBrevo(input);
}
