export interface PreGoal {
  what: string;
  why: string;
  when: string;
  profile: Record<string, any>;
}

export interface Task {
  name: string;
  order: number;
  description?: string;
  duration_hours: number;
  deadline: string;
  simplicity: number;
  importance: number;
  urgency: number;
  completed: boolean;
  guid: string;
  muid: string;
}

export interface Milestone {
  muid: string;
  name: string;
  order: number;
  description?: string;
  tasks: Task[];
  deadline?: string;
  guid: string;
}

export interface Goal {
  guid: string;
  name: string;
  description?: string;
  deadline: string;
  progress: number;
  milestones: Milestone[];
}

export interface GoalPlan {
  goal: Goal;
  markdown: string;
} 