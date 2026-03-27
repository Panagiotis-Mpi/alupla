import net from "net";
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

function toBase64Url(value: string) {
  return toBase64(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${toBase64(value)}?=`;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractEmailAddress(value: string) {
  const trimmed = normalizeWhitespace(value);
  const angleMatch = trimmed.match(/<([^>]+)>/);
  const candidate = (angleMatch ? angleMatch[1] : trimmed).trim();
  return candidate.replace(/^mailto:/i, "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function encodeAddress(value: string) {
  const trimmed = normalizeWhitespace(value);
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  if (!match) {
    return trimmed;
  }
  const name = match[1].trim().replace(/^"|"$/g, "");
  const email = match[2].trim();
  return name ? `${encodeHeader(name)} <${email}>` : `<${email}>`;
}

function buildFromAddress(value: string, fallbackEmail: string) {
  const trimmed = normalizeWhitespace(value);
  const fallback = normalizeWhitespace(fallbackEmail);
  const candidateEmail = extractEmailAddress(trimmed);
  if (!isValidEmail(candidateEmail)) {
    return fallback;
  }
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  if (!match) {
    return candidateEmail;
  }
  const name = match[1].trim().replace(/^"|"$/g, "");
  return name ? `${name} <${candidateEmail}>` : candidateEmail;
}

function buildMessage(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const boundary = `alupla-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const messageIdDomain = extractEmailAddress(input.from).split("@")[1] || "alupla.local";

  return [
    `From: ${encodeAddress(input.from)}`,
    `To: ${encodeAddress(input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${messageIdDomain}>`,
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

function waitForResponse(socket: net.Socket | tls.TLSSocket, carry: { value: string }) {
  return new Promise<string>((resolve, reject) => {
    const lines: string[] = [];

    const onData = (chunk: Buffer) => {
      carry.value += chunk.toString("utf8");

      while (true) {
        const lineBreak = carry.value.indexOf("\r\n");
        if (lineBreak === -1) {
          return;
        }

        const line = carry.value.slice(0, lineBreak);
        carry.value = carry.value.slice(lineBreak + 2);

        if (!line) {
          continue;
        }

        lines.push(line);
        const code = line.slice(0, 3);
        const separator = line[3];

        if (/^\d{3}$/.test(code) && separator !== "-") {
          cleanup();
          resolve(lines.join("\n"));
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

    const onTimeout = () => {
      cleanup();
      reject(new Error("SMTP connection timeout"));
    };

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
      socket.off("timeout", onTimeout);
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
    socket.once("timeout", onTimeout);

    if (carry.value.includes("\r\n")) {
      onData(Buffer.alloc(0));
    }
  });
}

async function expectCode(socket: net.Socket | tls.TLSSocket, carry: { value: string }, expected: number[]) {
  const response = await waitForResponse(socket, carry);
  const firstLine = response.split("\n")[0] ?? "";
  const code = Number(firstLine.slice(0, 3));

  if (!expected.includes(code)) {
    throw new Error(`SMTP error ${response}`);
  }

  return response;
}

async function sendCommand(socket: net.Socket | tls.TLSSocket, carry: { value: string }, command: string, expected: number[]) {
  socket.write(`${command}\r\n`);
  return await expectCode(socket, carry, expected);
}

function getSocketName() {
  const raw = process.env.RENDER_EXTERNAL_HOSTNAME || process.env.RENDER_SERVICE_NAME || "alupla.app";
  return raw.replace(/[^a-zA-Z0-9.-]/g, "") || "alupla.app";
}

function openTlsConnection(host: string, port: number) {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: true
    });

    socket.setTimeout(20000);
    socket.once("secureConnect", () => resolve(socket));
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error(`SMTP timeout ${host}:${port}`)));
  });
}

function openPlainConnection(host: string, port: number) {
  return new Promise<net.Socket>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(20000);
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error(`SMTP timeout ${host}:${port}`)));
  });
}

async function upgradeToTls(socket: net.Socket, host: string) {
  return await new Promise<tls.TLSSocket>((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: host,
      rejectUnauthorized: true
    });

    secureSocket.setTimeout(20000);
    secureSocket.once("secureConnect", () => resolve(secureSocket));
    secureSocket.once("error", reject);
    secureSocket.once("timeout", () => reject(new Error(`SMTP STARTTLS timeout ${host}`)));
  });
}

async function sendViaImplicitTls(input: { host: string; port: number; user: string; pass: string; from: string; to: string; subject: string; text: string; html: string; }) {
  const socket = await openTlsConnection(input.host, input.port);
  const carry = { value: "" };

  try {
    await expectCode(socket, carry, [220]);
    await sendCommand(socket, carry, `EHLO ${getSocketName()}`, [250]);
    await sendCommand(socket, carry, "AUTH LOGIN", [334]);
    await sendCommand(socket, carry, Buffer.from(input.user, "utf8").toString("base64"), [334]);
    await sendCommand(socket, carry, Buffer.from(input.pass, "utf8").toString("base64"), [235]);
    await sendCommand(socket, carry, `MAIL FROM:<${extractEmailAddress(input.from)}>`, [250]);
    await sendCommand(socket, carry, `RCPT TO:<${extractEmailAddress(input.to)}>`, [250, 251]);
    await sendCommand(socket, carry, "DATA", [354]);
    socket.write(`${buildMessage(input)}\r\n.\r\n`);
    await expectCode(socket, carry, [250]);
    await sendCommand(socket, carry, "QUIT", [221]);
  } finally {
    socket.end();
  }
}

