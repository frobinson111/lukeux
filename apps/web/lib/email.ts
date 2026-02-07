import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export type EmailResult = {
  sent: boolean;
  preview?: string;
  error?: string;
};

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const config = await prisma.smtpConfig.findFirst();
  if (!config) return null;

  try {
    const password = decrypt(config.encryptedPassword, "smtp-password-salt");

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.encryption === "SSL_TLS",
      auth: { user: config.username, pass: password },
      ...(config.encryption === "STARTTLS" ? { requireTLS: true } : {}),
    });
  } catch (err: any) {
    console.error("[email] Failed to create transporter:", err.message);
    return null;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const config = await prisma.smtpConfig.findFirst();
  if (!config) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[dev-email] to=${to} subject=${subject}`);
    }
    return { sent: false, error: "SMTP not configured" };
  }

  const transporter = await getTransporter();
  if (!transporter) {
    return { sent: false, error: "Failed to create email transporter" };
  }

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err: any) {
    console.error("[email] send failed:", err.message);
    return { sent: false, error: err.message };
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<EmailResult> {
  const url = `${appUrl}/auth/verify?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">Verify your email</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Click the link below to verify your email address:</p>
      <p style="margin: 20px 0;"><a href="${url}" style="display: inline-block; padding: 10px 20px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Verify Email</a></p>
      <p style="color: #94a3b8; font-size: 12px;">This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
    </div>
  `;

  const result = await sendEmail(email, "Verify your email - Luke UX", html);
  if (!result.sent) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[dev-email] verification for ${email}: ${url}`);
    }
    return { ...result, preview: url };
  }
  return result;
}

export async function sendOtpEmail(email: string, otp: string): Promise<EmailResult> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">Your verification code</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Enter this 6-digit code to verify your email address:</p>
      <p style="font-size: 36px; font-weight: 700; letter-spacing: 8px; padding: 20px; background: #f1f5f9; border-radius: 8px; text-align: center; color: #0f172a; margin: 24px 0;">${otp}</p>
      <p style="color: #94a3b8; font-size: 12px;">This code expires in 10 minutes. If you did not request this code, you can safely ignore this email.</p>
    </div>
  `;

  const result = await sendEmail(email, "Your verification code - Luke UX", html);
  if (!result.sent && process.env.NODE_ENV === "development") {
    console.info(`[dev-email] OTP for ${email}: ${otp}`);
    return { ...result, preview: otp };
  }
  return result;
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<EmailResult> {
  const url = `${appUrl}/auth/reset?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">Reset your password</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Click the link below to reset your password:</p>
      <p style="margin: 20px 0;"><a href="${url}" style="display: inline-block; padding: 10px 20px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Reset Password</a></p>
      <p style="color: #94a3b8; font-size: 12px;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  const result = await sendEmail(email, "Reset your password - Luke UX", html);
  if (!result.sent) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[dev-email] password reset for ${email}: ${url}`);
    }
    return { ...result, preview: url };
  }
  return result;
}

export async function sendTestEmail(to: string): Promise<EmailResult> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">SMTP Configuration Test</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">If you received this email, your SMTP settings are working correctly.</p>
      <p style="color: #94a3b8; font-size: 12px;">Sent from Luke UX Admin Dashboard.</p>
    </div>
  `;
  return sendEmail(to, "SMTP Test - Luke UX", html);
}
