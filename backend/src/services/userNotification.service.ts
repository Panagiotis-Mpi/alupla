import nodemailer from "nodemailer";

const DEFAULT_SMTP_HOST = "smtp.gmail.com";
const DEFAULT_SMTP_PORT = 465;

type NewUserAccountEmailInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: "super_admin" | "secretariat";
  password: string;
};

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function smtpHost() {
  return readEnv("SMTP_HOST", "MAIL_HOST") || DEFAULT_SMTP_HOST;
}

function smtpPort() {
  const value = Number(readEnv("SMTP_PORT", "MAIL_PORT") || DEFAULT_SMTP_PORT);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SMTP_PORT;
}

function smtpSecure() {
  const value = (readEnv("SMTP_SECURE", "MAIL_SECURE") || "true").toLowerCase();
  return value !== "false";
}

function smtpUser() {
  return readEnv("GMAIL_USER", "SMTP_USER", "MAIL_USER");
}

function smtpPass() {
  return readEnv("SMTP_PASS", "MAIL_PASS").replace(/\s+/g, "");
}

function mailFrom() {
  return readEnv("MAIL_FROM", "SMTP_FROM", "GMAIL_USER", "SMTP_USER", "MAIL_USER");
}

function isMailConfigured() {
  return Boolean(smtpUser() && smtpPass() && mailFrom());
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function accountRoleLabel(role: NewUserAccountEmailInput["role"]) {
  return role === "super_admin" ? "Διαχειριστής / Administrator" : "Γραμματεία / Secretariat";
}

function fullName(input: NewUserAccountEmailInput) {
  return `${input.firstName} ${input.lastName}`.trim();
}

function buildText(input: NewUserAccountEmailInput) {
  const name = fullName(input);
  const role = accountRoleLabel(input.role);
  return [
    "Δημιουργήθηκε λογαριασμός στην πλατφόρμα ALUPLA.",
    "",
    `Όνομα: ${name}`,
    `Email σύνδεσης: ${input.email}`,
    `Ρόλος: ${role}`,
    `Προσωρινός κωδικός: ${input.password}`,
    "",
    "Παρακαλούμε συνδεθείτε στην πλατφόρμα και αλλάξτε τον κωδικό σας από το προφίλ σας.",
    "",
    "Your ALUPLA account has been created.",
    "",
    `Name: ${name}`,
    `Login email: ${input.email}`,
    `Role: ${role}`,
    `Temporary password: ${input.password}`,
    "",
    "Please sign in to the platform and change your password from your profile."
  ].join("\n");
}

function buildHtml(input: NewUserAccountEmailInput) {
  const name = escapeHtml(fullName(input));
  const email = escapeHtml(input.email);
  const role = escapeHtml(accountRoleLabel(input.role));
  const password = escapeHtml(input.password);
  return [
    "<div style=\"font-family:Arial,sans-serif;line-height:1.55;color:#1f2937\">",
    "<h2 style=\"color:#1e3a8a;margin:0 0 14px\">ALUPLA</h2>",
    "<p>Δημιουργήθηκε λογαριασμός στην πλατφόρμα ALUPLA.</p>",
    "<table style=\"border-collapse:collapse;margin:14px 0\">",
    `<tr><td style=\"padding:6px 12px 6px 0;font-weight:700\">Όνομα</td><td style=\"padding:6px 0\">${name}</td></tr>`,
    `<tr><td style=\"padding:6px 12px 6px 0;font-weight:700\">Email σύνδεσης</td><td style=\"padding:6px 0\">${email}</td></tr>`,
    `<tr><td style=\"padding:6px 12px 6px 0;font-weight:700\">Ρόλος</td><td style=\"padding:6px 0\">${role}</td></tr>`,
    `<tr><td style=\"padding:6px 12px 6px 0;font-weight:700\">Προσωρινός κωδικός</td><td style=\"padding:6px 0\"><strong>${password}</strong></td></tr>`,
    "</table>",
    "<p>Παρακαλούμε συνδεθείτε στην πλατφόρμα και αλλάξτε τον κωδικό σας από το προφίλ σας.</p>",
    "<hr style=\"border:none;border-top:1px solid #dbeafe;margin:18px 0\" />",
    "<p>Your ALUPLA account has been created. Please sign in to the platform and change your password from your profile.</p>",
    "</div>"
  ].join("");
}

export async function sendNewUserAccountEmail(input: NewUserAccountEmailInput) {
  if (!isMailConfigured()) return false;

  const transporter = nodemailer.createTransport({
    host: smtpHost(),
    port: smtpPort(),
    secure: smtpSecure(),
    auth: {
      user: smtpUser(),
      pass: smtpPass()
    }
  });

  await transporter.sendMail({
    from: mailFrom(),
    to: input.email,
    subject: "ALUPLA - Δημιουργία λογαριασμού",
    text: buildText(input),
    html: buildHtml(input)
  });

  return true;
}
