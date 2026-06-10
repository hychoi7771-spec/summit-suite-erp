// 전자결재 세부 분류 정의 — 사이드바 하위 메뉴 / 템플릿 / 필터 키
import { FileText, Receipt, Briefcase, CalendarDays, Lightbulb, PartyPopper, ShoppingCart, FileSignature, Building2 } from 'lucide-react';

export type ApprovalCategoryKey =
  | 'planning_proposal'
  | 'event_proposal'
  | 'purchase_request'
  | 'contract_request'
  | 'business_trip'
  | 'general_document'
  | 'expense'
  | 'leave';

export interface ApprovalCategoryDef {
  key: ApprovalCategoryKey;
  label: string;
  /** approvals.type 열에 저장될 값 */
  type: 'document' | 'expense' | 'project' | 'leave';
  icon: any;
  template: string;
  placeholder?: string;
  /** 사이드바에 노출 여부 */
  inSidebar: boolean;
  /** 라우트 (expense/leave는 별도 페이지로) */
  route?: string;
}

export const APPROVAL_CATEGORIES: ApprovalCategoryDef[] = [
  {
    key: 'planning_proposal',
    label: '기획안 품의',
    type: 'document',
    icon: Lightbulb,
    placeholder: '예) 2026년 하반기 신제품 라인업 기획',
    template: `[1] 기획 배경 / 시장 현황
- 

[2] 목표 및 KPI
- 목표: 
- 측정 지표: 

[3] 실행 방안
- 

[4] 추진 일정
- 시작: 
- 종료: 
- 주요 마일스톤: 

[5] 예상 예산
- 

[6] 기대 효과 및 리스크
- 효과: 
- 리스크 / 대응: 
`,
    inSidebar: true,
  },
  {
    key: 'event_proposal',
    label: '행사안 품의',
    type: 'document',
    icon: PartyPopper,
    placeholder: '예) 2026 봄 신제품 런칭 쇼케이스',
    template: `[행사명]
- 

[일시 / 장소]
- 일시: 
- 장소: 

[참석 대상 / 인원]
- 

[행사 목적 및 컨셉]
- 

[프로그램 구성 / 타임라인]
- 

[예산 내역]
- 대관: 
- 케이터링: 
- 제작물: 
- 기타: 
- 합계: 

[운영 인력 및 역할 분담]
- 

[기대 효과]
- 
`,
    inSidebar: true,
  },
  {
    key: 'purchase_request',
    label: '구매 품의',
    type: 'document',
    icon: ShoppingCart,
    placeholder: '예) 사무용 노트북 3대 구매 건',
    template: `[품목 / 사양]
- 

[수량 / 단가 / 총액]
- 수량: 
- 단가: 
- 총액: 

[구매처 / 비교 견적]
- 1순위: 
- 2순위: 

[구매 사유 및 필요성]
- 

[납기 / 결제 조건]
- 납기: 
- 결제: 
`,
    inSidebar: true,
  },
  {
    key: 'contract_request',
    label: '계약 품의',
    type: 'document',
    icon: FileSignature,
    placeholder: '예) ○○사 OEM 생산 계약 체결',
    template: `[계약 상대방]
- 회사명: 
- 담당자 / 연락처: 

[계약 종류]
- (예: 용역 / 공급 / 임대 / NDA 등)

[계약 기간]
- 시작: 
- 종료: 

[계약 금액 및 결제 조건]
- 금액: 
- 결제 조건: 

[주요 조건 및 검토 사항]
- 

[리스크 검토]
- 법무: 
- 재무: 

[첨부] 계약서 초안 / 견적서 등
`,
    inSidebar: true,
  },
  {
    key: 'business_trip',
    label: '출장 품의',
    type: 'document',
    icon: Building2,
    placeholder: '예) 부산 거래처 미팅 출장',
    template: `[출장지]
- 

[출장 기간]
- 출발: 
- 복귀: 

[출장 목적]
- 

[방문처 / 미팅 대상]
- 

[일정]
- 

[예상 경비]
- 교통비: 
- 숙박비: 
- 식대: 
- 기타: 
- 합계: 

[기대 성과]
- 
`,
    inSidebar: true,
  },
  {
    key: 'general_document',
    label: '일반 기안',
    type: 'document',
    icon: FileText,
    placeholder: '예) 사내 규정 개정 건',
    template: `[제안 배경]
- 

[제안 내용]
- 

[기대 효과]
- 

[필요 자원 / 일정]
- 
`,
    inSidebar: true,
  },
  {
    key: 'expense',
    label: '경비 결재',
    type: 'expense',
    icon: Receipt,
    template: '',
    inSidebar: true,
    route: '/expenses',
  },
  {
    key: 'leave',
    label: '휴가 / 근태',
    type: 'leave',
    icon: CalendarDays,
    template: '',
    inSidebar: true,
    route: '/attendance',
  },
];

export const getCategoryByKey = (key?: string | null) =>
  APPROVAL_CATEGORIES.find(c => c.key === key);
