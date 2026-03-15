export const INTEGRATION_PROVIDERS = [
  "docusign",
  "mls",
  "email",
  "twilio",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const PROVIDER_META: Record<
  IntegrationProvider,
  {
    label: string;
    description: string;
    icon: string;
    fields: {
      key: string;
      label: string;
      type: "text" | "password" | "select";
      placeholder?: string;
      required?: boolean;
      options?: { value: string; label: string }[];
    }[];
  }
> = {
  docusign: {
    label: "DocuSign",
    description:
      "E-signature integration for contracts and forms. Send documents for signing directly from deals.",
    icon: "PenTool",
    fields: [
      {
        key: "integration_key",
        label: "Integration Key (Client ID)",
        type: "password",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        required: true,
      },
      {
        key: "secret_key",
        label: "Secret Key",
        type: "password",
        placeholder: "Your DocuSign secret key",
        required: true,
      },
      {
        key: "account_id",
        label: "Account ID",
        type: "text",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        required: true,
      },
      {
        key: "environment",
        label: "Environment",
        type: "select",
        required: true,
        options: [
          { value: "demo", label: "Demo / Sandbox" },
          { value: "production", label: "Production" },
        ],
      },
      {
        key: "base_url",
        label: "Base URL (auto-set from environment)",
        type: "text",
        placeholder: "https://demo.docusign.net/restapi",
      },
    ],
  },
  mls: {
    label: "MLS / IDX",
    description:
      "Connect to your local MLS board for live property data, saved searches, and property alerts.",
    icon: "Database",
    fields: [
      {
        key: "provider_name",
        label: "MLS Provider",
        type: "select",
        required: true,
        options: [
          { value: "reso_web_api", label: "RESO Web API" },
          { value: "spark_api", label: "Spark API (FBS)" },
          { value: "bridge", label: "Bridge Interactive" },
          { value: "ihomefinder", label: "iHomeFinder" },
          { value: "crea_ddf", label: "CREA DDF (Canada)" },
          { value: "other", label: "Other" },
        ],
      },
      {
        key: "api_key",
        label: "API Key / Access Token",
        type: "password",
        placeholder: "Your MLS API key",
        required: true,
      },
      {
        key: "api_url",
        label: "API Base URL",
        type: "text",
        placeholder: "https://api.mlsprovider.com/v2",
        required: true,
      },
      {
        key: "board_id",
        label: "Board / Office ID",
        type: "text",
        placeholder: "Your MLS board ID",
      },
      {
        key: "agent_id",
        label: "Agent MLS ID",
        type: "text",
        placeholder: "Your agent MLS ID",
      },
    ],
  },
  email: {
    label: "Email Service",
    description:
      "Send transactional and marketing emails. Supports Resend, SendGrid, or custom SMTP.",
    icon: "Mail",
    fields: [
      {
        key: "email_provider",
        label: "Email Provider",
        type: "select",
        required: true,
        options: [
          { value: "resend", label: "Resend" },
          { value: "sendgrid", label: "SendGrid" },
          { value: "smtp", label: "Custom SMTP" },
        ],
      },
      {
        key: "api_key",
        label: "API Key",
        type: "password",
        placeholder: "re_xxxxxxxxx or SG.xxxxxxxxx",
        required: true,
      },
      {
        key: "from_email",
        label: "From Email Address",
        type: "text",
        placeholder: "you@yourdomain.com",
        required: true,
      },
      {
        key: "from_name",
        label: "From Name",
        type: "text",
        placeholder: "Your Name / Company",
      },
      {
        key: "reply_to",
        label: "Reply-To Email",
        type: "text",
        placeholder: "reply@yourdomain.com",
      },
    ],
  },
  twilio: {
    label: "Twilio (SMS / WhatsApp)",
    description:
      "SMS and WhatsApp messaging for showing confirmations, client notifications, and drip campaigns.",
    icon: "MessageCircle",
    fields: [
      {
        key: "account_sid",
        label: "Account SID",
        type: "text",
        placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        required: true,
      },
      {
        key: "auth_token",
        label: "Auth Token",
        type: "password",
        placeholder: "Your Twilio auth token",
        required: true,
      },
      {
        key: "phone_number",
        label: "Twilio Phone Number",
        type: "text",
        placeholder: "+1234567890",
        required: true,
      },
      {
        key: "whatsapp_number",
        label: "WhatsApp Number (optional)",
        type: "text",
        placeholder: "+1234567890",
      },
    ],
  },
};

/** Mask a secret value, showing only the last 4 characters */
export function maskSecret(value: string): string {
  if (!value || value.length <= 4) return "••••";
  return "••••" + value.slice(-4);
}

/** Fields that should be masked when returned from the API */
export const SECRET_FIELDS = [
  "secret_key",
  "integration_key",
  "api_key",
  "auth_token",
];
