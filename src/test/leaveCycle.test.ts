import { describe, it, expect } from 'vitest';
import { leaveExpiryNotice } from '@/lib/leaveCycle';

describe('leave expiry notice', () => {
  it('기존 직원은 11월에 소멸·16일 재생성 안내', () => {
    const n = leaveExpiryNotice({ cycle: 'company', fiscalEnd: '2026-12-01', today: '2026-11-19', remaining: 3 });
    expect(n).toContain('2026-11-30');
    expect(n).toContain('16일');
  });
  it('입사일 기준 직원은 마감 전 30일 이내에만 안내', () => {
    expect(leaveExpiryNotice({ cycle: 'hire_anniversary', fiscalEnd: '2027-03-04', today: '2026-11-19', remaining: 5 })).toBeNull();
    expect(leaveExpiryNotice({ cycle: 'hire_anniversary', fiscalEnd: '2027-03-04', today: '2027-02-10', remaining: 5 })).toContain('D-22');
  });
});
