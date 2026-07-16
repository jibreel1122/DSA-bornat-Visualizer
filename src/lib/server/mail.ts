import nodemailer from "nodemailer";

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "1230872@student.birzeit.edu";

export async function sendPasswordResetEmail(email: string, token: string) {
  const origin = process.env.APP_URL;
  const smtpUrl = process.env.SMTP_URL;
  if (!origin || !smtpUrl) return false;
  const transporter = nodemailer.createTransport(smtpUrl);
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? SUPPORT_EMAIL,
    to: email,
    subject: "Reset your Bornat Visualizer password",
    text: `Reset your password: ${origin}/account/reset-password?token=${encodeURIComponent(token)}\n\nIf you did not request this, ignore this email. Need help? ${SUPPORT_EMAIL}`,
  });
  return true;
}

