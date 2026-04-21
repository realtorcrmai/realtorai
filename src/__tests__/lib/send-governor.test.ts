/**
 * REQ-NEWSLETTER L1 Unit Tests: send-governor.ts — getOptimalSendTime
 *
 * Tests the pure function getOptimalSendTime which determines the best
 * day/hour to send an email based on contact intelligence and realtor config.
 * No DB, no network — pure logic only.
 */

import { describe, it, expect } from 'vitest';
import { getOptimalSendTime } from '@/lib/send-governor';

describe('getOptimalSendTime', () => {
  it('REQ-NEWSLETTER TC-SG-001: returns contact timing when data_points >= 5 @p0', () => {
    const contactIntelligence = {
      timing_patterns: {
        best_day: 'wednesday',
        best_hour: 14,
        data_points: 10,
      },
    };
    const realtorConfig = {
      default_send_day: 'friday',
      default_send_hour: 11,
    };

    const result = getOptimalSendTime(contactIntelligence, realtorConfig);

    expect(result).toEqual({ day: 'wednesday', hour: 14 });
  });

  it('REQ-NEWSLETTER TC-SG-002: ignores contact timing when data_points < 5 @p1', () => {
    const contactIntelligence = {
      timing_patterns: {
        best_day: 'wednesday',
        best_hour: 14,
        data_points: 3,
      },
    };
    const realtorConfig = {
      default_send_day: 'friday',
      default_send_hour: 11,
    };

    const result = getOptimalSendTime(contactIntelligence, realtorConfig);

    expect(result).toEqual({ day: 'friday', hour: 11 });
  });

  it('REQ-NEWSLETTER TC-SG-003: falls back to realtor config when no contact timing @p0', () => {
    const contactIntelligence = null;
    const realtorConfig = {
      default_send_day: 'monday',
      default_send_hour: 10,
    };

    const result = getOptimalSendTime(contactIntelligence, realtorConfig);

    expect(result).toEqual({ day: 'monday', hour: 10 });
  });

  it('REQ-NEWSLETTER TC-SG-004: falls back to defaults when both null @p0', () => {
    const result = getOptimalSendTime(null, null);

    expect(result).toEqual({ day: 'tuesday', hour: 9 });
  });

  it('REQ-NEWSLETTER TC-SG-005: falls back to defaults when both empty objects @p1', () => {
    const result = getOptimalSendTime({}, {});

    expect(result).toEqual({ day: 'tuesday', hour: 9 });
  });

  it('REQ-NEWSLETTER TC-SG-006: uses realtor config when contact intelligence missing timing_patterns key @p1', () => {
    const contactIntelligence = {
      engagement_score: 85,
      // no timing_patterns key
    };
    const realtorConfig = {
      default_send_day: 'thursday',
      default_send_hour: 15,
    };

    const result = getOptimalSendTime(contactIntelligence, realtorConfig);

    expect(result).toEqual({ day: 'thursday', hour: 15 });
  });

  it('REQ-NEWSLETTER TC-SG-007: uses contact timing when data_points is exactly 5 @p2', () => {
    const contactIntelligence = {
      timing_patterns: {
        best_day: 'saturday',
        best_hour: 8,
        data_points: 5,
      },
    };

    const result = getOptimalSendTime(contactIntelligence, null);

    expect(result).toEqual({ day: 'saturday', hour: 8 });
  });

  it('REQ-NEWSLETTER TC-SG-008: uses realtor config when contact has timing but best_hour is undefined @p2', () => {
    const contactIntelligence = {
      timing_patterns: {
        best_day: 'monday',
        // best_hour missing
        data_points: 10,
      },
    };
    const realtorConfig = {
      default_send_day: 'wednesday',
      default_send_hour: 13,
    };

    const result = getOptimalSendTime(contactIntelligence, realtorConfig);

    expect(result).toEqual({ day: 'wednesday', hour: 13 });
  });

  it('REQ-NEWSLETTER TC-SG-009: handles best_hour of 0 (midnight) as valid @p2', () => {
    const contactIntelligence = {
      timing_patterns: {
        best_day: 'sunday',
        best_hour: 0,
        data_points: 7,
      },
    };

    const result = getOptimalSendTime(contactIntelligence, null);

    expect(result).toEqual({ day: 'sunday', hour: 0 });
  });
});
