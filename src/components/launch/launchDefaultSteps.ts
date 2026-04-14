export interface DefaultStep {
  phase: string;
  step_name: string;
  position: number;
  is_critical: boolean;
  category_filter: string[]; // empty = all categories
}

export const PHASES = [
  '기획', 'R&D', '인허가/시험', '디자인', '심의', '생산', '런칭 준비',
] as const;

export const PHASE_COLORS: Record<string, string> = {
  '기획': 'hsl(var(--primary))',
  'R&D': 'hsl(var(--info))',
  '인허가/시험': 'hsl(var(--warning))',
  '디자인': 'hsl(var(--accent))',
  '심의': 'hsl(var(--destructive))',
  '생산': 'hsl(var(--success))',
  '런칭 준비': 'hsl(210, 60%, 50%)',
};

export const PHASE_BG_COLORS: Record<string, string> = {
  '기획': 'bg-primary/10 text-primary border-primary/20',
  'R&D': 'bg-info/10 text-info border-info/20',
  '인허가/시험': 'bg-warning/10 text-warning border-warning/20',
  '디자인': 'bg-accent/10 text-accent border-accent/20',
  '심의': 'bg-destructive/10 text-destructive border-destructive/20',
  '생산': 'bg-success/10 text-success border-success/20',
  '런칭 준비': 'bg-info/10 text-info border-info/20',
};

export const DEFAULT_STEPS: DefaultStep[] = [
  // 기획
  { phase: '기획', step_name: '시장조사', position: 0, is_critical: false, category_filter: [] },
  { phase: '기획', step_name: '컨셉 설정', position: 1, is_critical: false, category_filter: [] },
  { phase: '기획', step_name: '브랜드명 확정', position: 2, is_critical: false, category_filter: [] },
  // R&D
  { phase: 'R&D', step_name: '처방(레시피) 확정', position: 3, is_critical: false, category_filter: [] },
  { phase: 'R&D', step_name: '샘플 테스트', position: 4, is_critical: false, category_filter: [] },
  { phase: 'R&D', step_name: '단가(견적) 산출', position: 5, is_critical: false, category_filter: [] },
  // 인허가/시험
  { phase: '인허가/시험', step_name: '임상시험', position: 6, is_critical: true, category_filter: ['의약외품', '건강기능식품'] },
  { phase: '인허가/시험', step_name: '자가시험', position: 7, is_critical: false, category_filter: [] },
  { phase: '인허가/시험', step_name: '기능성 보고/품목신고', position: 8, is_critical: true, category_filter: ['의약외품'] },
  // 디자인
  { phase: '디자인', step_name: '제품 패키지', position: 9, is_critical: false, category_filter: [] },
  { phase: '디자인', step_name: '단상자', position: 10, is_critical: false, category_filter: [] },
  { phase: '디자인', step_name: '상세페이지 제작', position: 11, is_critical: false, category_filter: [] },
  // 심의
  { phase: '심의', step_name: '광고 심의 (포장지)', position: 12, is_critical: true, category_filter: ['의약외품'] },
  { phase: '심의', step_name: '광고 심의 (상세페이지)', position: 13, is_critical: true, category_filter: [] },
  { phase: '심의', step_name: '광고 심의 (영상)', position: 14, is_critical: true, category_filter: [] },
  // 생산
  { phase: '생산', step_name: '부자재(용기/박스) 발주', position: 15, is_critical: false, category_filter: [] },
  { phase: '생산', step_name: '내용물 생산 발주', position: 16, is_critical: false, category_filter: [] },
  { phase: '생산', step_name: '완제품 입고', position: 17, is_critical: false, category_filter: [] },
  // 런칭 준비
  { phase: '런칭 준비', step_name: '바코드 생성', position: 18, is_critical: false, category_filter: [] },
  { phase: '런칭 준비', step_name: '물류 입고', position: 19, is_critical: false, category_filter: [] },
  { phase: '런칭 준비', step_name: '판매 채널 세팅', position: 20, is_critical: false, category_filter: [] },
];

// Default dependencies: source must complete before target can start
export const DEFAULT_DEPENDENCIES: [string, string][] = [
  ['처방(레시피) 확정', '임상시험'],
  ['처방(레시피) 확정', '자가시험'],
  ['처방(레시피) 확정', '단가(견적) 산출'],
  ['제품 패키지', '광고 심의 (포장지)'],
  ['상세페이지 제작', '광고 심의 (상세페이지)'],
  ['광고 심의 (포장지)', '부자재(용기/박스) 발주'],
  ['단가(견적) 산출', '내용물 생산 발주'],
  ['부자재(용기/박스) 발주', '완제품 입고'],
  ['내용물 생산 발주', '완제품 입고'],
  ['완제품 입고', '바코드 생성'],
  ['완제품 입고', '물류 입고'],
  ['기능성 보고/품목신고', '생산'],
];
