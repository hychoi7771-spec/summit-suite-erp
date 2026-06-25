// 재고임박 판매독려 공지 등록 권한 화이트리스트
// 조정선 주임 profile_id
export const STOCK_ALERT_AUTHOR_PROFILE_IDS = new Set<string>([
  'e9fe0398-346d-4930-831a-0ed5c1b9c539',
]);

export function canManageStockAlerts(
  userRole: string | null | undefined,
  profileId: string | null | undefined,
): boolean {
  if (userRole === 'ceo' || userRole === 'general_director' || userRole === 'managing_director') {
    return true;
  }
  if (profileId && STOCK_ALERT_AUTHOR_PROFILE_IDS.has(profileId)) return true;
  return false;
}
