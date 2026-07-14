// 전자결재 세부 분류 정의 — 사이드바 하위 메뉴 / 템플릿 / 필터 키
import { FileText, Receipt, CalendarDays } from 'lucide-react';

export type ApprovalCategoryKey =
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

/** 통합된 "문서 기안" 하위에 포함되는 레거시 subcategory 키 */
export const DOCUMENT_LEGACY_SUBCATEGORIES = [
  'general_document',
  'planning_proposal',
  'event_proposal',
  'purchase_request',
  'contract_request',
  'business_trip',
] as const;

export const APPROVAL_CATEGORIES: ApprovalCategoryDef[] = [
  {
    key: 'general_document',
    label: '문서 기안',
    type: 'document',
    icon: FileText,
    placeholder: '예) 2026 봄 신제품 런칭 쇼케이스 / 사무용 노트북 구매 등',
    template: `[품의 종류]
- (예: 기획안 / 행사안 / 구매 / 계약 / 출장 / 일반 기안)

[제목 / 개요]
- 

[배경 및 목적]
- 

[세부 내용]
- (일시·장소·수량·사양·거래처 등 해당 항목을 자유롭게 기재)

[일정]
- 시작: 
- 종료: 
- 주요 마일스톤: 

[예상 예산]
- 항목별 내역: 
- 합계: 

[기대 효과 / 리스크]
- 효과: 
- 리스크·대응: 

[첨부] 견적서 / 기획서 / 계약서 초안 등
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
