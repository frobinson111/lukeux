import nodemailer from "nodemailer";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  const transport = buildTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@lukeux.ai";

  if (!transport) {
    // Dev fallback: log the email instead of failing silently.
    console.info(`[dev-email] to=${to} subject="${subject}" html=${html}`);
    return { preview: html };
  }

  await transport.sendMail({
    from,
    to,
    subject,
    html,
    text: html.replace(/<[^>]+>/g, "")
  });

  return { preview: undefined };
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${appUrl}/auth/verify?token=${encodeURIComponent(token)}`;
  const html = `
    <p>Welcome to Luke UX!</p>
    <p>Click the link below to verify your email:</p>
    <p><a href="${url}">${url}</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;
  return sendEmail(email, "Verify your email for Luke UX", html);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${appUrl}/auth/reset?token=${encodeURIComponent(token)}`;
  const html = `
    <p>You requested a password reset.</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="${url}">${url}</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;
  return sendEmail(email, "Reset your password for Luke UX", html);
}
