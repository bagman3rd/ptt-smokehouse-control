// Build 10.0.0 — notification templates.
// Every commercial email carries a CAN-SPAM footer: physical postal address
// and a working unsubscribe link. Transactional emails carry the address but
// are not required to offer marketing unsubscribe.

import type { Category } from '@/lib/consent';

export interface RenderedMessage {
  subject: string;
  html: string;
  text: string;
}

function postalAddress(): string {
  return (
    process.env.COMPANY_POSTAL_ADDRESS ||
    'Smokehouse Control, 937 N Central St, Knoxville, TN 37917'
  );
}

function companyName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME || 'Smokehouse Control';
}

function unsubscribeUrl(token: string): string {
  const base = process.env.APP_BASE_URL || 'https://app.smokehousecontrol.com';
  return `${base}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
}

function emailFooter(category: Category, unsubToken?: string): { html: string; text: string } {
  const addr = postalAddress();
  const company = companyName();
  const unsub =
    category === 'MARKETING' && unsubToken
      ? {
          html: `<p style="color:#64748b;font-size:12px;margin-top:16px">You are receiving marketing email from ${company}. <a href="${unsubscribeUrl(
            unsubToken
          )}">Unsubscribe</a> at any time.</p>`,
          text: `\n\nYou are receiving marketing email from ${company}. Unsubscribe: ${unsubscribeUrl(
            unsubToken
          )}`
        }
      : { html: '', text: '' };
  return {
    html: `${unsub.html}<p style="color:#94a3b8;font-size:12px;margin-top:8px">${company} · ${addr}</p>`,
    text: `${unsub.text}\n\n${company} · ${addr}`
  };
}

interface TemplateInput {
  category: Category;
  unsubToken?: string;
  data: Record<string, string>;
}

type TemplateFn = (input: TemplateInput) => RenderedMessage;

const wrap = (title: string, bodyHtml: string, category: Category, unsubToken?: string) => {
  const footer = emailFooter(category, unsubToken);
  return {
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
<h1 style="font-size:20px;font-weight:800">${title}</h1>${bodyHtml}${footer.html}</div>`,
    footerText: footer.text
  };
};

export const EMAIL_TEMPLATES: Record<string, TemplateFn> = {
  welcome: ({ category, unsubToken, data }) => {
    const w = wrap(
      `Welcome to ${companyName()}`,
      `<p>Hi ${data.name || 'there'},</p>
<p>Your ${companyName()} account is ready. Your 14-day free trial has started — no credit card required.</p>
<p>Get started by creating your first cook plan.</p>
<p><a href="${data.appUrl || '#'}" style="display:inline-block;background:#b91c1c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open Smokehouse Control</a></p>`,
      category,
      unsubToken
    );
    return {
      subject: `Welcome to ${companyName()}`,
      html: w.html,
      text: `Hi ${data.name || 'there'}, your ${companyName()} account is ready. Your 14-day free trial has started.${w.footerText}`
    };
  },

  trial_ending: ({ category, unsubToken, data }) => {
    const w = wrap(
      'Your trial ends soon',
      `<p>Hi ${data.name || 'there'},</p>
<p>Your ${companyName()} free trial ends in ${data.daysLeft || 'a few'} days. Add a payment method to keep your cook plans, reports, and history.</p>
<p><a href="${data.billingUrl || '#'}" style="display:inline-block;background:#b91c1c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Continue for $99/month</a></p>`,
      category,
      unsubToken
    );
    return {
      subject: `Your ${companyName()} trial ends in ${data.daysLeft || 'a few'} days`,
      html: w.html,
      text: `Your ${companyName()} trial ends in ${data.daysLeft || 'a few'} days. Continue for $99/month: ${data.billingUrl || ''}${w.footerText}`
    };
  },

  payment_failed: ({ category, data }) => {
    const w = wrap(
      'Payment failed',
      `<p>Hi ${data.name || 'there'},</p>
<p>We couldn't process your ${companyName()} payment. Please update your payment method to avoid an interruption.</p>
<p><a href="${data.billingUrl || '#'}" style="display:inline-block;background:#b91c1c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Update payment</a></p>`,
      category
    );
    return {
      subject: `Action needed: ${companyName()} payment failed`,
      html: w.html,
      text: `We couldn't process your ${companyName()} payment. Update your payment method: ${data.billingUrl || ''}${w.footerText}`
    };
  },

  daily_digest: ({ category, unsubToken, data }) => {
    const w = wrap(
      'Your daily production summary',
      `<p>Hi ${data.name || 'there'},</p>
<p>Here is today's summary for ${data.restaurant || 'your restaurant'}:</p>
<ul>
<li>Cook plan status: ${data.planStatus || 'n/a'}</li>
<li>End-of-day logged: ${data.eodStatus || 'n/a'}</li>
<li>Forecast for tomorrow: ${data.forecast || 'n/a'}</li>
</ul>`,
      category,
      unsubToken
    );
    return {
      subject: `${companyName()} — daily summary`,
      html: w.html,
      text: `Daily summary for ${data.restaurant || 'your restaurant'}. Plan: ${data.planStatus || 'n/a'}, EOD: ${data.eodStatus || 'n/a'}.${w.footerText}`
    };
  },

  data_deletion_confirm: ({ category, data }) => {
    const w = wrap(
      'Confirm account deletion',
      `<p>Hi ${data.name || 'there'},</p>
<p>We received a request to delete your ${companyName()} account and all restaurant data. This cannot be undone. Audit records will be anonymized as required by law.</p>
<p>If you did not request this, ignore this email and your account stays active.</p>
<p><a href="${data.confirmUrl || '#'}" style="display:inline-block;background:#b91c1c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Confirm deletion</a></p>
<p style="color:#64748b;font-size:13px">This link expires in 24 hours.</p>`,
      category
    );
    return {
      subject: `Confirm your ${companyName()} account deletion`,
      html: w.html,
      text: `Confirm deletion of your ${companyName()} account: ${data.confirmUrl || ''} (expires in 24 hours).${w.footerText}`
    };
  }
};

export const SMS_TEMPLATES: Record<string, (data: Record<string, string>) => string> = {
  payment_failed: (data) =>
    `${companyName()}: your payment failed. Update billing to avoid interruption: ${data.billingUrl || ''}. Reply STOP to opt out.`,
  eod_reminder: (data) =>
    `${companyName()}: end-of-day log for ${data.restaurant || 'your restaurant'} is not submitted yet. Reply STOP to opt out.`,
  security_alert: (data) =>
    `${companyName()}: a new sign-in to your account was detected${data.location ? ` from ${data.location}` : ''}. If this wasn't you, reset your password now.`
};

export { postalAddress, companyName, unsubscribeUrl };
