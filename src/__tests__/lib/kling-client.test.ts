/**
 * REQ-MEDIA L1 Unit Tests: kling/client.ts — video/image generation + task status
 *
 * Tests the Kling AI client functions. Global fetch is mocked — no real API traffic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  startVideoGeneration,
  startImageGeneration,
  getTaskStatus,
} from '@/lib/kling/client';

beforeEach(() => {
  mockFetch.mockReset();
  process.env.KLING_API_KEY = 'test-kling-key';
  process.env.KLING_API_BASE_URL = 'https://api.klingai.com/v1';
  process.env.KLING_IMAGE_API_BASE_URL = 'https://api.klingai.com/v1';
});

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe('startVideoGeneration', () => {
  it('REQ-MEDIA-001 TC-KL-001: sends correct payload and returns task_id @p0', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ task_id: 'vid_001' }));

    const taskId = await startVideoGeneration({
      imageUrl: 'https://cdn.example.com/hero.jpg',
      prompt: 'Cinematic flyover of luxury home',
      aspectRatio: '9:16',
      duration: 5,
    });

    expect(taskId).toBe('vid_001');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/images/generations');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.image_url).toBe('https://cdn.example.com/hero.jpg');
    expect(body.prompt).toBe('Cinematic flyover of luxury home');
    expect(body.aspect_ratio).toBe('9:16');
    expect(body.duration).toBe(5);
    expect(body.mode).toBe('professional');
  });
});

describe('startImageGeneration', () => {
  it('REQ-MEDIA-002 TC-KL-002: sends correct payload and returns task_id @p0', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ task_id: 'img_001' }));

    const taskId = await startImageGeneration({
      prompt: 'Luxury kitchen with marble counters',
      aspectRatio: '1:1',
    });

    expect(taskId).toBe('img_001');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [, opts] = mockFetch.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.prompt).toBe('Luxury kitchen with marble counters');
    expect(body.aspect_ratio).toBe('1:1');
    expect(body.resolution).toBe('8k');
  });
});

describe('getTaskStatus', () => {
  it('REQ-MEDIA-003 TC-KL-003: maps SUCCESS to completed @p0', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: 'SUCCESS', output: { video_url: 'https://cdn/v.mp4' } })
    );

    const result = await getTaskStatus('task_100');

    expect(result.status).toBe('completed');
    expect(result.taskId).toBe('task_100');
  });

  it('REQ-MEDIA-004 TC-KL-004: maps FAILED to failed @p0', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: 'FAILED', error_message: 'Content policy violation' })
    );

    const result = await getTaskStatus('task_101');

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBe('Content policy violation');
  });

  it('REQ-MEDIA-005 TC-KL-005: maps PENDING to pending @p0', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'PENDING' }));

    const result = await getTaskStatus('task_102');

    expect(result.status).toBe('pending');
  });

  it('REQ-MEDIA-006 TC-KL-006: extracts outputUrl from video_url or image_url @p1', async () => {
    // video_url in output
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: 'SUCCESS', output: { video_url: 'https://cdn/video.mp4' } })
    );
    const videoResult = await getTaskStatus('task_v');
    expect(videoResult.outputUrl).toBe('https://cdn/video.mp4');

    // image_url in output
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: 'COMPLETED', output: { image_url: 'https://cdn/image.png' } })
    );
    const imageResult = await getTaskStatus('task_i');
    expect(imageResult.outputUrl).toBe('https://cdn/image.png');

    // image_url in result (fallback path)
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: 'SUCCESS', result: { image_url: 'https://cdn/result.png' } })
    );
    const fallbackResult = await getTaskStatus('task_f');
    expect(fallbackResult.outputUrl).toBe('https://cdn/result.png');
  });

  it('REQ-MEDIA-007 TC-KL-007: handles HTTP error gracefully @p1', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    const result = await getTaskStatus('task_err');

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('500');
    expect(result.taskId).toBe('task_err');
  });
});
