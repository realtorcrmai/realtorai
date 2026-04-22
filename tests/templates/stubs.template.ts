/**
 * External Service Stubs — Realtors360 CRM
 *
 * Nock-based HTTP stubs for all external integrations.
 * Prevents real API calls during testing while providing realistic responses.
 *
 * Usage:
 *   import { stubs } from '../helpers/stubs';
 *
 *   beforeEach(() => { stubs.twilio.stubSendSMS(); });
 *   afterEach(() => { nock.cleanAll(); });
 */
import nock from 'nock';

// === Twilio Stubs ===
export const twilio = {
  /**
   * Stub successful SMS send via Twilio REST API
   */
  stubSendSMS(to = '+16045551234', body = 'Test message') {
    return nock('https://api.twilio.com')
      .post(/\/2010-04-01\/Accounts\/.*\/Messages\.json/)
      .reply(201, {
        sid: 'SM' + 'a'.repeat(32),
        to,
        from: '+16045550000',
        body,
        status: 'queued',
        date_created: new Date().toISOString(),
      });
  },

  /**
   * Stub successful WhatsApp send
   */
  stubSendWhatsApp(to = 'whatsapp:+16045551234') {
    return nock('https://api.twilio.com')
      .post(/\/2010-04-01\/Accounts\/.*\/Messages\.json/)
      .reply(201, {
        sid: 'SM' + 'b'.repeat(32),
        to,
        from: 'whatsapp:+16045550000',
        body: 'Test WhatsApp',
        status: 'queued',
      });
  },

  /**
   * Stub Twilio failure (e.g., invalid number)
   */
  stubSendFailure(errorCode = 21211) {
    return nock('https://api.twilio.com')
      .post(/\/2010-04-01\/Accounts\/.*\/Messages\.json/)
      .reply(400, {
        code: errorCode,
        message: 'The "To" number is not a valid phone number.',
        status: 400,
      });
  },

  /**
   * Generate a valid Twilio webhook signature for testing
   */
  generateSignature(url: string, params: Record<string, string>, authToken: string): string {
    const crypto = require('crypto');
    const data = url + Object.keys(params).sort().reduce((acc, key) => acc + key + params[key], '');
    return crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
  },
};

// === Resend Stubs ===
export const resend = {
  /**
   * Stub successful email send via Resend API
   */
  stubSendEmail(to = 'test@example.com') {
    return nock('https://api.resend.com')
      .post('/emails')
      .reply(200, {
        id: 'email_' + 'c'.repeat(24),
        from: 'Realtors360 <hello@realtors360.com>',
        to: [to],
        created_at: new Date().toISOString(),
      });
  },

  /**
   * Stub batch email send
   */
  stubBatchSend(count = 5) {
    return nock('https://api.resend.com')
      .post('/emails/batch')
      .reply(200, {
        data: Array.from({ length: count }, (_, i) => ({
          id: `email_batch_${i}`,
        })),
      });
  },

  /**
   * Stub Resend failure (rate limit)
   */
  stubRateLimit() {
    return nock('https://api.resend.com')
      .post('/emails')
      .reply(429, {
        statusCode: 429,
        message: 'Rate limit exceeded',
        name: 'rate_limit_exceeded',
      });
  },
};

// === Anthropic Claude Stubs ===
export const claude = {
  /**
   * Stub Claude messages.create for MLS remarks generation
   */
  stubGenerateRemarks(remarks = 'Beautiful 4-bedroom home in the heart of Vancouver.') {
    return nock('https://api.anthropic.com')
      .post('/v1/messages')
      .reply(200, {
        id: 'msg_' + 'd'.repeat(24),
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: remarks }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 150, output_tokens: 50 },
      });
  },

  /**
   * Stub Claude for newsletter content generation
   */
  stubGenerateNewsletter(content = 'Here is your weekly market update...') {
    return nock('https://api.anthropic.com')
      .post('/v1/messages')
      .reply(200, {
        id: 'msg_' + 'e'.repeat(24),
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: content }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 300, output_tokens: 200 },
      });
  },

  /**
   * Stub Claude failure (overloaded)
   */
  stubOverloaded() {
    return nock('https://api.anthropic.com')
      .post('/v1/messages')
      .reply(529, {
        type: 'error',
        error: { type: 'overloaded_error', message: 'Overloaded' },
      });
  },
};

