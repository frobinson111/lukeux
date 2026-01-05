const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${appUrl}/auth/verify?token=${encodeURIComponent(token)}`;
  // TODO: Wire real email provider (SES/SendGrid/Resend). For now, log.
  if (process.env.NODE_ENV === "development") {
    console.info(`[dev-email] verification for ${email}: ${url}`);
  }
  return { preview: url };
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${appUrl}/auth/reset?token=${encodeURIComponent(token)}`;
  if (process.env.NODE_ENV === "development") {
    console.info(`[dev-email] password reset for ${email}: ${url}`);
  }
  return { preview: url };
}
