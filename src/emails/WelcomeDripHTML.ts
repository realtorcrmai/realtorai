/**
 * Branded HTML builder for welcome drip emails.
 * Pure string template — no React dependency, safe for server actions.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface DripContent {
  preview: string;
  heading: string;
  body: string;
  steps: { emoji: string; text: string; href: string }[] | null;
  cta: { text: string; href: string };
}

function getDripContent(day: number, firstName: string, appUrl: string): DripContent {
  switch (day) {
    case 0:
      return {
        preview: "Welcome to Magnate — your AI-powered real estate CRM",
        heading: `Welcome, ${firstName}!`,
        body: "Your 14-day Professional trial is active — all features unlocked. Here are 3 quick wins to get started:",
        steps: [
          { emoji: "📇", text: "Import your contacts", href: `${appUrl}/contacts/new` },
          { emoji: "🏠", text: "Add your first listing", href: `${appUrl}/listings/new` },
          { emoji: "📅", text: "Connect your calendar", href: `${appUrl}/calendar` },
        ],
        cta: { text: "Go to Dashboard", href: appUrl },
      };
    case 1:
      return {
        preview: "Import your contacts in 60 seconds",
        heading: "Your contacts are waiting",
        body: `${firstName}, did you know you can import your entire contact list in under 60 seconds? We support Google Contacts CSV, Apple vCard, and manual CSV files.`,
        steps: null,
        cta: { text: "Import Contacts", href: `${appUrl}/contacts/new` },
      };
    case 2:
      return {
        preview: "AI writes your MLS remarks instantly",
        heading: "Let AI write your MLS remarks",
        body: `${firstName}, one of Magnate's most powerful features: AI-generated MLS remarks. Add a listing, and our AI writes both your public remarks and REALTOR remarks instantly.`,
        steps: null,
        cta: { text: "Try It Now", href: `${appUrl}/listings/new` },
      };
    case 3:
      return {
        preview: "Send your first newsletter in 3 minutes",
        heading: "Your first AI newsletter",
        body: `${firstName}, our AI can write personalized emails for each of your contacts. You just approve and we send. Market updates, listing alerts, and neighbourhood guides — all on autopilot.`,
        steps: null,
        cta: { text: "Create a Campaign", href: `${appUrl}/newsletters` },
      };
    case 5:
      return {
        preview: "Never miss a showing with smart scheduling",
        heading: "Smart showing management",
        body: `${firstName}, connect your Google Calendar and we'll sync all your showings. Automated SMS notifications to buyer agents, lockbox code delivery on confirmation, and availability checking — all built in.`,
        steps: null,
        cta: { text: "Connect Calendar", href: `${appUrl}/calendar` },
      };
    case 7:
      return {
        preview: "7 days left on your Professional trial",
        heading: "Halfway there!",
        body: `${firstName}, you're halfway through your Professional trial — 7 days left! Keep exploring all the features:`,
        steps: [
          { emoji: "🤖", text: "Generate AI content for a listing", href: `${appUrl}/content` },
          { emoji: "📧", text: "Set up an email automation", href: `${appUrl}/newsletters` },
          { emoji: "🎙️", text: "Try the voice assistant", href: appUrl },
        ],
        cta: { text: "View Your Account", href: `${appUrl}/settings/billing` },
      };
    case 12:
      return {
        preview: "Your Professional trial ends in 2 days",
        heading: "Trial ending soon",
        body: `${firstName}, your Professional trial ends in 2 days. After that, you'll be on the Free plan (contacts, calendar, and tasks only). Upgrade now to keep all your AI, email marketing, and workflow features.`,
        steps: null,
        cta: { text: "Upgrade Now", href: `${appUrl}/settings/billing` },
      };
    default:
      return {
        preview: "Update from Magnate",
        heading: `Hi ${firstName}`,
        body: "Check out what's new in your Magnate dashboard.",
        steps: null,
        cta: { text: "Open Dashboard", href: appUrl },
      };
  }
}

export function buildWelcomeDripHTML(props: {
  firstName: string;
  day: number;
  appUrl: string;
  unsubscribeUrl: string;
}): string {
  const c = getDripContent(props.day, escapeHtml(props.firstName), props.appUrl);

  const stepsHTML = c.steps
    ? c.steps
        .map(
          (s) =>
            `<a href="${s.href}" style="display:block;text-decoration:none;padding:10px 16px;margin:0 0 6px;background:#f4f2ff;border-radius:10px;color:#4f35d2;font-size:14px;line-height:1.4;">${s.emoji} ${s.text}</a>`
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      .drip-body { background-color: #1a1535 !important; }
      .drip-card { background-color: #2a2555 !important; }
      .drip-text { color: #e8e5f5 !important; }
      .drip-muted { color: #a0a0c0 !important; }
    }
    @media only screen and (max-width: 600px) {
      .drip-card { width: 100% !important; border-radius: 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:32px 16px;background:#f4f2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;" class="drip-body">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;" class="drip-card">
    <!-- Header -->
    <div style="padding:28px 32px 0;text-align:center;">
      <p style="font-size:20px;font-weight:700;color:#2D3E50;margin:0;letter-spacing:-0.5px;">Magnate</p>
    </div>

    <!-- Content -->
    <div style="padding:20px 32px 28px;">
      <h1 style="font-size:22px;font-weight:700;color:#1a1535;margin:0 0 12px;line-height:1.3;" class="drip-text">${c.heading}</h1>
      <p style="font-size:15px;color:#4a4a6a;line-height:1.6;margin:0 0 20px;" class="drip-text">${c.body}</p>

      ${stepsHTML ? `<div style="margin:0 0 24px;">${stepsHTML}</div>` : ""}

      <div style="text-align:center;">
        <a href="${c.cta.href}" style="display:inline-block;background:#4f35d2;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">${c.cta.text}</a>
      </div>
    </div>

    <!-- Footer -->
    <hr style="border:none;border-top:1px solid #e8e5f5;margin:0;">
    <div style="padding:20px 32px;text-align:center;">
      <p style="font-size:13px;color:#6b6b8d;margin:0 0 8px;" class="drip-muted">The Magnate Team</p>
      <p style="font-size:11px;color:#a0a0b0;margin:0;">
        <a href="${props.unsubscribeUrl}" style="color:#a0a0b0;text-decoration:underline;">Unsubscribe</a> from onboarding emails
      </p>
    </div>
  </div>
</body>
</html>`;
}
