import { Resend } from 'resend';
import { PlatformType, PLATFORM_NAMES, isValidEmail } from '@/lib/constants';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(apiKey);
}

export async function sendBackupCompleteEmail(
  userEmail: string,
  platform: PlatformType,
  archiveId: string,
  encryptionPassphrase?: string
): Promise<void> {
  const resend = getResendClient();
  const fromEmail = process.env.FROM_EMAIL;
  const baseUrl = process.env.NEXTAUTH_URL;

  if (!fromEmail) {
    throw new Error('FROM_EMAIL environment variable is not set');
  }

  if (!baseUrl) {
    throw new Error('NEXTAUTH_URL environment variable is not set');
  }

  // Validate email format
  if (!isValidEmail(userEmail)) {
    throw new Error('Invalid email address');
  }

  const downloadUrl = `${baseUrl}/api/download/${encodeURIComponent(archiveId)}`;
  const platformName = PLATFORM_NAMES[platform];

  try {
    await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: `Your ${platformName} backup is ready!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #2563eb; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .warning strong { color: #92400e; }
            ol { padding-left: 20px; }
            ol li { margin-bottom: 8px; }
            hr { border: none; border-top: 1px solid #e5e7eb; margin: 30px 0; }
            .footer { font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your ${platformName} Backup is Ready!</h1>
            </div>
            <div class="content">
              <p>Great news! We've successfully backed up your ${platformName} data.</p>

              <p>Your archive includes all the data types you selected, packaged into a convenient ZIP file.</p>

              <a href="${downloadUrl}" class="button">Download Your Archive</a>

              ${encryptionPassphrase ? `
              <div class="warning">
                <strong>Decryption Passphrase:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:14px;">${encryptionPassphrase}</code><br>
                Your backup is encrypted for security. You will need this passphrase to decrypt the archive after downloading.
                Save this passphrase somewhere safe!
              </div>
              ` : ''}

              <div class="warning">
                <strong>Important:</strong> This download link will expire in <strong>7 days</strong>.
                Make sure to download your backup before then!
              </div>

              <h3>What's Next?</h3>
              <ol>
                <li>Download and save your archive to a safe location</li>
                ${encryptionPassphrase ? '<li>Decrypt the archive using the passphrase above (use the decryption tool on unsocial.me or any AES-256-GCM compatible tool)</li>' : ''}
                <li>Extract the ZIP file to browse your data</li>
                <li>Return to unsocial.me to proceed with account deletion (if desired)</li>
              </ol>

              <p><strong>Remember:</strong> Do NOT delete your ${platformName} account until you've successfully downloaded and verified your backup!</p>

              <hr>

              <p class="footer">
                This email was sent by unsocial.me. If you didn't request this backup, you can safely ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw - backup succeeded even if email fails
  }
}
