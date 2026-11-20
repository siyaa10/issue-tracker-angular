export type IssueType = 'Bug' | 'Task' | 'Story';
export type IssuePriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type IssueStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done';
export type StoryPoints = 1 | 2 | 3 | 5 | 8;

export interface Issue {
  id: string;
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  assigneeId: string | null;
  storyPoints: StoryPoints;
  dueDate: string | null;
}

export const ALLOWED_STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  'To Do': ['In Progress'],
  'In Progress': ['In Review', 'To Do'],
  'In Review': ['Done', 'In Progress'],
  'Done': ['To Do']
};

export const STORY_POINTS_OPTIONS: StoryPoints[] = [1, 2, 3, 5, 8];
export const ISSUE_PRIORITIES: IssuePriority[] = ['Critical', 'High', 'Medium', 'Low'];
export const ISSUE_TYPES: IssueType[] = ['Bug', 'Task', 'Story'];
export const ISSUE_STATUSES: IssueStatus[] = ['To Do', 'In Progress', 'In Review', 'Done'];

export const PRIORITY_WEIGHTS: Record<IssuePriority, number> = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4
};