// === Kling AI Stubs ===
export const kling = {
  /**
   * Stub Kling video generation task creation
   */
  stubCreateVideoTask(taskId = 'task_video_001') {
    return nock(process.env.KLING_API_BASE_URL || 'https://api.klingai.com')
      .post('/v1/videos/image2video')
      .reply(200, {
        code: 0,
        message: 'success',
        data: { task_id: taskId, task_status: 'submitted' },
      });
  },

  /**
   * Stub Kling image generation task creation
   */
  stubCreateImageTask(taskId = 'task_image_001') {
    return nock(process.env.KLING_IMAGE_API_BASE_URL || 'https://api.klingai.com')
      .post('/v1/images/generations')
      .reply(200, {
        code: 0,
        message: 'success',
        data: { task_id: taskId, task_status: 'submitted' },
      });
  },

  /**
   * Stub Kling task status polling (completed)
   */
  stubTaskCompleted(taskId = 'task_video_001', outputUrl = 'https://cdn.kling.ai/output.mp4') {
    return nock(process.env.KLING_API_BASE_URL || 'https://api.klingai.com')
      .get(`/v1/videos/image2video/${taskId}`)
      .reply(200, {
        code: 0,
        data: {
          task_id: taskId,
          task_status: 'succeed',
          task_result: { videos: [{ url: outputUrl, duration: '5.0' }] },
        },
      });
  },

  /**
   * Stub Kling task still processing
   */
  stubTaskProcessing(taskId = 'task_video_001') {
    return nock(process.env.KLING_API_BASE_URL || 'https://api.klingai.com')
      .get(`/v1/videos/image2video/${taskId}`)
      .reply(200, {
        code: 0,
        data: { task_id: taskId, task_status: 'processing' },
      });
  },
};

// === Google Calendar Stubs ===
export const googleCalendar = {
  /**
   * Stub Google Calendar events list
   */
  stubListEvents(events: Array<{ summary: string; start: string; end: string }> = []) {
    const items = events.map((e, i) => ({
      id: `event_${i}`,
      summary: e.summary,
      start: { dateTime: e.start },
      end: { dateTime: e.end },
      status: 'confirmed',
    }));

    return nock('https://www.googleapis.com')
      .get(/\/calendar\/v3\/calendars\/.*\/events/)
      .reply(200, { items, nextPageToken: null });
  },

  /**
   * Stub Google Calendar event creation
   */
  stubCreateEvent(eventId = 'event_new_001') {
    return nock('https://www.googleapis.com')
      .post(/\/calendar\/v3\/calendars\/.*\/events/)
      .reply(200, {
        id: eventId,
        status: 'confirmed',
        htmlLink: `https://calendar.google.com/event?eid=${eventId}`,
      });
  },

  /**
   * Stub Google Calendar freebusy query
   */
  stubFreeBusy(busySlots: Array<{ start: string; end: string }> = []) {
    return nock('https://www.googleapis.com')
      .post('/calendar/v3/freeBusy')
      .reply(200, {
        calendars: {
          primary: { busy: busySlots },
        },
      });
  },

  /**
   * Stub Google OAuth token refresh
   */
  stubTokenRefresh(accessToken = 'new_access_token_123') {
    return nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(200, {
        access_token: accessToken,
        expires_in: 3600,
        token_type: 'Bearer',
      });
  },
};

// === Python Form Server Stubs ===
export const formServer = {
  /**
   * Stub form HTML generation
   */
  stubGenerateForm(formType = 'DORTS', html = '<html><body>Form Content</body></html>') {
    return nock(process.env.REALTORS360_URL || 'http://127.0.0.1:8767')
      .post('/api/form/html')
      .reply(200, { html, form_type: formType });
  },

  /**
   * Stub form server unavailable
   */
  stubUnavailable() {
    return nock(process.env.REALTORS360_URL || 'http://127.0.0.1:8767')
      .post('/api/form/html')
      .replyWithError('connect ECONNREFUSED 127.0.0.1:8767');
  },
};

// === BC Geocoder Stubs ===
export const bcGeocoder = {
  /**
   * Stub BC Geocoder address lookup
   */
  stubGeocode(lat = 49.2827, lng = -123.1207) {
    return nock('https://geocoder.api.gov.bc.ca')
      .get(/\/addresses\.json/)
      .reply(200, {
        features: [
          {
            geometry: { coordinates: [lng, lat] },
            properties: {
              fullAddress: '123 Main St, Vancouver, BC',
              localityName: 'Vancouver',
              provinceCode: 'BC',
            },
          },
        ],
      });
  },
};

// === Utility ===

/**
 * Enable all stubs for a standard test run.
 * Call in beforeEach() for integration tests that touch multiple services.
 */
export function enableAllStubs() {
  twilio.stubSendSMS();
  resend.stubSendEmail();
  claude.stubGenerateRemarks();
  googleCalendar.stubListEvents();
}

/**
 * Clean all nock interceptors.
 * Call in afterEach() to ensure test isolation.
 */
export function cleanAllStubs() {
  nock.cleanAll();
}

/**
 * Assert all nock interceptors were consumed.
 * Call in afterEach() to verify expected API calls were made.
 */
export function assertAllStubsConsumed() {
  const pending = nock.pendingMocks();
  if (pending.length > 0) {
    throw new Error(`Unconsumed nock interceptors:\n${pending.join('\n')}`);
  }
}

export const stubs = {
  twilio,
  resend,
  claude,
  kling,
  googleCalendar,
  formServer,
  bcGeocoder,
  enableAllStubs,
  cleanAllStubs,
  assertAllStubsConsumed,
};
