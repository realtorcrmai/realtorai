import React from "react";
import { SiteConfig } from "@/types";

export function Contact({ config }: { config: SiteConfig }) {
  const { theme, contact, about, footer } = config;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    fontFamily: theme.fonts.body,
    fontSize: "14px",
    color: theme.colors.text,
    background: "transparent",
    border: `1px solid ${theme.colors.text}20`,
    outline: "none",
    letterSpacing: "0.5px",
  };

  return (
    <section
      id="contact"
      style={{
        padding: "120px 40px",
        background: theme.colors.bg,
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "12px",
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: theme.colors.accent,
            marginBottom: "16px",
            fontWeight: 600,
            fontFamily: theme.fonts.body,
          }}
        >
          Get In Touch
        </p>
        <h2
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: "clamp(28px, 4vw, 42px)",
            fontWeight: 300,
            color: theme.colors.text,
            marginBottom: "16px",
          }}
        >
          Contact {about.name.split(" ")[0]}
        </h2>
        {footer.phone && (
          <p
            style={{
              fontFamily: theme.fonts.body,
              fontSize: "16px",
              color: theme.colors.muted,
              marginBottom: "48px",
            }}
          >
            {footer.phone} &nbsp;|&nbsp; {footer.email}
          </p>
        )}

        <form
          action={contact.lead_endpoint}
          method="POST"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            textAlign: "left",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <input name="name" placeholder="Full Name" required style={inputStyle} />
            <input name="phone" placeholder="Phone" type="tel" style={inputStyle} />
          </div>
          <input name="email" placeholder="Email Address" type="email" required style={inputStyle} />
          <textarea
            name="message"
            placeholder="Your Message"
            rows={5}
            required
            style={{
              ...inputStyle,
              resize: "vertical",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "16px",
              fontFamily: theme.fonts.body,
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: theme.colors.bg,
              background: theme.colors.accent,
              border: "none",
              cursor: "pointer",
              transition: "opacity 0.3s",
            }}
          >
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
}
