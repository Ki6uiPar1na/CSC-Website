import nodemailer from 'nodemailer';

const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');

const isSmtpConfigured = !!(smtpUser && smtpPass);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })
  : null;

if (transporter) {
  transporter.verify().then(() => {
    console.log('[Mailer] SMTP connection ready');
  }).catch((err) => {
    console.warn('[Mailer] SMTP connection failed:', err.message);
  });
} else {
  console.log('[Mailer] SMTP not configured — email sending disabled');
}

interface EventEmailData {
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  event_type: string;
  location: string | null;
  platform_name: string | null;
  meeting_link: string | null;
  is_premium: boolean;
  event_code: string;
  share_url: string;
}

function buildEventHtml(event: EventEmailData): string {
  const dateStr = new Date(`${event.event_date}T${event.event_time}`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = new Date(`${event.event_date}T${event.event_time}`).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  let detailsHtml = '';
  if (event.event_type === 'offline' && event.location) {
    detailsHtml = `<p style="margin:4px 0"><strong>📍 Location:</strong> ${event.location}</p>`;
  } else if (event.event_type === 'online') {
    detailsHtml = `<p style="margin:4px 0"><strong>💻 Platform:</strong> ${event.platform_name}</p>`;
    if (event.meeting_link) {
      detailsHtml += `<p style="margin:4px 0"><a href="${event.meeting_link}" style="color:#3b82f6">🔗 Join Meeting</a></p>`;
    }
  } else if (event.event_type === 'hybrid') {
    detailsHtml = `<p style="margin:4px 0"><strong>📍 Location:</strong> ${event.location || 'TBA'}</p>`;
    if (event.platform_name) {
      detailsHtml += `<p style="margin:4px 0"><strong>💻 Platform:</strong> ${event.platform_name}</p>`;
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://www.jkkniuctf.tech' || 'http://localhost:3000';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e293b;border-radius:16px;overflow:hidden">
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:32px 40px;text-align:center">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800">📢 New Event Created</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px">
              <h2 style="margin:0 0 8px;color:#f1f5f9;font-size:22px">${event.title}</h2>
              ${event.description ? `<p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.6">${event.description}</p>` : ''}
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b30;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:20px">
                <tr>
                  <td>
                    <p style="margin:4px 0;color:#94a3b8;font-size:13px"><strong style="color:#f1f5f9">📅 Date:</strong> ${dateStr}</p>
                    <p style="margin:4px 0;color:#94a3b8;font-size:13px"><strong style="color:#f1f5f9">⏰ Time:</strong> ${timeStr}</p>
                    <p style="margin:4px 0;color:#94a3b8;font-size:13px"><strong style="color:#f1f5f9">🔖 Event Code:</strong> <code style="background:#1e293b;padding:2px 8px;border-radius:4px;color:#3b82f6;font-size:13px">${event.event_code}</code></p>
                    ${detailsHtml}
                    ${event.is_premium ? '<p style="margin:8px 0 0;color:#f59e0b;font-size:12px;font-weight:600">⭐ This is a Premium Exclusive Event</p>' : ''}
                  </td>
                </tr>
              </table>
              <a href="${baseUrl}/events/${event.share_url}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">View Event Details →</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1e293b;text-align:center">
              <p style="margin:0;color:#475569;font-size:11px">JKKNIU Computer Science Club · csc.jkkniu.edu.bd</p>
              <p style="margin:4px 0 0;color:#334155;font-size:10px">You received this because you are a member of our community.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEventText(event: EventEmailData): string {
  const dateStr = new Date(`${event.event_date}T${event.event_time}`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = new Date(`${event.event_date}T${event.event_time}`).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  let details = '';
  if (event.event_type === 'offline' && event.location) {
    details = `Location: ${event.location}`;
  } else if (event.event_type === 'online') {
    details = `Platform: ${event.platform_name}`;
    if (event.meeting_link) details += `\nJoin: ${event.meeting_link}`;
  } else if (event.event_type === 'hybrid') {
    details = `Location: ${event.location || 'TBA'}`;
    if (event.platform_name) details += `\nPlatform: ${event.platform_name}`;
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  let text = `📢 New Event: ${event.title}\n`;
  text += `Date: ${dateStr} at ${timeStr}\n`;
  text += `Event Code: ${event.event_code}\n`;
  if (details) text += `${details}\n`;
  if (event.is_premium) text += `⭐ Premium Exclusive Event\n`;
  text += `\nView: ${baseUrl}/events/${event.share_url}`;
  return text;
}

export async function sendEventNotification(
  recipientEmails: string[],
  event: EventEmailData,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  if (recipientEmails.length === 0) {
    console.log('[Mailer] No recipients to send to');
    return { sent, failed, errors };
  }

  if (!transporter) {
    console.log('[Mailer] SMTP not configured — skipping email send');
    return { sent, failed, errors };
  }

  const html = buildEventHtml(event);
  const text = buildEventText(event);

  console.log(`[Mailer] Sending "${event.title}" to ${recipientEmails.length} recipients`);

  for (const email of recipientEmails) {
    try {
      const info = await transporter.sendMail({
        from: '"JKKNIU CSC" <jkkniucsc@gmail.com>',
        to: email,
        subject: `📢 New Event: ${event.title}`,
        text,
        html,
      });
      sent++;
      console.log(`[Mailer] Sent to ${email}: ${info.messageId}`);
    } catch (err: any) {
      console.error(`[Mailer] Failed for ${email}:`, err.message);
      errors.push(`${email}: ${err.message}`);
      failed++;
    }
  }

  console.log(`[Mailer] Done: ${sent} sent, ${failed} failed`);
  return { sent, failed, errors };
}

export async function sendApprovalEmail(
  email: string,
  username: string,
): Promise<boolean> {
  if (!transporter) {
    console.log('[Mailer] SMTP not configured — skipping approval email');
    return false;
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://www.jkkniuctf.tech' || 'http://localhost:3000';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e293b;border-radius:16px;overflow:hidden">
          <tr>
            <td style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px 40px;text-align:center">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800">Access Granted</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px">
              <p style="color:#94a3b8;font-size:14px;line-height:1.6">Hello <strong style="color:#f1f5f9">${username}</strong>,</p>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6">Your account has been <strong style="color:#22c55e">approved</strong> by the admin. You now have full access to the JKKNIU CSC platform.</p>
              <div style="text-align:center;margin:32px 0">
                <a href="${baseUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px">Login Now →</a>
              </div>
              <p style="color:#64748b;font-size:13px;line-height:1.5">You can now access challenges, lessons, exams, and all other features. Welcome aboard!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1e293b;text-align:center">
              <p style="margin:0;color:#475569;font-size:11px">JKKNIU Computer Science Club · csc.jkkniu.edu.bd</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Access Granted\n\nHello ${username},\n\nYour account has been approved by the admin. You now have full access to the JKKNIU CSC platform.\n\nLogin here: ${baseUrl}/login\n\nWelcome aboard!`;

  try {
    await transporter.sendMail({
      from: '"JKKNIU CSC" <jkkniucsc@gmail.com>',
      to: email,
      subject: 'Account Approved — Welcome to JKKNIU CSC',
      text,
      html,
    });
    console.log(`[Mailer] Approval email sent to ${email}`);
    return true;
  } catch (err: any) {
    console.error(`[Mailer] Failed to send approval email to ${email}:`, err.message);
    return false;
  }
}

export async function sendRejectionEmail(
  email: string,
  username: string,
  reason: string,
): Promise<boolean> {
  if (!transporter) {
    console.log('[Mailer] SMTP not configured — skipping rejection email');
    return false;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e293b;border-radius:16px;overflow:hidden">
          <tr>
            <td style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px 40px;text-align:center">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800">Access Denied</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px">
              <p style="color:#94a3b8;font-size:14px;line-height:1.6">Hello <strong style="color:#f1f5f9">${username}</strong>,</p>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6">Your account registration has been <strong style="color:#ef4444">rejected</strong> by the admin.</p>
              ${reason ? `<div style="background:#1e293b30;border:1px solid #ef444420;border-radius:12px;padding:16px;margin:20px 0">
                <p style="margin:0 0 6px;color:#ef4444;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Reason</p>
                <p style="margin:0;color:#f1f5f9;font-size:14px;line-height:1.5">${reason}</p>
              </div>` : ''}
              <p style="color:#64748b;font-size:13px;line-height:1.5">If you believe this was a mistake, please contact the JKKNIU CSC team for further assistance.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1e293b;text-align:center">
              <p style="margin:0;color:#475569;font-size:11px">JKKNIU Computer Science Club · csc.jkkniu.edu.bd</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Access Denied\n\nHello ${username},\n\nYour account registration has been rejected by the admin.\n${reason ? `\nReason: ${reason}\n` : '\n'}\nIf you believe this was a mistake, please contact the JKKNIU CSC team.`;

  try {
    await transporter.sendMail({
      from: '"JKKNIU CSC" <jkkniucsc@gmail.com>',
      to: email,
      subject: 'Account Registration Rejected',
      text,
      html,
    });
    console.log(`[Mailer] Rejection email sent to ${email}`);
    return true;
  } catch (err: any) {
    console.error(`[Mailer] Failed to send rejection email to ${email}:`, err.message);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  username: string,
  resetLink: string,
): Promise<boolean> {
  if (!transporter) {
    console.log('[Mailer] SMTP not configured — skipping password reset email');
    return false;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e293b;border-radius:16px;overflow:hidden">
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:32px 40px;text-align:center">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800">🔐 Password Reset</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px">
              <p style="color:#94a3b8;font-size:14px;line-height:1.6">Hello <strong style="color:#f1f5f9">${username}</strong>,</p>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6">We received a request to reset your password. Click the button below to set a new password. This link will expire in <strong style="color:#f1f5f9">1 hour</strong>.</p>
              <div style="text-align:center;margin:32px 0">
                <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px">Reset Password →</a>
              </div>
              <p style="color:#64748b;font-size:12px;line-height:1.5">If you did not request a password reset, please ignore this email. Your account remains secure.</p>
              <p style="color:#64748b;font-size:12px;line-height:1.5">If the button does not work, copy and paste this link into your browser:</p>
              <p style="color:#3b82f6;font-size:11px;word-break:break-all">${resetLink}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1e293b;text-align:center">
              <p style="margin:0;color:#475569;font-size:11px">JKKNIU Computer Science Club · csc.jkkniu.edu.bd</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `🔐 Password Reset\n\nHello ${username},\n\nWe received a request to reset your password. Visit the link below to set a new password. This link expires in 1 hour.\n\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\nJKKNIU Computer Science Club`;

  try {
    await transporter.sendMail({
      from: '"JKKNIU CSC" <jkkniucsc@gmail.com>',
      to: email,
      subject: '🔐 Password Reset Request',
      text,
      html,
    });
    console.log(`[Mailer] Password reset email sent to ${email}`);
    return true;
  } catch (err: any) {
    console.error(`[Mailer] Failed to send password reset email to ${email}:`, err.message);
    return false;
  }
}
