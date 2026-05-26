import tls from "tls";
import { env } from "../config/env";

type NewUserAccountEmailInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: "super_admin" | "secretariat";
  password: string;
};

type SmtpReply = {
  code: number;
  message: string;
};

const DEFAULT_SMTP_HOST = "smtp.gmail.com";
const DEFAULT_SMTP_PORT = 465;

function smtpHost() {
  return process.env.SMTP_HOST ?? process.env.MAIL_HOST ?? DEFAULT_SMTP_HOST;
}

function smtpPort() {
  const value = Number(process.env.SMTP_PORT ?? process.env.MAIL_PORT ?? DEFAULT_SMTP_PORT);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SMTP_PORT;
}

function smtpSecure() {
  const value = String(process.env.SMTP_SECURE ?? process.env.MAIL_SECURE ?? "true").toLowerCase();
  return value !== "false";
}

function accountRoleLabel(role: NewUserAccountEmailInput["role"]) {
  return role === "super_admin" ? "Διαχειριστής / Administrator" : "Γραμματεία / Secretariat";
}

function fullName(input: NewUserAccountEmailInput) {
  return `${input.firstName} ${input.lastName}`.trim();
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeSmtpLine(value: string) {
  return value.replace(/^\./gm, "..");
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

function buildMessage(input: NewUserAccountEmailInput) {
  const from = env.mail.from || env.mail.user;
  const subject = "ALUPLA - Δημιουργία λογαριασμού";
  const boundary = `alupla-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const text = buildText(input);
  const html = buildHtml(input);
  return [
    `From: ${from}`,
    `To: ${input.email}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
    ""
  ].join("\r\n");
}

function isMailConfigured() {
  return Boolean((env.mail.user || env.mail.gmailUser) && env.mail.pass && (env.mail.from || env.mail.user || env.mail.gmailUser));
}

function waitForReply(socket: tls.TLSSocket, expected: number | number[]) {
  const expectedCodes = Array.isArray(expected) ? expected : [expected];
  return new Promise<SmtpReply>((resolve, reject) => {
    let buffer = "";
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onClose = () => {
      cleanup();
      reject(new Error("SMTP connection closed"));
    };
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return;
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/^(\d{3})([ -])/);
      if (!match || match[2] === "-") return;
      const code = Number(match[1]);
      cleanup();
      if (expectedCodes.includes(code)) {
        resolve({ code, message: buffer });
      } else {
        reject(new Error(buffer.trim() || `SMTP error ${code}`));
      }
    };
    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });
}

async function writeCommand(socket: tls.TLSSocket, command: string, expected: number | number[]) {
  socket.write(`${command}\r\n`);
  return waitForReply(socket, expected);
}

async function sendViaSmtp(to: string, message: string) {
  const user = env.mail.gmailUser || env.mail.user;
  const pass = env.mail.pass;
  const from = env.mail.from || user;
  const socket = tls.connect({ host: smtpHost(), port: smtpPort(), servername: smtpHost(), rejectUnauthorized: smtpSecure() });

  await waitForReply(socket, 220);
  await writeCommand(socket, "EHLO alupla.local", 250);
  await writeCommand(socket, `AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`, "utf8").toString("base64")}`, 235);
  await writeCommand(socket, `MAIL FROM:<${from}>`, 250);
  await writeCommand(socket, `RCPT TO:<${to}>`, [250, 251]);
  await writeCommand(socket, "DATA", 354);
  await writeCommand(socket, `${escapeSmtpLine(message)}\r\n.`, 250);
  await writeCommand(socket, "QUIT", 221).catch(() => undefined);
  socket.end();
}

export async function sendNewUserAccountEmail(input: NewUserAccountEmailInput) {
  if (!isMailConfigured()) return false;
  const message = buildMessage(input);
  await sendViaSmtp(input.email, message);
  return true;
}
