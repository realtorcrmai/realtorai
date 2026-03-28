/**
 * UnsubscribeBlock — CASL/CAN-SPAM compliant email footer
 * Always included. Not optional. Not editable by realtor.
 */

import { Section, Text, Link, Hr } from "@react-email/components";

type Props = {
  unsubscribeUrl: string;
  brokerageName?: string;
  brokerageAddress?: string;
  privacyUrl?: string;
  contactId?: string;
};

export function UnsubscribeFooter({
  unsubscribeUrl,
  brokerageName,
  brokerageAddress,
  privacyUrl,
  contactId,
}: Props) {
  const unsub = contactId
    ? `${unsubscribeUrl}?id=${contactId}`
    : unsubscribeUrl;

  return (
    <Section>
      <Hr style={{ borderColor: "#e8e5f5", margin: "24px 0 0" }} />
      <Section style={{ padding: "16px 32px 24px", textAlign: "center" }}>
        {brokerageName && (
          <Text
            style={{
              fontSize: 12,
              color: "#6b6b8d",
              margin: "0 0 2px",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {brokerageName}
          </Text>
        )}
        {brokerageAddress && (
          <Text
            style={{
              fontSize: 11,
              color: "#a0a0b0",
              margin: "0 0 8px",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {brokerageAddress}
          </Text>
        )}
        <Text
          style={{
            fontSize: 11,
            color: "#a0a0b0",
            margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <Link
            href={unsub}
            style={{ color: "#a0a0b0", textDecoration: "underline" }}
          >
            Unsubscribe
          </Link>
          {privacyUrl && (
            <>
              {" · "}
              <Link
                href={privacyUrl}
                style={{ color: "#a0a0b0", textDecoration: "underline" }}
              >
                Privacy Policy
              </Link>
            </>
          )}
        </Text>
      </Section>
    </Section>
  );
}
