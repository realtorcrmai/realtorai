---
title: "Voice Agent"
slug: "voice-agent"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
content_status: approved
related_routes: []
changelog: []
---

# Voice Agent

## Problem Statement

Realtors are constantly on the move — driving between showings, sitting in client meetings, or walking through properties with buyers. In these situations, pulling out a laptop to navigate the CRM, look up contact details, or check listing counts is impractical. Voice-first interactions let you query your CRM and navigate the app without touching the keyboard. RealtorAI's Voice Agent is a floating conversational assistant that responds to spoken commands, answers questions about your data, navigates you to any page, and reads responses aloud — keeping your hands free and your attention where it matters.

## Business Value

Time spent clicking through menus and searching for information is time not spent with clients. The Voice Agent gives you instant hands-free access to your entire CRM — ask a question and get an answer in seconds, or say a destination and arrive there immediately. For realtors managing a busy day of showings and calls, voice interaction can save 20-30 minutes of manual navigation daily. It also reduces the learning curve for new CRM users who can simply ask for what they need instead of memorizing menu structures.

## Who Uses This

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Listing Agent** | Full access | Voice navigation, data queries, quick lookups |
| **Buyer Agent** | Full access | Contact searches, listing questions, hands-free CRM access |
| **Transaction Coordinator** | Full access | Quick data lookups, status checks |
| **Admin** | Full access | All voice commands and queries |

## Where to Find It

- The Voice Agent appears as a floating widget in the bottom-right corner of every page
- Click the microphone icon to activate voice input
- The chat panel expands to show your conversation history
- The widget is always accessible regardless of which page you are on

## Preconditions

- You must be logged in
- Your browser must allow microphone access (you will be prompted on first use)
- A working internet connection is required for speech recognition and AI processing
- For voice responses, your device speakers or headphones must be active (can be muted)

## Key Concepts

| Term | Definition |
|------|-----------|
| Voice Widget | The floating button in the bottom-right corner that activates the Voice Agent |
| Mic Button | Click to start speaking your command or question |
| Voice Response | The agent's spoken reply, powered by Edge TTS (text-to-speech) |
| Mute | Disables the voice response so the agent only replies in text within the chat panel |
| Conversation Mode | AUTO mode continuously listens after each response; MANUAL mode requires clicking the mic for each input |
| Session History | The scrollable chat panel showing all commands and responses from the current session |
| Navigation Command | A voice instruction that takes you to a specific page (e.g., "go to contacts") |
| Data Query | A voice question that retrieves information from your CRM (e.g., "how many active listings?") |

## Core Workflow

1. Click the microphone icon on the floating widget in the bottom-right corner
2. Speak your command or question clearly
3. The agent processes your speech and displays the transcription in the chat panel
4. For navigation commands: the app navigates to the requested page
5. For data queries: the agent retrieves the answer and displays it in the chat panel
6. The agent reads the response aloud (unless muted)
7. In AUTO mode, the mic reactivates for your next command; in MANUAL mode, click the mic again
8. Session history remains visible in the chat panel for reference

## End-to-End Scenarios

### Scenario: Navigate to a CRM page using voice

- **Role:** Listing Agent
- **Goal:** Quickly get to the contacts page while driving between appointments
- **Navigation:** Click the mic icon on the floating widget
- **Steps:**
  1. Click the microphone icon
  2. Say "Go to contacts"
  3. The agent confirms the navigation and the app loads the /contacts page
  4. The chat panel shows your command and the agent's response
- **Expected outcome:** The contacts page loads immediately
- **Edge cases:** Ambient noise causes the agent to mishear the command; the requested page does not exist
- **Common mistakes:** Speaking too quickly or mumbling, which results in inaccurate transcription
- **Recovery:** Click the mic and repeat the command more slowly and clearly

### Scenario: Ask a data question about your listings

- **Role:** Listing Agent
- **Goal:** Find out how many active listings you have without navigating to the listings page
- **Navigation:** Click the mic icon on the floating widget
- **Steps:**
  1. Click the microphone icon
  2. Say "How many active listings do I have?"
  3. The agent queries your CRM data and returns the count
  4. The response appears in the chat panel and is read aloud
