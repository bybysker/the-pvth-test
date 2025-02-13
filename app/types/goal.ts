export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
  targetDate?: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  milestones: Milestone[];
  targetDate: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface GoalPlan {
  goal: Goal;
  markdown: string;
} 