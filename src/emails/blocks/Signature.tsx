/**
 * HeadshotSignatureBlock — Realtor photo + name + contact info
 */

import { Section, Img, Text, Link, Hr } from "@react-email/components";

type Props = {
  name: string;
  title?: string;
  brokerage?: string;
  phone?: string;
  email?: string;
  website?: string;
  headshotUrl?: string;
  instagram?: string;
  facebook?: string;
  style?: "minimal" | "professional" | "social" | "card";
  primaryColor?: string;
};

export function SignatureBlock({
  name,
  title = "REALTOR®",
  brokerage,
  phone,
  email,
  website,
  headshotUrl,
  instagram,
  facebook,
  style = "professional",
  primaryColor = "#4f35d2",
}: Props) {
  if (style === "minimal") {
    return (
      <Section style={{ padding: "24px 0 0" }}>
        <Text style={{ fontSize: 15, color: "#3a3a5c", margin: 0, fontFamily: "system-ui, sans-serif" }}>
          Best regards,
          <br />
          {name}
        </Text>
        {phone && (
          <Text style={{ fontSize: 13, color: "#6b6b8d", margin: "4px 0 0", fontFamily: "system-ui, sans-serif" }}>
            {phone}
          </Text>
        )}
      </Section>
    );
  }

  return (
    <Section style={{ padding: "24px 0 0" }}>
      <Hr style={{ borderColor: "#e8e5f5", margin: "0 0 16px" }} />
      <table cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
        <tbody>
          <tr>
            {headshotUrl && (
              <td style={{ width: 56, verticalAlign: "top", paddingRight: 12 }}>
                <Img
                  src={headshotUrl}
                  alt={name}
                  width={48}
                  height={48}
                  style={{ borderRadius: "50%", display: "block" }}
                />
              </td>
            )}
            <td style={{ verticalAlign: "top" }}>
              <Text style={{ fontSize: 15, fontWeight: 600, color: "#1a1535", margin: 0, fontFamily: "system-ui, sans-serif" }}>
                {name}
              </Text>
              <Text style={{ fontSize: 13, color: "#6b6b8d", margin: "2px 0 0", fontFamily: "system-ui, sans-serif" }}>
                {title}{brokerage ? ` · ${brokerage}` : ""}
              </Text>
              {phone && (
                <Text style={{ fontSize: 13, color: "#6b6b8d", margin: "2px 0 0", fontFamily: "system-ui, sans-serif" }}>
                  <Link href={`tel:${phone}`} style={{ color: primaryColor, textDecoration: "none" }}>
                    {phone}
                  </Link>
                  {website && (
                    <>
                      {" · "}
                      <Link href={`https://${website}`} style={{ color: primaryColor, textDecoration: "none" }}>
                        {website}
                      </Link>
                    </>
                  )}
                </Text>
              )}
              {(style === "social" || style === "card") && (instagram || facebook) && (
                <Text style={{ fontSize: 13, margin: "6px 0 0", fontFamily: "system-ui, sans-serif" }}>
                  {instagram && (
                    <Link href={`https://instagram.com/${instagram.replace("@", "")}`} style={{ color: primaryColor, textDecoration: "none", marginRight: 8 }}>
                      IG
                    </Link>
                  )}
                  {facebook && (
                    <Link href={`https://facebook.com/${facebook}`} style={{ color: primaryColor, textDecoration: "none" }}>
                      FB
                    </Link>
                  )}
                </Text>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
}