- **Expected outcome:** The agent tells you the exact number of active listings
- **Edge cases:** You have no active listings; the data query times out
- **Common mistakes:** Asking overly complex multi-part questions that the agent cannot parse
- **Recovery:** Break the question into simpler parts and ask one at a time

### Scenario: Search for a specific contact by name

- **Role:** Buyer Agent
- **Goal:** Quickly look up a contact's information by speaking their name
- **Navigation:** Click the mic icon on the floating widget
- **Steps:**
  1. Click the microphone icon
  2. Say "Find Sarah Mitchell"
  3. The agent searches your contacts and returns matching results
  4. The response shows the contact's name, phone, email, and type
  5. Optionally say "Go to Sarah Mitchell's profile" to navigate to their contact page
- **Expected outcome:** The agent finds and displays the contact's key details
- **Edge cases:** Multiple contacts with the same name; no contact found with that name
- **Common mistakes:** Misspelling or mispronouncing the contact name
- **Recovery:** Try a partial name search (e.g., "find Sarah") to get broader results

### Scenario: Use continuous conversation mode for multiple queries

- **Role:** Listing Agent
- **Goal:** Ask several questions in a row without clicking the mic each time
- **Navigation:** Click the mic icon, ensure conversation mode is set to AUTO
- **Steps:**
  1. Set conversation mode to AUTO (toggle in the widget)
  2. Click the microphone to start
  3. Ask your first question: "How many showings do I have this week?"
  4. The agent responds and automatically reactivates the mic
  5. Ask a follow-up: "Show me listings"
  6. The agent navigates to listings and reactivates the mic again
  7. Continue the conversation as needed
  8. Click the mic icon to stop when done
- **Expected outcome:** A fluid back-and-forth conversation with the agent handling multiple requests
- **Edge cases:** Background noise triggers false activations in AUTO mode
- **Common mistakes:** Not switching to MANUAL mode in noisy environments
- **Recovery:** Toggle to MANUAL mode and click the mic intentionally for each command

### Scenario: Mute voice responses during a client meeting

- **Role:** Listing Agent
- **Goal:** Use the Voice Agent silently during a meeting — text responses only
- **Navigation:** Click the mute toggle on the Voice Agent widget
- **Steps:**
  1. Click the mute button on the widget to disable voice output
  2. Click the mic and speak your command quietly or use text input
  3. The agent processes the command and displays the response in the chat panel only
  4. No audio plays from the device
  5. Unmute when you are no longer in the meeting
- **Expected outcome:** All agent responses are text-only in the chat panel, no audio output
- **Edge cases:** Forgetting to unmute after the meeting and missing spoken responses later
- **Common mistakes:** Having the volume up in a quiet meeting room
- **Recovery:** Toggle the mute button to restore voice responses

## Step-by-Step Procedures

### Procedure: Activate the Voice Agent for the first time

- **When to use:** Your first time using the Voice Agent in a new browser or after clearing permissions
- **Starting point:** Any page in RealtorAI
- **Steps:**
  1. Locate the floating widget in the bottom-right corner of the screen
  2. Click the microphone icon
  3. Your browser will request microphone permission — click Allow
  4. The mic activates and the widget shows a listening indicator
  5. Speak a simple command to test: "Go to dashboard"
  6. The agent should navigate you to the dashboard and respond with a confirmation
  7. If voice response plays, the setup is complete
- **Validations:** Browser microphone permission must be granted; internet connection must be active
- **What happens next:** The Voice Agent is ready for use on all pages. Microphone permission persists across sessions in the same browser.
- **Common mistakes:** Clicking Deny on the microphone permission prompt, which prevents voice input
- **Recovery:** Go to your browser settings, find the site permissions, and re-enable microphone access for the RealtorAI domain

### Procedure: Switch between AUTO and MANUAL conversation modes

