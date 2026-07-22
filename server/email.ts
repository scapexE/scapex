import { Resend } from "resend";
import crypto from "crypto";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

function getFromEmail(): string {
  return process.env.FROM_EMAIL || "Scapex <noreply@resend.dev>";
}

interface StoredCode {
  code: string;
  expiresAt: number;
  attempts: number;
}

const verificationCodes = new Map<string, StoredCode>();
const verifiedEmails = new Map<string, number>();
const sendCooldowns = new Map<string, number>();

const MAX_ATTEMPTS = 5;
const CODE_EXPIRY_MS = 10 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const VERIFIED_EXPIRY_MS = 15 * 60 * 1000;

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function canSendCode(email: string): boolean {
  const lastSent = sendCooldowns.get(email.toLowerCase());
  if (lastSent && Date.now() - lastSent < SEND_COOLDOWN_MS) return false;
  return true;
}

export function storeVerificationCode(email: string, code: string) {
  const key = email.toLowerCase();
  verificationCodes.set(key, {
    code,
    expiresAt: Date.now() + CODE_EXPIRY_MS,
    attempts: 0,
  });
  sendCooldowns.set(key, Date.now());
}

export function verifyCode(
  email: string,
  code: string,
): { valid: boolean; error?: string } {
  const key = email.toLowerCase();
  const stored = verificationCodes.get(key);

  if (!stored) {
    return { valid: false, error: "no_code" };
  }

  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(key);
    return { valid: false, error: "expired" };
  }

  if (stored.attempts >= MAX_ATTEMPTS) {
    verificationCodes.delete(key);
    return { valid: false, error: "max_attempts" };
  }

  stored.attempts++;

  if (stored.code !== code) {
    return { valid: false, error: "wrong_code" };
  }

  verificationCodes.delete(key);
  verifiedEmails.set(key, Date.now() + VERIFIED_EXPIRY_MS);
  return { valid: true };
}

export function isEmailVerified(email: string): boolean {
  const key = email.toLowerCase();
  const expiresAt = verifiedEmails.get(key);

  if (!expiresAt) return false;

  if (Date.now() > expiresAt) {
    verifiedEmails.delete(key);
    return false;
  }

  return true;
}

export function consumeEmailVerification(email: string) {
  verifiedEmails.delete(email.toLowerCase());
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
}

export interface SendEmailParams {
  to: string | string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    const to = Array.isArray(params.to) ? params.to : [params.to];
    const payload: any = {
      from: params.from || getFromEmail(),
      to,
      subject: params.subject,
    };
    if (params.bcc && params.bcc.length > 0) payload.bcc = params.bcc;
    if (params.html) payload.html = params.html;
    if (params.text) payload.text = params.text;
    if (params.replyTo) payload.replyTo = params.replyTo;
    if (params.attachments && params.attachments.length > 0) {
      payload.attachments = params.attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
      }));
    }
    const result = await resend.emails.send(payload);
    if ((result as any).error) {
      return { success: false, error: (result as any).error.message || String((result as any).error) };
    }
    return { success: true, id: (result as any).data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export function generateTempPassword(): string {
  // 10 chars: upper, lower, digits + one symbol — CSPRNG-based
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  let pwd = upper[crypto.randomInt(upper.length)]
    + lower[crypto.randomInt(lower.length)]
    + digits[crypto.randomInt(digits.length)];
  for (let i = 0; i < 6; i++) pwd += all[crypto.randomInt(all.length)];
  return pwd + "@";
}

export async function sendPortalWelcomeEmail(
  toEmail: string,
  clientName: string,
  nationalId: string,
  tempPassword: string,
  portalUrl = "https://erp.scape.sa/client-portal",
): Promise<boolean> {
  const result = await sendEmail({
    to: toEmail,
    subject: "بيانات الدخول لبوابة العملاء — Scapex Client Portal",
    html: `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 520px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1e40af; margin: 0;">Scapex</h2>
          <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">بوابة العملاء</p>
        </div>
        <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; font-size: 15px;">مرحباً ${clientName}،</p>
          <p style="color: #334155; font-size: 14px;">تم تفعيل حسابك في بوابة العملاء. بيانات الدخول:</p>
          <table style="width:100%; margin: 16px 0; font-size: 14px; color: #334155;">
            <tr><td style="padding:6px 0; color:#64748b;">رقم الهوية:</td><td style="direction:ltr; text-align:left; font-family:monospace; font-weight:bold;">${nationalId}</td></tr>
            <tr><td style="padding:6px 0; color:#64748b;">كلمة المرور المؤقتة:</td><td style="direction:ltr; text-align:left; font-family:monospace; font-weight:bold;">${tempPassword}</td></tr>
          </table>
          <div style="text-align:center; margin: 20px 0;">
            <a href="${portalUrl}" style="display:inline-block; background:#1e40af; color:white; padding:12px 28px; border-radius:8px; text-decoration:none; font-size:15px;">الدخول إلى بوابة العملاء</a>
          </div>
          <p style="color: #b45309; font-size: 13px; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:10px;">
            لأمان حسابك، سيُطلب منك تغيير كلمة المرور المؤقتة عند أول تسجيل دخول.
          </p>
        </div>
      </div>
    `,
  });
  if (!result.success) console.error("❌ Failed to send portal welcome email:", result.error);
  return result.success;
}

export async function sendVerificationEmail(
  toEmail: string,
  code: string,
): Promise<boolean> {
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: getFromEmail(),
      to: toEmail,
      subject: "رمز التحقق — Scapex Verification Code",
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #1e40af; margin: 0;">Scapex</h2>
            <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">منصة إدارة الأعمال الذكية</p>
          </div>

          <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 15px;">رمز التحقق الخاص بك:</p>

            <div style="text-align: center; margin: 20px 0;">
              <span style="display: inline-block; background: #1e40af; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 32px; border-radius: 10px;">
                ${code}
              </span>
            </div>

            <p style="color: #64748b; font-size: 13px; text-align: center;">
              صلاحية الرمز: 10 دقائق
            </p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Verification email sent to ${toEmail}`);
    return true;
  } catch (err: any) {
    console.error("❌ Failed to send verification email:", err.message);
    return false;
  }
}
