import { describe, expect, it } from 'vitest';
import { canManageExpenses } from '@/lib/expensePermissions';

describe('expense administration', () => {
  it('allows the general director to edit and delete any expense', () => {
    expect(canManageExpenses('general_director')).toBe(true);
  });
  it('allows the CEO to edit and delete any expense', () => {
    expect(canManageExpenses('ceo')).toBe(true);
  });
  it('does not expose administrator editing or deletion to other roles', () => {
    for (const role of ['staff', 'deputy_gm', 'md', 'designer', 'managing_director', 'assistant_manager', null]) {
      expect(canManageExpenses(role)).toBe(false);
    }
  });
});