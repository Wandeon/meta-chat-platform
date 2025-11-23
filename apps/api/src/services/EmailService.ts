import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export class EmailService {
  private transporter: Transporter;
  private fromEmail: string;
  private baseUrl: string;

  constructor() {
    // Initialize SMTP transporter
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpPassword = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: smtpPort,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : smtpPort === 465, // default secure for 465
      auth: process.env.SMTP_USER && smtpPassword ? {
        user: process.env.SMTP_USER,
        pass: smtpPassword,
      } : undefined,
    });

    const fromAddress = process.env.SMTP_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@meta-chat-platform.com';
    const fromName = process.env.SMTP_FROM_NAME;

    this.fromEmail = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
    this.baseUrl = process.env.BASE_URL || process.env.API_URL || 'http://localhost:3000';
  }

  /**
   * Send verification email to user
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${this.baseUrl}/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Verify your email address - Meta Chat Platform',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                  <tr>
                    <td style="background-color: #0066cc; padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Meta Chat Platform</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Verify Your Email Address</h2>
                      <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                        Thank you for signing up! To complete your registration and start using Meta Chat Platform,
                        please verify your email address by clicking the button below.
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${verificationUrl}"
                               style="display: inline-block; padding: 15px 40px; background-color: #0066cc;
                                      color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px;
                                      font-weight: bold;">
                              Verify Email Address
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 20px 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                        Or copy and paste this link into your browser:<br>
                        <a href="${verificationUrl}" style="color: #0066cc; word-break: break-all;">${verificationUrl}</a>
                      </p>
                      <p style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999999; font-size: 12px; line-height: 1.5;">
                        This verification link will expire in 24 hours. If you didn't create an account,
                        you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        &copy; 2025 Meta Chat Platform. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Welcome to Meta Chat Platform!

Please verify your email address by clicking the link below:
${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

---
Meta Chat Platform
      `.trim(),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Welcome to Meta Chat Platform!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px; color: #333333;">Welcome${name ? `, ${name}` : ''}!</h2>
                      <p style="margin: 0 0 15px; color: #666666; font-size: 16px; line-height: 1.5;">
                        Your email has been verified successfully. You can now access all features of Meta Chat Platform.
                      </p>
                      <p style="margin: 15px 0 0; color: #666666; font-size: 16px; line-height: 1.5;">
                        Get started by logging into your dashboard.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Welcome${name ? `, ${name}` : ''}! Your email has been verified successfully.`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${email}`);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw - welcome email is not critical
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.baseUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Reset your password - Meta Chat Platform',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                  <tr>
                    <td style="background-color: #0066cc; padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Meta Chat Platform</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Reset Your Password</h2>
                      <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                        We received a request to reset your password. Click the button below to choose a new password.
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetUrl}"
                               style="display: inline-block; padding: 15px 40px; background-color: #0066cc;
                                      color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px;
                                      font-weight: bold;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 20px 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                        Or copy and paste this link into your browser:<br>
                        <a href="${resetUrl}" style="color: #0066cc; word-break: break-all;">${resetUrl}</a>
                      </p>
                      <p style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999999; font-size: 12px; line-height: 1.5;">
                        This password reset link will expire in 1 hour. If you didn't request a password reset,
                        you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Reset Your Password

We received a request to reset your password. Click the link below to choose a new password:
${resetUrl}

This password reset link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

---
Meta Chat Platform
      `.trim(),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

// Singleton instance
export const emailService = new EmailService();