- **When to use:** You want to change whether the agent continuously listens or waits for mic clicks
- **Starting point:** Voice Agent widget on any page
- **Steps:**
  1. Open the Voice Agent widget by clicking it
  2. Find the conversation mode toggle (AUTO / MANUAL)
  3. Select AUTO for continuous listening — the mic reactivates after each response
  4. Select MANUAL for click-to-speak — you must click the mic for each new command
  5. The setting takes effect immediately
- **Validations:** The mode indicator updates on the widget
- **What happens next:** In AUTO mode, the agent listens for your next command as soon as it finishes responding. In MANUAL mode, the mic stays off until you click it.
- **Common mistakes:** Leaving AUTO mode on in noisy environments where background sound triggers the mic
- **Recovery:** Switch to MANUAL mode to prevent false activations

### Procedure: Review session history

- **When to use:** You need to reference a previous answer or command from the current session
- **Starting point:** Voice Agent widget on any page
- **Steps:**
  1. Click the Voice Agent widget to expand the chat panel
  2. Scroll up through the conversation history
  3. Each entry shows your command and the agent's response
  4. Use the information as needed (copy text, reference data)
- **Validations:** Session history is available for the current browser session only
- **What happens next:** History remains until you close the browser tab or refresh the page
- **Common mistakes:** Expecting session history to persist across page refreshes or browser sessions
- **Recovery:** Important information from the agent should be noted or acted upon immediately

## Validations and Rules

- Microphone permission must be granted in the browser for voice input to work
- Voice commands are processed through speech recognition — clear speech produces better results
- Navigation commands must reference valid pages in the application (contacts, listings, showings, pipeline, content, etc.)
- Data queries return live data from your CRM — results reflect the current state of your database
- The agent cannot perform write operations (create, update, delete) — it is read-only and navigational
- Voice responses use Edge TTS and require the device to have audio output capability
- Session history is per-tab and does not persist across browser sessions
- AUTO conversation mode continuously listens after each response until manually stopped
- MANUAL conversation mode requires a mic click for each new command

## Role Differences

| Role | Can View | Can Edit | Special Notes |
|------|----------|----------|---------------|
| **Listing Agent** | All CRM data via voice queries | None (voice is read-only) | Most frequent user — navigation and lookups |
| **Buyer Agent** | All CRM data via voice queries | None | Contact and listing searches |
| **Transaction Coordinator** | All CRM data via voice queries | None | Quick status checks |
| **Admin** | All CRM data via voice queries | None | Full query access |

## Edge Cases

1. **Noisy environment:** Background noise can interfere with speech recognition. Switch to MANUAL mode and speak clearly, or use text input in the chat panel if available.
2. **Browser does not support speech recognition:** Some older browsers may not support the Web Speech API. Use Chrome or Edge for the best compatibility.
3. **Agent misinterprets the command:** The transcription appears in the chat panel, showing what the agent heard. If incorrect, click the mic and rephrase more clearly.
4. **Requested page does not exist:** If you say "go to reports" but there is no reports page, the agent will indicate it cannot navigate there. Use a valid page name.
5. **Contact name is phonetically ambiguous:** Names that sound similar may return incorrect results. Try spelling out the last name or providing additional context (e.g., "find Sarah Mitchell the buyer").
6. **Internet connection drops during a query:** The voice command will not process. The widget may show an error or timeout. Restore your connection and try again.
7. **Multiple browser tabs open:** The Voice Agent operates independently per tab. Activating the mic in one tab does not affect others.

## Troubleshooting

