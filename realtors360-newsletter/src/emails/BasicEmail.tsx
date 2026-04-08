import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
} from '@react-email/components';

/**
 * Generic email template used by M2.
 *
 * Renders the structured output of the orchestrator (`EmailDraft`) into a
 * plain, white-background email that works in Outlook / Gmail / Apple Mail.
 *
 * All M2 email types reuse this template — the differentiation comes from the
 * orchestrator's content, not the visual layout. M4 will introduce per-type
 * "Premium*" components when we want stronger visual differentiation.
 */

export type BasicEmailProps = {
  greeting: string;
  bodyParagraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  signoff: string;
  preheader: string;
  realtorName: string;
};

export function BasicEmail(props: BasicEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{props.preheader}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            <Heading style={h1}>{props.greeting}</Heading>
            {props.bodyParagraphs.map((p, i) => (
              <Text key={i} style={paragraph}>
                {p}
              </Text>
            ))}
            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button href={props.ctaUrl} style={button}>
                {props.ctaLabel}
              </Button>
            </Section>
            <Text style={paragraph}>{props.signoff}</Text>
            <Hr style={hr} />
            <Text style={footer}>
              Sent by {props.realtorName} via Realtors360. If this isn't useful, you can{' '}
              <a href="{{unsubscribe_url}}" style={link}>
                unsubscribe
              </a>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default BasicEmail;

/* ───────── styles ───────── */

const body: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px',
};

const h1: React.CSSProperties = {
  fontSize: '24px',
  lineHeight: '32px',
  color: '#1a1535',
  margin: '0 0 16px',
  fontWeight: 600,
};

const paragraph: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#1a1535',
  margin: '0 0 16px',
};

const button: React.CSSProperties = {
  backgroundColor: '#4f35d2',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '14px',
  display: 'inline-block',
};

const hr: React.CSSProperties = {
  borderColor: '#eaeaea',
  margin: '32px 0 16px',
};

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#8b8b8b',
  lineHeight: '18px',
};

const link: React.CSSProperties = {
  color: '#4f35d2',
  textDecoration: 'underline',
};
