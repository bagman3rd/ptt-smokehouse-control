// Build 10.0.0 — notification provider adapters.
//
// Providers are pluggable. In development/test with no keys configured, the
// "console" provider records the message without sending — so tests never hit
// a real customer (Section 31: test environments must never send real messages).

export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

export interface EmailProvider {
  name: string;
  sendEmail(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    fromName?: string;
  }): Promise<SendResult>;
}

export interface SmsProvider {
  name: string;
  sendSms(input: { to: string; body: string }): Promise<SendResult>;
}

// ---- Console provider (default / test-safe) -------------------------------

const consoleEmail: EmailProvider = {
  name: 'console',
  async sendEmail({ to, subject }) {
    if (process.env.NODE_ENV !== 'test') {
      console.info(`[email:console] to=${to} subject=${JSON.stringify(subject)}`);
    }
    return { ok: true, providerId: `console-${Date.now()}` };
  }
};

const consoleSms: SmsProvider = {
  name: 'console',
  async sendSms({ to }) {
    if (process.env.NODE_ENV !== 'test') {
      console.info(`[sms:console] to=${to}`);
    }
    return { ok: true, providerId: `console-${Date.now()}` };
  }
};

// ---- SendGrid adapter (activated when SENDGRID_API_KEY present) ------------

function sendGridProvider(): EmailProvider {
  const apiKey = process.env.SENDGRID_API_KEY!;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL || 'no-reply@smokehousecontrol.com';
  return {
    name: 'sendgrid',
    async sendEmail({ to, subject, html, text, fromName }) {
      try {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: fromEmail, name: fromName || 'Smokehouse Control' },
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: html }
            ]
          })
        });
        if (res.ok) {
          return { ok: true, providerId: res.headers.get('x-message-id') || undefined };
        }
        return { ok: false, error: `sendgrid_${res.status}` };
      } catch (err) {
        return { ok: false, error: `sendgrid_exception:${(err as Error).message}` };
      }
    }
  };
}

// ---- Twilio adapter (activated when TWILIO_* present) ----------------------

function twilioProvider(): SmsProvider {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;
  return {
    name: 'twilio',
    async sendSms({ to, body }) {
      try {
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');
        const params = new URLSearchParams({ To: to, From: from, Body: body });
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });
        if (res.ok) {
          const data = (await res.json()) as { sid?: string };
          return { ok: true, providerId: data.sid };
        }
        return { ok: false, error: `twilio_${res.status}` };
      } catch (err) {
        return { ok: false, error: `twilio_exception:${(err as Error).message}` };
      }
    }
  };
}

export function getEmailProvider(): EmailProvider {
  if (process.env.SENDGRID_API_KEY && process.env.NODE_ENV !== 'test') return sendGridProvider();
  return consoleEmail;
}

export function getSmsProvider(): SmsProvider {
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER &&
    process.env.NODE_ENV !== 'test'
  ) {
    return twilioProvider();
  }
  return consoleSms;
}
