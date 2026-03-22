import { Resend } from "resend";

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
