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
 * Minimal saved-search match email used by M1.
 *
 * The richer `PremiumListingShowcase.tsx` template lives in the CRM and will
 * be promoted into this service in M2 once the npm-workspace `@realtors360/emails`
 * package is set up. For M1 we ship a simple, plain template that the
 * orchestrator's text output drops directly into.
 */

export type SavedSearchMatchEmailProps = {
  greeting: string;
  bodyParagraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  signoff: string;
  preheader: string;
  realtorName: string;
};

export function SavedSearchMatchEmail(props: SavedSearchMatchEmailProps) {
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

export default SavedSearchMatchEmail;

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
