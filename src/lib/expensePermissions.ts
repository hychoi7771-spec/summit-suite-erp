// UI affordance only; expenses RLS remains authoritative for writes.
export const canManageExpenses = (role: string | null | undefined) =>
  role === 'ceo' || role === 'general_director';