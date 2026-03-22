import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return { client: new Resend(apiKey), fromEmail };
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

export function verifyCode(email: string, code: string): { valid: boolean; error?: string } {
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

export async function sendVerificationEmail(toEmail: string, code: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail || 'Scapex <noreply@resend.dev>',
      to: toEmail,
      subject: 'رمز التحقق — Scapex Verification Code',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #1e40af; margin: 0;">Scapex</h2>
            <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">منصة إدارة الأعمال الذكية</p>
          </div>
          <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 15px; margin: 0 0 8px;">مرحباً،</p>
            <p style="color: #334155; font-size: 15px; margin: 0 0 20px;">رمز التحقق الخاص بك لإنشاء حساب جديد:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="display: inline-block; background: #1e40af; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 32px; border-radius: 10px;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 13px; margin: 16px 0 0; text-align: center;">صلاحية الرمز: 10 دقائق</p>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0; text-align: center;">The code expires in 10 minutes</p>
          </div>
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 16px 0 0;">إذا لم تطلب هذا الرمز، يرجى تجاهل هذا البريد</p>
        </div>
      `,
    });
    console.log(`Verification email sent to ${toEmail}`);
    return true;
  } catch (err: any) {
    console.error('Failed to send verification email:', err.message);
    return false;
  }
}
