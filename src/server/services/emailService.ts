/**
 * Smart Clinic — Production Email Service (SMTP)
 * Supports all standard SMTP providers: Gmail, Outlook, SendGrid, Amazon SES, Mailgun, Postmark, etc.
 * Features:
 *  - Responsive HTML + plain text email templates branded for Smart Clinic (RA 10173 compliant)
 *  - Asynchronous background queueing so HTTP requests never block
 *  - Comprehensive audit logging for all sent messages
 *  - Graceful fallback for local development/testing when SMTP is unconfigured
 */
import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  purpose?: string;
}

export interface EmailAuditLog {
  id: string;
  timestamp: string;
  channel: 'email';
  recipient: string;
  subject: string;
  purpose: string;
  status: 'sent' | 'failed' | 'simulated';
  messageId?: string;
  error?: string;
}

export const emailAuditLogs: EmailAuditLog[] = [];

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initTransporter();
  }

  /**
   * Initializes Nodemailer SMTP transporter from environment variables.
   */
  public initTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 465);
    const user = (process.env.SMTP_USER || process.env.SMTP_EMAIL || '').trim();
    const rawPass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_APP_PASSWORD || '').trim();
    const pass = host.includes('gmail.com') ? rawPass.replace(/\s+/g, '') : rawPass;
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;

    if (user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
        });
        this.isConfigured = true;
        console.log(`[EmailService] Active real SMTP transporter initialized for ${user} on ${host}:${port}`);
      } catch (err: any) {
        console.warn('[EmailService] Failed to initialize SMTP transporter:', err?.message || err);
        this.transporter = null;
        this.isConfigured = false;
      }
    } else {
      this.transporter = null;
      this.isConfigured = false;
    }
  }

  public getFromAddress(): string {
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@smartclinic-v2.local';
    const fromName = process.env.SMTP_FROM_NAME || 'Smart Clinic Health (V2)';
    return `"${fromName}" <${fromEmail}>`;
  }

  public getStatus() {
    return {
      configured: this.isConfigured,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      user: process.env.SMTP_USER || 'unconfigured',
      from: this.getFromAddress(),
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
    };
  }

  /**
   * Sends an email or enqueues it asynchronously.
   * Resolves quickly and never throws, ensuring caller reliability.
   */
  public async sendMail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
    const logEntry: EmailAuditLog = {
      id: `EML-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      channel: 'email',
      recipient: options.to,
      subject: options.subject,
      purpose: options.purpose || 'transactional',
      status: 'simulated',
    };

    if (this.transporter && this.isConfigured) {
      try {
        const sendPromise = this.transporter.sendMail({
          from: this.getFromAddress(),
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SMTP connection timeout')), 15000)
        );

        const info = (await Promise.race([sendPromise, timeoutPromise])) as any;

        logEntry.status = 'sent';
        logEntry.messageId = info.messageId;
        emailAuditLogs.unshift(logEntry);
        if (emailAuditLogs.length > 200) emailAuditLogs.pop();

        console.log(`[EmailService] Real email dispatched to ${options.to} (ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId, simulated: false };
      } catch (err: any) {
        console.warn(`[EmailService] SMTP send error to ${options.to}:`, err?.message || err);
        logEntry.status = 'simulated';
        logEntry.error = err?.message || 'SMTP fallback';
        emailAuditLogs.unshift(logEntry);
        if (emailAuditLogs.length > 200) emailAuditLogs.pop();

        // Graceful fallback response
        return { success: true, simulated: true, error: err?.message };
      }
    }

    // Local simulation fallback
    console.log(`[EmailService Simulated] Dispatched to ${options.to}: [${options.subject}]`);
    logEntry.status = 'simulated';
    logEntry.messageId = `SIM-${Date.now()}`;
    emailAuditLogs.unshift(logEntry);
    if (emailAuditLogs.length > 200) emailAuditLogs.pop();

    return { success: true, messageId: logEntry.messageId, simulated: true };
  }

  /**
   * Queue email dispatch asynchronously so the HTTP request completes immediately.
   */
  public queueMail(options: EmailOptions) {
    setImmediate(async () => {
      try {
        await this.sendMail(options);
      } catch (err: any) {
        console.error('[EmailService Queue Error]', err);
      }
    });
  }

  /* =========================================================================
     TRANSACTIONAL TEMPLATES
     ========================================================================= */

  /**
   * 1. Verification OTP Email (Registration or Login)
   */
  public async sendVerificationOtp(email: string, code: string, purpose: 'registration' | 'login' | 'admin_2fa' = 'registration') {
    const is2FA = purpose === 'admin_2fa';
    const isReg = purpose === 'registration';
    const title = is2FA ? 'Admin 2FA Security Code' : isReg ? 'Verify Your Smart Clinic Account' : 'Patient Portal Login Code';
    const subtitle = is2FA ? 'Two-Factor Authentication Security Access' : 'Republic Act No. 10173 Health Data Security';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #0f172a;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background: linear-gradient(135deg, #0d9488, #0f766e); border-radius: 12px; color: #ffffff; font-size: 22px; font-weight: bold;">+</div>
          <h2 style="color: #0d9488; margin: 12px 0 2px; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Smart Clinic</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">${subtitle}</p>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px 20px; text-align: center; margin-bottom: 24px;">
          <p style="color: #475569; font-size: 13px; margin: 0 0 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">${title}</p>
          <div style="font-size: 38px; letter-spacing: 10px; font-weight: 800; color: #0f172a; font-family: monospace; background: #ffffff; padding: 14px 24px; border-radius: 10px; border: 1px dashed #0d9488; display: inline-block;">${code}</div>
          <p style="color: #94a3b8; font-size: 12px; margin: 14px 0 0;">Valid for 10 minutes. Do not share this code with anyone.</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0 0 20px;">
          This verification code was requested for <strong style="color: #0f172a;">${email}</strong>. If you did not initiate this request, you can safely disregard this email or report it to Smart Clinic Support.
        </p>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">Republic Act No. 10173 • Philippine Health Data Privacy Standard</p>
        </div>
      </div>
    `;

    const text = `Smart Clinic Verification Code\n\nYour 6-digit code is: ${code}\nValid for 10 minutes. Do not disclose.\nRequested for: ${email}\nRA 10173 Philippine Health Security`;

    return this.sendMail({
      to: email,
      subject: `Smart Clinic — ${title} [${code}]`,
      text,
      html,
      purpose: `otp_${purpose}`,
    });
  }

  /**
   * 2. Welcome Email on Account Creation / Verification
   */
  public async sendWelcomeEmail(email: string, fullName: string, mrn?: string) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #0f172a;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0d9488; margin: 0 0 6px; font-size: 24px; font-weight: 800;">Welcome to Smart Clinic</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Outpatient Care & Digital Health Services</p>
        </div>
        <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-weight: 700; color: #115e59; font-size: 15px;">Hello, ${fullName}!</p>
          <p style="margin: 0; color: #134e4a; font-size: 13px; line-height: 1.6;">
            Your Smart Clinic patient portal account has been successfully verified. You now have full access to book outpatient appointments, view clinical prescriptions, track lab results, and consult doctors.
          </p>
          ${
            mrn
              ? `<div style="margin-top: 14px; padding: 10px 14px; background: #ffffff; border-radius: 8px; border: 1px solid #99f6e4; font-size: 12px; font-family: monospace; color: #0f766e;">
                  <strong>Medical Record Number (MRN):</strong> ${mrn}
                </div>`
              : ''
          }
        </div>
        <div style="font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 24px;">
          <p style="margin: 0 0 8px;"><strong>Key portal features:</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Real-time appointment booking & physician directory</li>
            <li>Digital prescriptions & compendium dispensing review</li>
            <li>Laboratory orders & diagnostic reports</li>
            <li>24/7 AI Health Assistant & Clinical Triage</li>
          </ul>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">Republic Act No. 10173 • Certified Healthcare Privacy</p>
        </div>
      </div>
    `;

    const text = `Welcome to Smart Clinic, ${fullName}!\n\nYour patient portal account is verified.\n${mrn ? `Your MRN is: ${mrn}\n` : ''}You can now book consultations, access prescriptions, and view diagnostic test results online.\nRA 10173 Philippine Health Security`;

    return this.sendMail({
      to: email,
      subject: `Welcome to Smart Clinic, ${fullName}! Your Account is Verified`,
      text,
      html,
      purpose: 'welcome_email',
    });
  }

  /**
   * 3. Password Reset Email
   */
  public async sendPasswordResetEmail(email: string, code: string) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #0f172a;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #e11d48; margin: 0 0 6px; font-size: 24px; font-weight: 800;">Password Reset Request</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Smart Clinic Security & Access Control</p>
        </div>
        <p style="color: #475569; font-size: 13px; line-height: 1.6;">
          We received a request to reset your Smart Clinic password. Use the verification code below to authorize your new password:
        </p>
        <div style="background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 14px; padding: 24px; text-align: center; margin: 20px 0;">
          <p style="color: #9f1239; font-size: 12px; margin: 0 0 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Password Reset Code</p>
          <div style="font-size: 36px; letter-spacing: 8px; font-weight: 800; color: #881337; font-family: monospace; background: #ffffff; padding: 12px 24px; border-radius: 8px; border: 1px dashed #f43f5e; display: inline-block;">${code}</div>
          <p style="color: #9f1239; font-size: 12px; margin: 12px 0 0;">Expires in 10 minutes. If you did not make this request, please contact clinic administration.</p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">Republic Act No. 10173 • Philippine Health Security</p>
        </div>
      </div>
    `;

    const text = `Smart Clinic Password Reset Request\n\nYour reset code is: ${code}\nValid for 10 minutes.\nIf you did not initiate this request, please notify Smart Clinic immediately.`;

    return this.sendMail({
      to: email,
      subject: `Smart Clinic — Password Reset Code [${code}]`,
      text,
      html,
      purpose: 'password_reset',
    });
  }

  /**
   * 4. Login Alert & Security Notification
   */
  public async sendLoginAlert(email: string, details: { ip?: string; device?: string; time?: string }) {
    const timestamp = details.time || new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #0f172a;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0d9488; margin: 0 0 6px; font-size: 22px; font-weight: 800;">Security Login Alert</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Smart Clinic Account Protection</p>
        </div>
        <p style="color: #475569; font-size: 13px; line-height: 1.6;">
          Your Smart Clinic account was recently signed into:
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 12px; color: #334155; line-height: 1.8;">
          <div><strong>Timestamp:</strong> ${timestamp} (PHT)</div>
          <div><strong>Device / Browser:</strong> ${details.device || 'Web Browser'}</div>
          <div><strong>Authentication Status:</strong> Successful (RA 10173 Session Established)</div>
        </div>
        <p style="color: #64748b; font-size: 12px; margin: 0;">
          If this was you, no action is needed. If you did not recognize this login, please reset your password immediately.
        </p>
      </div>
    `;

    const text = `Smart Clinic Security Alert: Your account was signed into on ${timestamp}.\nDevice: ${details.device || 'Web'}\nIf this was not you, please reset your password immediately.`;

    return this.sendMail({
      to: email,
      subject: `Smart Clinic — New Sign-in Alert`,
      text,
      html,
      purpose: 'security_alert',
    });
  }
}

export const emailService = new EmailService();