async function sendViaStartTls(input: { host: string; port: number; user: string; pass: string; from: string; to: string; subject: string; text: string; html: string; }) {
  const plainSocket = await openPlainConnection(input.host, input.port);
  let socket: net.Socket | tls.TLSSocket = plainSocket;
  let carry = { value: "" };

  try {
    await expectCode(socket, carry, [220]);
    await sendCommand(socket, carry, `EHLO ${getSocketName()}`, [250]);
    await sendCommand(socket, carry, "STARTTLS", [220]);

    socket = await upgradeToTls(plainSocket, input.host);
    carry = { value: "" };

    await sendCommand(socket, carry, `EHLO ${getSocketName()}`, [250]);
    await sendCommand(socket, carry, "AUTH LOGIN", [334]);
    await sendCommand(socket, carry, Buffer.from(input.user, "utf8").toString("base64"), [334]);
    await sendCommand(socket, carry, Buffer.from(input.pass, "utf8").toString("base64"), [235]);
    await sendCommand(socket, carry, `MAIL FROM:<${extractEmailAddress(input.from)}>`, [250]);
    await sendCommand(socket, carry, `RCPT TO:<${extractEmailAddress(input.to)}>`, [250, 251]);
    await sendCommand(socket, carry, "DATA", [354]);
    socket.write(`${buildMessage(input)}\r\n.\r\n`);
    await expectCode(socket, carry, [250]);
    await sendCommand(socket, carry, "QUIT", [221]);
  } finally {
    socket.end();
  }
}

function hasGmailApiConfig() {
  return Boolean(
    env.mail.gmailClientId.trim() &&
      env.mail.gmailClientSecret.trim() &&
      env.mail.gmailRefreshToken.trim() &&
      extractEmailAddress(env.mail.gmailUser)
  );
}

async function fetchJson(url: string, init: RequestInit, label: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = data?.error_description || data?.error?.message || text || `${label} failed`;
      throw new Error(`${label} ${response.status} ${message}`);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function getGmailAccessToken() {
  const body = new URLSearchParams({
    client_id: env.mail.gmailClientId.trim(),
    client_secret: env.mail.gmailClientSecret.trim(),
    refresh_token: env.mail.gmailRefreshToken.trim(),
    grant_type: "refresh_token"
  });

  const data = await fetchJson(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    },
    "Gmail token"
  );

  const accessToken = String(data?.access_token ?? "").trim();
  if (!accessToken) {
    throw new Error("Gmail token response did not include access_token");
  }

  return accessToken;
}

async function sendViaGmailApi(input: { from: string; to: string; subject: string; text: string; html: string }) {
  const gmailUser = extractEmailAddress(env.mail.gmailUser || env.mail.user);
  if (!isValidEmail(gmailUser)) {
    throw new Error("Gmail API sender email is invalid");
  }

  const accessToken = await getGmailAccessToken();
  const raw = toBase64Url(buildMessage(input));

  await fetchJson(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(gmailUser)}/messages/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw })
    },
    "Gmail send"
  );
}

async function sendMail(input: { from: string; to: string; subject: string; text: string; html: string }) {
  const user = extractEmailAddress(env.mail.user);
  const pass = env.mail.pass.trim();
  const recipient = extractEmailAddress(input.to);

  if (!isValidEmail(recipient)) {
    throw new Error("Recipient email is invalid");
  }

  const senderBase = hasGmailApiConfig() ? extractEmailAddress(env.mail.gmailUser || env.mail.user) : user;
  const from = buildFromAddress(input.from || senderBase, senderBase);
  const envelopeFrom = extractEmailAddress(from);

  if (!isValidEmail(envelopeFrom)) {
    throw new Error("Sender email is invalid");
  }

  if (hasGmailApiConfig()) {
    await sendViaGmailApi({ ...input, from, to: recipient });
    return;
  }

  if (!isValidEmail(user) || !pass) {
    throw new Error("Email service is not configured");
  }

  const attempts = [
    { kind: "tls" as const, host: process.env.SMTP_HOST || "smtp.gmail.com", port: Number(process.env.SMTP_PORT || 465) },
    { kind: "starttls" as const, host: process.env.SMTP_HOST || "smtp.gmail.com", port: 587 }
  ];

  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      if (attempt.kind === "tls") {
        await sendViaImplicitTls({ ...input, from, to: recipient, user, pass, host: attempt.host, port: attempt.port });
      } else {
        await sendViaStartTls({ ...input, from, to: recipient, user, pass, host: attempt.host, port: attempt.port });
      }
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${attempt.kind}:${attempt.host}:${attempt.port} ${message}`);
    }
  }

  throw new Error(errors.join(" | "));
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
