export type UserRole = 'CEO' | 'General Director' | 'Deputy GM' | 'MD' | 'Designer' | 'Staff';

export type PresenceStatus = 'working' | 'away' | 'offline';

export interface TeamMember {
  id: string;
  name: string;
  nameKr: string;
  role: UserRole;
  roleKr: string;
  avatar: string;
  status: PresenceStatus;
}

export type ProductCategory = '의약외품' | '뷰티' | '건강기능식품';
export type ProductStage = 'Planning' | 'R&D/Sampling' | 'Design' | 'Certification' | 'Production' | 'Launch';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  stage: ProductStage;
  assignee: string;
  progress: number;
  deadline: string;
  description: string;
}

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
  tags: string[];
  meetingId?: string;
}

export interface DailyLog {
  id: string;
  userId: string;
  date: string;
  todayWork: string;
  tomorrowPlan: string;
  blockers: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  attendeeIds: string[];
  category: string;
  notes: string;
  actionItems: Task[];
}

export type ExpenseCategory = '샘플링' | '마케팅' | '일반' | '출장' | '장비';
export type ExpenseStatus = 'Pending' | 'Approved' | 'Reimbursed' | 'Rejected';

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  submittedBy: string;
  status: ExpenseStatus;
  receiptUrl?: string;
}

export interface SalesData {
  platform: string;
  month: string;
  revenue: number;
  target: number;
  roas: number;
  orders: number;
}

export interface AssetFile {
  id: string;
  name: string;
  type: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  url: string;
}
