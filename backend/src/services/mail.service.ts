import tls from "tls";
import { env } from "../config/env";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${toBase64(value)}?=`;
}

function encodeAddress(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  if (!match) {
    return trimmed;
  }
  const name = match[1].trim().replace(/^"|"$/g, "");
  const email = match[2].trim();
  return name ? `${encodeHeader(name)} <${email}>` : `<${email}>`;
}

function buildMessage(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const boundary = `alupla-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return [
    `From: ${encodeAddress(input.from)}`,
    `To: ${encodeAddress(input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@alupla.local>`,
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    toBase64(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    toBase64(input.html),
    `--${boundary}--`,
    ""
  ].join("\r\n");
}

function getEnvelopeAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

function waitForLine(socket: tls.TLSSocket, carry: { value: string }) {
  return new Promise<string>((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      carry.value += chunk.toString("utf8");
      while (true) {
        const lineBreak = carry.value.indexOf("\r\n");
        if (lineBreak === -1) {
          return;
        }
        const line = carry.value.slice(0, lineBreak);
        carry.value = carry.value.slice(lineBreak + 2);
        const code = line.slice(0, 3);
        const separator = line[3];
        if (/^\d{3}$/.test(code) && separator !== "-") {
          cleanup();
          resolve(line);
          return;
        }
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error("SMTP connection closed"));
    };

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

async function expectCode(socket: tls.TLSSocket, carry: { value: string }, expected: number[]) {
  const line = await waitForLine(socket, carry);
  const code = Number(line.slice(0, 3));
  if (!expected.includes(code)) {
    throw new Error(`SMTP error ${line}`);
  }
}

async function sendCommand(socket: tls.TLSSocket, carry: { value: string }, command: string, expected: number[]) {
  socket.write(`${command}\r\n`);
  await expectCode(socket, carry, expected);
}

async function connectSmtp() {
  return await new Promise<tls.TLSSocket>((resolve, reject) => {
    const socket = tls.connect({
      host: "smtp.gmail.com",
      port: 465,
      servername: "smtp.gmail.com"
    });

    socket.once("secureConnect", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function sendMail(input: { from: string; to: string; subject: string; text: string; html: string }) {
  const user = env.mail.user.trim();
  const pass = env.mail.pass.trim();
  const from = (input.from || user).trim();

  if (!user || !pass || !from) {
    throw new Error("Email service is not configured");
  }

  const socket = await connectSmtp();
  const carry = { value: "" };

  try {
    await expectCode(socket, carry, [220]);
    await sendCommand(socket, carry, "EHLO alupla.local", [250]);
    await sendCommand(socket, carry, "AUTH LOGIN", [334]);
    await sendCommand(socket, carry, Buffer.from(user, "utf8").toString("base64"), [334]);
    await sendCommand(socket, carry, Buffer.from(pass, "utf8").toString("base64"), [235]);
    await sendCommand(socket, carry, `MAIL FROM:<${getEnvelopeAddress(from)}>`, [250]);
    await sendCommand(socket, carry, `RCPT TO:<${getEnvelopeAddress(input.to)}>`, [250, 251]);
    await sendCommand(socket, carry, "DATA", [354]);
    socket.write(`${buildMessage({ ...input, from })}\r\n.\r\n`);
    await expectCode(socket, carry, [250]);
    await sendCommand(socket, carry, "QUIT", [221]);
  } finally {
    socket.end();
  }
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
    from: env.mail.from,
    to: input.to,
    subject,
    text,
    html
  });
}