| Symptom | Likely Cause | How to Verify | How to Fix | When to Escalate |
|---------|-------------|---------------|------------|-----------------|
| Mic icon does not respond | Microphone permission was denied | Check browser address bar for a blocked microphone icon | Go to browser settings and allow microphone access for the site | If permission is granted but mic still does not activate |
| Agent does not understand commands | Poor speech recognition due to accent, speed, or noise | Check the transcription in the chat panel — does it match what you said? | Speak more slowly and clearly; reduce background noise | If clear speech is consistently misinterpreted |
| No voice response plays | Device is muted or the agent voice is toggled off | Check the mute toggle on the widget; check device volume | Unmute the widget and increase device volume | If unmuted but audio still does not play |
| Chat panel is empty / no session history | Page was refreshed or browser session ended | Check if the page was recently reloaded | Session history resets on refresh — this is expected behavior | Not applicable — this is by design |
| Agent returns "I don't know" for data queries | The query does not match available data or the phrasing is unsupported | Try rephrasing the question in simpler terms | Use more specific queries (e.g., "how many active listings" instead of "tell me about my business") | If common questions consistently return no results |

## FAQ

### What commands does the Voice Agent understand?

The agent handles two types of input: navigation commands and data queries. Navigation commands include phrases like "go to contacts," "show me listings," "open the pipeline," or "navigate to showings." Data queries include questions like "how many active listings do I have?", "find Sarah Mitchell," or "what showings are scheduled this week?" Natural language is supported — you do not need to use exact command syntax.

### Can the Voice Agent create or update records?

No. The Voice Agent is currently read-only and navigational. It can look up data and navigate you to pages, but it cannot create contacts, update listings, or modify any records. To make changes, navigate to the relevant page and use the standard forms.

### Does the Voice Agent work on mobile?

Yes, the floating widget appears on mobile browsers as well. You will need to grant microphone permission on your mobile browser. The experience is the same as on desktop, though the chat panel may take up more of the screen on smaller devices.

### Is my voice data stored or recorded?

Voice input is processed through speech recognition to convert it to text. The text command and the agent's response are visible in the session history within the chat panel. Session history does not persist after closing the tab. Audio recordings are not stored.

### What is the difference between AUTO and MANUAL mode?

AUTO mode keeps the microphone listening after each agent response, allowing a continuous back-and-forth conversation without clicking the mic each time. MANUAL mode deactivates the mic after each response, requiring you to click the mic icon for each new command. Use AUTO for hands-free workflows and MANUAL in noisy environments or when you only need occasional queries.

### Can I type instead of speaking?

The chat panel supports the conversation history display. The primary input method is voice via the microphone. For hands-on situations where typing is easier, navigate directly using the app's standard navigation instead of the Voice Agent.

### What if the agent gives an incorrect answer?

The agent queries live CRM data, so answers should be accurate. If a response seems wrong, verify by navigating to the relevant page manually. Misinterpretation usually comes from speech recognition errors (check the transcription in the chat panel) rather than incorrect data retrieval. Rephrase and ask again for a better result.

## Related Features

| Feature | Relationship | Impact |
|---------|-------------|--------|
| **Contact Management** | Voice queries can search contacts by name and return profile details | Contact data must exist for voice search to return results |
| **Listing Workflow** | Voice can navigate to listings and report listing counts | Listing data is queried live for voice responses |
| **Showing Management** | Voice can navigate to showings and report upcoming showing counts | Showing data is queried for scheduled appointment information |
| **Deal Pipeline** | Voice can navigate to the pipeline and report deal counts by stage | Pipeline data is queried for deal status information |
| **AI Content Engine** | Voice can navigate to the content dashboard | Navigation only — content generation requires the UI |

## Escalation Guidance

**Fix yourself:**
- Microphone not working — check browser permissions and device microphone settings
- Agent misunderstanding commands — speak more slowly, reduce background noise, rephrase
- No audio response — check mute toggle on the widget and device volume
- Session history lost — this is expected after page refresh; note important information immediately

**Needs admin:**
- Voice Agent widget does not appear on any page — requires front-end investigation
- Speech recognition consistently fails regardless of input quality — may be a service issue
- Agent returns errors instead of responses — requires server-side investigation

**Information to gather before escalating:**
- The browser and version you are using
- Whether microphone permission is granted (check browser settings)
- The exact command you spoke and what the agent transcribed
- Screenshots of the chat panel showing the error or unexpected response
- Whether the issue occurs on all pages or only specific ones
