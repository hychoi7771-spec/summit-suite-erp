import { describe, expect, it } from 'vitest';
import { expenseVisibilityPayload } from '@/components/expenses/ExpenseVisibilityControl';

describe('expense visibility settings', () => {
  it('ordinary expenses are visible to all staff without an individual allowlist', () => {
    expect(expenseVisibilityPayload({ is_confidential: false, allowed_viewer_ids: ['staff-a'] })).toEqual({ is_confidential: false, allowed_viewer_ids: [] });
  });
  it('confidential expenses retain only the selected staff', () => {
    expect(expenseVisibilityPayload({ is_confidential: true, allowed_viewer_ids: ['staff-a', 'staff-a', 'staff-b'] })).toEqual({ is_confidential: true, allowed_viewer_ids: ['staff-a', 'staff-b'] });
  });
  it('confidential expenses allow no additional staff when none are selected', () => {
    expect(expenseVisibilityPayload({ is_confidential: true, allowed_viewer_ids: [] })).toEqual({ is_confidential: true, allowed_viewer_ids: [] });
  });
});