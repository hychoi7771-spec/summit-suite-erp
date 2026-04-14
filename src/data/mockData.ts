import { TeamMember, Product, Task, Meeting, Expense, SalesData, DailyLog, AssetFile } from '@/types';

export const teamMembers: TeamMember[] = [
  { id: '1', name: 'James Park', nameKr: '박재민', role: 'CEO', roleKr: '대표이사', avatar: 'JP', status: 'working' },
  { id: '2', name: 'Soo-Jin Kim', nameKr: '김수진', role: 'General Director', roleKr: '총괄이사', avatar: 'SK', status: 'working' },
  { id: '3', name: 'Min-Ho Lee', nameKr: '이민호', role: 'Deputy GM', roleKr: '차장 (개발/마케팅)', avatar: 'ML', status: 'away' },
  { id: '4', name: 'Hye-Won Choi', nameKr: '최혜원', role: 'MD', roleKr: '영업담당', avatar: 'HC', status: 'working' },
  { id: '5', name: 'Ji-Yeon Song', nameKr: '송지연', role: 'Designer', roleKr: '디자이너', avatar: 'JS', status: 'offline' },
  { id: '6', name: 'Dong-Hyun Yoon', nameKr: '윤동현', role: 'Staff', roleKr: '사원', avatar: 'DY', status: 'working' },
];

export const products: Product[] = [
  { id: 'p1', name: '리커버리랩 미백 치약', category: '의약외품', stage: 'Certification', assignee: '3', progress: 68, deadline: '2026-04-15', description: '의약외품 인증 미백 프리미엄 치약' },
  { id: 'p2', name: '시카 리커버리 세럼', category: '뷰티', stage: 'Design', assignee: '5', progress: 45, deadline: '2026-05-01', description: '민감성 피부를 위한 센텔라 아시아티카 리커버리 세럼' },
  { id: 'p3', name: '콜라겐 펩타이드 보충제', category: '건강기능식품', stage: 'R&D/Sampling', assignee: '3', progress: 30, deadline: '2026-06-15', description: '해양 콜라겐 펩타이드 일일 보충제' },
  { id: 'p4', name: '효소 치약 (민감용)', category: '의약외품', stage: 'Planning', assignee: '6', progress: 10, deadline: '2026-07-01', description: '민감한 치아를 위한 효소 기반 치약' },
  { id: 'p5', name: '비타민C 브라이트닝 앰플', category: '뷰티', stage: 'Production', assignee: '5', progress: 85, deadline: '2026-03-20', description: '고농축 비타민C 앰플' },
];

export const tasks: Task[] = [
  { id: 't1', title: '치약 제형 보고서 최종 확인', description: 'KFDA 제출용 최종 제형 보고서 완성', status: 'in-progress', priority: 'high', assigneeId: '3', dueDate: '2026-03-10', tags: ['의약외품', '인증'] },
  { id: 't2', title: '세럼 패키지 목업 디자인', description: '시카 리커버리 세럼 패키지 컨셉 3종 제작', status: 'todo', priority: 'medium', assigneeId: '5', dueDate: '2026-03-15', tags: ['디자인', '뷰티'] },
  { id: 't3', title: '와디즈 캠페인 페이지 초안', description: '와디즈 크라우드펀딩 페이지 카피 및 레이아웃 작성', status: 'review', priority: 'high', assigneeId: '4', dueDate: '2026-03-08', tags: ['마케팅', '영업'] },
  { id: 't4', title: '콜라겐 샘플 테스트 - 2차', description: '안정성 테스트를 위해 3개 연구소에 샘플 발송', status: 'todo', priority: 'medium', assigneeId: '6', dueDate: '2026-03-20', tags: ['R&D', '건강기능식품'] },
  { id: 't5', title: 'Q1 재무 보고서 작성', description: '이사회 보고를 위한 Q1 경비 및 매출 정리', status: 'in-progress', priority: 'urgent', assigneeId: '2', dueDate: '2026-03-12', tags: ['재무', '보고서'] },
  { id: 't6', title: '브랜드 가이드라인 v2.0 업데이트', description: '새 제품 라인 추가에 따른 브랜드 가이드라인 업데이트', status: 'done', priority: 'low', assigneeId: '5', dueDate: '2026-03-01', tags: ['디자인', '브랜딩'] },
  { id: 't7', title: 'Q2 OEM 단가 협상', description: 'Q2 생산 물량에 대한 코스맥스 단가 협상', status: 'todo', priority: 'high', assigneeId: '2', dueDate: '2026-03-18', tags: ['생산', '구매'] },
  { id: 't8', title: '카카오 메이커스 스토어 설정', description: '카카오 메이커스 스토어 리스팅 생성 및 설정', status: 'in-progress', priority: 'medium', assigneeId: '4', dueDate: '2026-03-14', tags: ['영업', '플랫폼'] },
];

