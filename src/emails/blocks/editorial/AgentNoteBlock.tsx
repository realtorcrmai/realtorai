import * as React from 'react'
import { Section, Text, Img } from '@react-email/components'
import type { AgentNoteBlockContent } from '@/types/editorial'

export interface AgentNoteBlockEmailProps {
  content: AgentNoteBlockContent
  /** Branding fallback for agent name/title if not in content */
  agentName?: string
  agentTitle?: string
  agentLicence?: string
}

const FOREST_GREEN = '#1a2e1a'
const GOLD = '#c9a96e'
const BODY_TEXT = '#d0d8c8'
const MUTED_GREEN = '#8aaa8a'

export function AgentNoteBlock({
  content,
  agentName,
  agentTitle,
  agentLicence,
}: AgentNoteBlockEmailProps) {
  const { body, sign_off, headshot_url, agent_name } = content

  if (!body) return null

  const displayName = agent_name || agentName || ''
  const displayTitle = agentTitle || ''
  const displayLicence = agentLicence || ''

  return (
    <Section
      style={{
        backgroundColor: FOREST_GREEN,
        padding: '0',
        margin: '0',
      }}
    >
      <Section style={{ padding: '32px 40px 28px' }}>
        {/* Eyebrow */}
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '2.5px',
            color: GOLD,
            textTransform: 'uppercase',
            margin: '0 0 20px',
          }}
        >
          A Note From Your Agent
        </Text>

        {/* Optional headshot + name side by side */}
        {headshot_url ? (
          <table
            cellPadding="0"
            cellSpacing="0"
            style={{ borderCollapse: 'collapse', marginBottom: '20px' }}
          >
            <tbody>
              <tr>
                <td
                  width="72"
                  style={{ verticalAlign: 'top', paddingRight: '16px' }}
                >
                  <Img
                    src={headshot_url}
                    alt={displayName || 'Agent photo'}
                    width="60"
                    height="60"
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '4px',
                      display: 'block',
                      objectFit: 'cover',
                    }}
                  />
                </td>
                {displayName && (
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: '16px',
                        fontWeight: '700',
                        color: GOLD,
                        margin: '0 0 2px',
                      }}
                    >
                      {displayName}
                    </Text>
                    {displayTitle && (
                      <Text
                        style={{
                          fontFamily: 'Arial, Helvetica, sans-serif',
                          fontSize: '12px',
                          color: MUTED_GREEN,
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

        {/* Body note */}
        <Text
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '16px',
            color: BODY_TEXT,
            margin: '0 0 20px',
            lineHeight: '1.75',
            fontStyle: 'italic',
          }}
        >
          {body}
        </Text>

        {/* Sign-off */}
        {sign_off && (
          <Text
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '14px',
              color: MUTED_GREEN,
              margin: '0',
            }}
          >
            {sign_off}
          </Text>
        )}

        {/* Name + licence if no headshot */}
        {!headshot_url && displayName && (
          <Text
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: '15px',
              fontWeight: '700',
              color: GOLD,
              margin: '16px 0 0',
            }}
          >
            {displayName}
            {displayTitle && (
              <Text
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '12px',
                  color: MUTED_GREEN,
                  margin: '2px 0 0',
                  fontWeight: '400',
                  fontStyle: 'normal',
                }}
              >
                {[displayTitle, displayLicence].filter(Boolean).join('  ·  ')}
              </Text>
            )}
          </Text>
        )}
      </Section>
    </Section>
  )
}
