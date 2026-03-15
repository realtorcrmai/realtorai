import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

/** POST /api/settings/integrations/[provider]/test - test an integration connection */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { session, unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const { provider } = await params;
  const supabase = createAdminClient();
  const email = session!.user.email!;

  // Get the integration config
  const { data: integration, error: fetchError } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_email", email)
    .eq("provider", provider)
    .single();

  if (fetchError || !integration) {
    return NextResponse.json(
      { error: "Integration not found" },
      { status: 404 }
    );
  }

  const config = integration.config as Record<string, string>;
  let testResult: { success: boolean; message: string };

  try {
    switch (provider) {
      case "docusign":
        testResult = await testDocuSign(config);
        break;
      case "mls":
        testResult = await testMLS(config);
        break;
      case "email":
        testResult = await testEmail(config);
        break;
      case "twilio":
        testResult = await testTwilio(config);
        break;
      default:
        testResult = { success: false, message: `Unknown provider: ${provider}` };
    }
  } catch (err) {
    testResult = {
      success: false,
      message: err instanceof Error ? err.message : "Connection test failed",
    };
  }

  // Update test status
  await supabase
    .from("user_integrations")
    .update({
      last_tested_at: new Date().toISOString(),
      test_status: testResult.success ? "success" : "failed",
      is_active: testResult.success,
    })
    .eq("id", integration.id);

  return NextResponse.json(testResult);
}

async function testDocuSign(config: Record<string, string>) {
  const baseUrl =
    config.environment === "production"
      ? "https://na1.docusign.net/restapi"
      : "https://demo.docusign.net/restapi";

  const url = `${config.base_url || baseUrl}/v2.1/accounts/${config.account_id}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.integration_key}`,
      "Content-Type": "application/json",
    },
  });

  if (res.ok) {
    return { success: true, message: "DocuSign connection successful" };
  }
  const body = await res.text();
  return {
    success: false,
    message: `DocuSign returned ${res.status}: ${body.slice(0, 200)}`,
  };
}

async function testMLS(config: Record<string, string>) {
  if (!config.api_url) {
    return { success: false, message: "API URL is required" };
  }

  const res = await fetch(config.api_url, {
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      Accept: "application/json",
    },
  });

  if (res.ok) {
    return { success: true, message: "MLS connection successful" };
  }
  return {
    success: false,
    message: `MLS returned ${res.status}: ${res.statusText}`,
  };
}

async function testEmail(config: Record<string, string>) {
  const provider = config.email_provider;

  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${config.api_key}` },
    });
    if (res.ok) {
      return { success: true, message: "Resend API key is valid" };
    }
    return {
      success: false,
      message: `Resend returned ${res.status}: invalid API key`,
    };
  }

  if (provider === "sendgrid") {
    const res = await fetch("https://api.sendgrid.com/v3/user/profile", {
      headers: { Authorization: `Bearer ${config.api_key}` },
    });
    if (res.ok) {
      return { success: true, message: "SendGrid API key is valid" };
    }
    return {
      success: false,
      message: `SendGrid returned ${res.status}: invalid API key`,
    };
  }

  return {
    success: false,
    message: `SMTP testing is not yet supported. Save your settings and try sending a test email.`,
  };
}

async function testTwilio(config: Record<string, string>) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}.json`;
  const auth = Buffer.from(
    `${config.account_sid}:${config.auth_token}`
  ).toString("base64");

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (res.ok) {
    return { success: true, message: "Twilio credentials are valid" };
  }
  return {
    success: false,
    message: `Twilio returned ${res.status}: invalid credentials`,
  };
}
