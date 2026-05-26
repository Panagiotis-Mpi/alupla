type EmailLanguage = "gr" | "en";

type NewUserAccountEmailInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: "super_admin" | "secretariat";
  password: string;
  language?: string;
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
  return readEnv("MAIL_FROM", "BREVO_FROM", "SMTP_FROM", "SMTP_USER", "MAIL_USER");
}

function mailFromName() {
  return readEnv("MAIL_FROM_NAME", "BREVO_FROM_NAME") || "ALUPLA";
}

function appUrl() {
  return readEnv("APP_URL", "FRONTEND_URL", "PUBLIC_APP_URL") || "https://alupla.vercel.app";
}

function normalizedAppUrl() {
  return appUrl().replace(/\/+$/, "");
}

function loginUrl() {
  return `${normalizedAppUrl()}/login`;
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

function normalizeLanguage(value?: string): EmailLanguage {
  const language = String(value || "").toLowerCase();
  return language.startsWith("en") ? "en" : "gr";
}

function accountRoleLabel(role: NewUserAccountEmailInput["role"], language: EmailLanguage) {
  if (language === "en") return role === "super_admin" ? "Administrator" : "Secretariat";
  return role === "super_admin" ? "Διαχειριστής" : "Γραμματεία";
}

function fullName(input: NewUserAccountEmailInput) {
  return `${input.firstName} ${input.lastName}`.trim();
}

function buildText(input: NewUserAccountEmailInput) {
  const language = normalizeLanguage(input.language);
  const name = fullName(input);
  const role = accountRoleLabel(input.role, language);
  const url = loginUrl();

  if (language === "en") {
    return [
      "Your ALUPLA account has been created.",
      "",
      `Name: ${name}`,
      `Login email: ${input.email}`,
      `Role: ${role}`,
      `Temporary password: ${input.password}`,
      "",
      `Platform URL: ${url}`,
      "",
      "Please sign in to the platform and change your password from your profile."
    ].join("\n");
  }

  return [
    "Δημιουργήθηκε λογαριασμός στην πλατφόρμα ALUPLA.",
    "",
    `Όνομα: ${name}`,
    `Email σύνδεσης: ${input.email}`,
    `Ρόλος: ${role}`,
    `Προσωρινός κωδικός: ${input.password}`,
    "",
    `URL πλατφόρμας: ${url}`,
    "",
    "Παρακαλούμε συνδεθείτε στην πλατφόρμα και αλλάξτε τον κωδικό σας από το προφίλ σας."
  ].join("\n");
}

function buildHtml(input: NewUserAccountEmailInput) {
  const language = normalizeLanguage(input.language);
  const name = escapeHtml(fullName(input));
  const email = escapeHtml(input.email);
  const role = escapeHtml(accountRoleLabel(input.role, language));
  const password = escapeHtml(input.password);
  const url = escapeHtml(loginUrl());
  const labels = language === "en"
    ? { intro: "Your ALUPLA account has been created.", name: "Name", email: "Login email", role: "Role", password: "Temporary password", url: "Platform URL", action: "Open ALUPLA", note: "Please sign in to the platform and change your password from your profile." }
    : { intro: "Δημιουργήθηκε λογαριασμός στην πλατφόρμα ALUPLA.", name: "Όνομα", email: "Email σύνδεσης", role: "Ρόλος", password: "Προσωρινός κωδικός", url: "URL πλατφόρμας", action: "Άνοιγμα ALUPLA", note: "Παρακαλούμε συνδεθείτε στην πλατφόρμα και αλλάξτε τον κωδικό σας από το προφίλ σας." };

  return [
    "<div style=\"font-family:Arial,sans-serif;line-height:1.55;color:#1f2937\">",
    "<h2 style=\"color:#1e3a8a;margin:0 0 14px\">ALUPLA</h2>",
    `<p>${labels.intro}</p>`,
    "<table style=\"border-collapse:collapse;margin:14px 0\">",
    `<tr><td style=\"padding:6px 12px 6px 0;font-weight:700\">${labels.name}</td><td style=\"padding:6px 0\">${name}</td></tr>`,
    `<tr><td style=\"padding:6px 12px 6px 0;font-weight:700\">${labels.email}</td><td style=\"padding:6px 0\">${email}</td></tr>`,
    `<tr><td style=\"padding:6px 12px 6px 0;font-weight:700\">${labels.role}</td><td style=\"padding:6px 0\">${role}</td></tr>`,
    `<tr><td style=\"padding:6px 12px 6px 0;font-weight:700\">${labels.password}</td><td style=\"padding:6px 0\"><strong>${password}</strong></td></tr>`,
    `<tr><td style=\"padding:6px 12px 6px 0;font-weight:700\">${labels.url}</td><td style=\"padding:6px 0\"><a href=\"${url}\">${url}</a></td></tr>`,
    "</table>",
    `<p><a href=\"${url}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:700\">${labels.action}</a></p>`,
    `<p>${labels.note}</p>`,
    "</div>"
  ].join("");
}

async function sendWithBrevo(input: NewUserAccountEmailInput) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": brevoApiKey(),
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { email: mailFrom(), name: mailFromName() },
      to: [{ email: input.email, name: fullName(input) || input.email }],
      subject: normalizeLanguage(input.language) === "en" ? "ALUPLA - Account created" : "ALUPLA - Δημιουργία λογαριασμού",
      textContent: buildText(input),
      htmlContent: buildHtml(input)
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Brevo email failed (${response.status}) ${body}`.trim());
  }

  return true;
}

export async function sendNewUserAccountEmail(input: NewUserAccountEmailInput) {
  if (!isMailConfigured()) return false;
  return sendWithBrevo(input);
}
