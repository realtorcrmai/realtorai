import * as React from 'react'
import { Section, Text, Img } from '@react-email/components'
import type { AgentNoteBlockContent } from '@/types/editorial'

export interface AgentNoteBlockEmailProps {
  content: AgentNoteBlockContent
  agentName?: string
  agentTitle?: string
  agentLicence?: string
  accentColor?: string
}

export function AgentNoteBlock({
  content,
  agentName,
  agentTitle,
  agentLicence,
  accentColor,
}: AgentNoteBlockEmailProps) {
  const accent = accentColor || '#4f35d2'
  const { body, sign_off, headshot_url, agent_name } = content

  if (!body) return null

  const displayName = agent_name || agentName || ''
  const displayTitle = agentTitle || ''
  const displayLicence = agentLicence || ''

  return (
    <Section style={{ backgroundColor: '#f4f2ff', padding: '0', margin: '0' }}>
      <Section style={{ padding: '28px 32px 24px' }}>
        {/* Eyebrow */}
        <Text
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '2px',
            color: accent,
            textTransform: 'uppercase',
            margin: '0 0 16px',
          }}
        >
          A Note From Your Agent
        </Text>

        {/* Optional headshot + name side by side */}
        {headshot_url ? (
          <table cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse', marginBottom: '16px' }}>
            <tbody>
              <tr>
                <td width="72" style={{ verticalAlign: 'top', paddingRight: '16px' }}>
                  <Img
                    src={headshot_url}
                    alt={displayName || 'Agent photo'}
                    width="56"
                    height="56"
                    style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'block', objectFit: 'cover' }}
                  />
                </td>
                {displayName && (
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text
                      style={{
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#1a1535',
                        margin: '0 0 2px',
                      }}
                    >
                      {displayName}
                    </Text>
                    {displayTitle && (
                      <Text
                        style={{
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                          fontSize: '12px',
                          color: '#6b6b8d',
                          margin: '0',
                        }}
                      >
                        {[displayTitle, displayLicence].filter(Boolean).join('  ·  ')}
                      </Text>
                    )}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        ) : null}

        {/* Body */}
        <Text
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
            fontSize: '15px',
            color: '#3a3a5c',
            margin: '0 0 16px',
            lineHeight: '1.65',
            fontStyle: 'italic',
          }}
        >
          {body}
        </Text>

        {/* Sign-off */}
        {sign_off && (
          <Text style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", fontSize: '14px', color: '#6b6b8d', margin: '0' }}>
            {sign_off}
          </Text>
        )}

        {/* Name if no headshot */}
        {!headshot_url && displayName && (
          <Text style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", fontSize: '15px', fontWeight: '600', color: '#1a1535', margin: '12px 0 0' }}>
            — {displayName}
          </Text>
        )}
      </Section>
    </Section>
  )
}
