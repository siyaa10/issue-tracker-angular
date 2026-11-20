import { IssuePriority } from './issue.model';

export type AssigneeFilter = 'All' | 'Unassigned' | string;
export type PriorityFilter = 'All' | IssuePriority;

export interface IssueFilterCriteria {
  searchTerm: string;
  assignee: AssigneeFilter;
  priority: PriorityFilter;
}

export const INITIAL_FILTER: IssueFilterCriteria = {
  searchTerm: '',
  assignee: 'All',
  priority: 'All'
};
