export interface FeatureUpdate {
  version: string;      // 정렬/식별용 (예: '2026.07.31-1')
  date: string;         // 배포일
  title: string;
  items: string[];      // 기능 설명
  path?: string;        // 바로가기 경로
}

// 신규 기능 업데이트만 등록합니다. (버그 수정은 등록하지 않음)
// 최신 항목을 배열 맨 위에 추가하세요.
export const FEATURE_UPDATES: FeatureUpdate[] = [
  {
    version: '2026.07.31-1',
    date: '2026-07-31',
    title: '업무 리포트(엑셀 다운로드) 기능 추가',
    items: [
      '업무 관리 화면 상단에 "업무 리포트" 버튼이 추가되었습니다.',
      '단계별(할 일·진행 중·검토·완료·예약) 시트로 나뉜 엑셀 파일을 받을 수 있습니다.',
      '담당자·카테고리·우선순위·프로젝트·키워드로 조건을 세분화해 추출할 수 있습니다.',
      '기간 기준(등록일/마감일/시작일/최종수정일)과 기한초과·담당자 미지정 등 필터를 지원합니다.',
      '정렬 기준, 시트 분리 방식(단계/담당자/카테고리), 출력할 열도 직접 선택할 수 있습니다.',
    ],
    path: '/tasks',
  },
];

export const LATEST_UPDATE_VERSION = FEATURE_UPDATES[0]?.version ?? '';

const key = (userId: string) => `feature-update-seen:${userId}`;

export function getSeenVersion(userId: string): string | null {
  try {
    return localStorage.getItem(key(userId));
  } catch {
    return null;
  }
}

export function markUpdatesSeen(userId: string, version: string) {
  try {
    localStorage.setItem(key(userId), version);
  } catch {
    /* ignore */
  }
}

/** 사용자가 아직 확인하지 않은 업데이트 목록 */
export function getUnseenUpdates(userId: string): FeatureUpdate[] {
  const seen = getSeenVersion(userId);
  if (!seen) return FEATURE_UPDATES;
  return FEATURE_UPDATES.filter(u => u.version > seen);
}