export const meetings: Meeting[] = [
  { id: 'm1', title: '주간 제품 스탠드업', date: '2026-03-03', attendeeIds: ['1', '2', '3', '5'], category: '제품', notes: '치약 인증 진행 상황 검토. 세럼 디자인 컨셉 발표. 패키지 일정 앞당길 필요 있음.', actionItems: [] },
  { id: 'm2', title: 'Q2 영업 전략 회의', date: '2026-03-01', attendeeIds: ['1', '2', '4'], category: '영업', notes: '와디즈 런칭 일정 논의. 카카오 메이커스 입점 진행 중. 자사몰 개발은 4월로 연기.', actionItems: [] },
  { id: 'm3', title: 'OEM 파트너 검토', date: '2026-02-28', attendeeIds: ['2', '3', '6'], category: '운영', notes: '코스맥스 제안서 접수. 결정 전 다른 2개 OEM 파트너와 비교 필요.', actionItems: [] },
];

export const expenses: Expense[] = [
  { id: 'e1', date: '2026-03-01', amount: 2500000, category: '샘플링', description: '치약 제형 샘플 - 3차 배치', submittedBy: '3', status: 'Approved' },
  { id: 'e2', date: '2026-02-28', amount: 850000, category: '마케팅', description: '와디즈 캠페인 촬영비', submittedBy: '4', status: 'Pending' },
  { id: 'e3', date: '2026-02-25', amount: 150000, category: '일반', description: '팀 협업 도구 구독료', submittedBy: '6', status: 'Reimbursed' },
  { id: 'e4', date: '2026-03-02', amount: 4200000, category: '샘플링', description: '콜라겐 펩타이드 원료 샘플', submittedBy: '3', status: 'Pending' },
  { id: 'e5', date: '2026-02-20', amount: 320000, category: '마케팅', description: '인스타그램 광고비 - 2월', submittedBy: '4', status: 'Approved' },
];

export const salesData: SalesData[] = [
  { platform: '와디즈', month: '2026-01', revenue: 15200000, target: 20000000, roas: 3.2, orders: 245 },
  { platform: '와디즈', month: '2026-02', revenue: 18500000, target: 20000000, roas: 3.8, orders: 312 },
  { platform: '카카오 메이커스', month: '2026-01', revenue: 8300000, target: 10000000, roas: 2.5, orders: 156 },
  { platform: '카카오 메이커스', month: '2026-02', revenue: 11200000, target: 10000000, roas: 3.1, orders: 201 },
  { platform: '자사몰', month: '2026-01', revenue: 3200000, target: 5000000, roas: 1.8, orders: 89 },
  { platform: '자사몰', month: '2026-02', revenue: 4100000, target: 5000000, roas: 2.2, orders: 112 },
];

export const dailyLogs: DailyLog[] = [
  { id: 'dl1', userId: '3', date: '2026-03-03', todayWork: 'KFDA 제출 서류 검토, 제형 데이터 수정 완료', tomorrowPlan: '수정된 서류 규제팀에 제출', blockers: '외부 파트너 연구소 보고서 대기 중' },
  { id: 'dl2', userId: '5', date: '2026-03-03', todayWork: '시카 세럼 패키지 목업 2종 완료', tomorrowPlan: '3번째 컨셉 마무리 및 발표 준비', blockers: '없음' },
  { id: 'dl3', userId: '4', date: '2026-03-03', todayWork: '와디즈 캠페인 카피 최종안 작성, 사진작가 조율 완료', tomorrowPlan: '캠페인 페이지 시안 팀 리뷰', blockers: '디자이너에게 최종 제품 사진 필요' },
];

export const assetFiles: AssetFile[] = [
  { id: 'a1', name: '브랜드_가이드라인_v2.0.pdf', type: 'PDF', category: '브랜딩', uploadedBy: '5', uploadedAt: '2026-03-01', size: '12.4 MB', url: '#' },
  { id: 'a2', name: '치약_KFDA_인증서.pdf', type: 'PDF', category: '인증', uploadedBy: '3', uploadedAt: '2026-02-15', size: '2.1 MB', url: '#' },
  { id: 'a3', name: '시카_세럼_패키지_v1.ai', type: 'AI', category: '디자인', uploadedBy: '5', uploadedAt: '2026-03-02', size: '45.8 MB', url: '#' },
  { id: 'a4', name: '코스맥스_OEM_계약서_2026.pdf', type: 'PDF', category: '계약서', uploadedBy: '2', uploadedAt: '2026-01-20', size: '3.5 MB', url: '#' },
  { id: 'a5', name: '제품_사진_와디즈.zip', type: 'ZIP', category: '마케팅', uploadedBy: '4', uploadedAt: '2026-02-28', size: '156 MB', url: '#' },
];
