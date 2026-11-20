import { Injectable, computed, effect, linkedSignal, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import {
  ALLOWED_STATUS_TRANSITIONS,
  Issue,
  IssuePriority,
  IssueStatus,
  IssueType,
  PRIORITY_WEIGHTS,
  STORY_POINTS_OPTIONS,
  StoryPoints
} from '../models/issue.model';
import { TeamMember } from '../models/team.model';
import { AssigneeFilter, PriorityFilter } from '../models/filter.model';

const STORAGE_KEY = 'issue_tracker_issues';

export function isIssueOverdue(dueDate: string | null, status: IssueStatus): boolean {
  if (!dueDate || status === 'Done') {
    return false;
  }
  const today = new Date().toISOString().split('T')[0];
  return dueDate < today;
}

export interface ToastNotification {
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class IssueStore {
  // HTTP Resources for seed loading
  readonly #seedIssues = httpResource<Issue[]>(() => '/issues.json');
  readonly #seedTeam = httpResource<TeamMember[]>(() => '/team.json');

  // Private writable signals
  readonly #issues = linkedSignal<Issue[]>(() => {
    const seed = this.#seedIssues.value();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as Issue[];
        }
      } catch {
        // fallback to seed
      }
    }
    return seed ? [...seed] : [];
  });

  readonly #team = linkedSignal<TeamMember[]>(() => {
    const seedTeam = this.#seedTeam.value();
    return seedTeam ? [...seedTeam] : [];
  });

  readonly #selectedIssueId = signal<string | null>(null);
  readonly #searchQuery = signal<string>('');
  readonly #assigneeFilter = signal<AssigneeFilter>('All');
  readonly #priorityFilter = signal<PriorityFilter>('All');
  readonly #ruleError = signal<string | null>(null);
  readonly #isCreateModalOpen = signal<boolean>(false);
  readonly #toast = signal<ToastNotification | null>(null);

  // Debounced search signal (300ms)
  readonly #debouncedSearch = toSignal(
    toObservable(this.#searchQuery).pipe(debounceTime(300)),
    { initialValue: '' }
  );

  // Public read-only signals
  readonly issues = this.#issues.asReadonly();
  readonly team = this.#team.asReadonly();
  readonly selectedIssueId = this.#selectedIssueId.asReadonly();
  readonly searchQuery = this.#searchQuery.asReadonly();
  readonly assigneeFilter = this.#assigneeFilter.asReadonly();
  readonly priorityFilter = this.#priorityFilter.asReadonly();
  readonly ruleError = this.#ruleError.asReadonly();
  readonly isCreateModalOpen = this.#isCreateModalOpen.asReadonly();
  readonly toast = this.#toast.asReadonly();

  // Resource status
  readonly isLoading = computed(() => this.#seedIssues.isLoading() || this.#seedTeam.isLoading());
  readonly loadError = computed(() => {
    const issueErr = this.#seedIssues.error();
    if (issueErr) return 'Failed to load seed issues.';
    const teamErr = this.#seedTeam.error();
    if (teamErr) return 'Failed to load team members.';
    return null;
  });

  // Selected issue
  readonly selectedIssue = computed(() => {
    const id = this.#selectedIssueId();
    if (!id) return null;
    return this.#issues().find((item) => item.id === id) ?? null;
  });

  // Summary bar computed metrics (BR-8: always uses all issues)
  readonly totalIssuesCount = computed(() => this.#issues().length);
  readonly openIssuesCount = computed(
    () => this.#issues().filter((issue) => issue.status !== 'Done').length
  );
  readonly overdueIssuesCount = computed(
    () => this.#issues().filter((issue) => isIssueOverdue(issue.dueDate, issue.status)).length
  );
  readonly totalStoryPoints = computed(
    () => this.#issues().reduce((sum, issue) => sum + issue.storyPoints, 0)
  );
  readonly doneStoryPoints = computed(
    () => this.#issues()
      .filter((issue) => issue.status === 'Done')
      .reduce((sum, issue) => sum + issue.storyPoints, 0)
  );
  readonly completionPercentage = computed(() => {
    const total = this.totalStoryPoints();
    if (total === 0) return 0;
    const done = this.doneStoryPoints();
    return Math.round((done / total) * 100);
  });

  // Filtered issues (FR-2)
  readonly filteredIssues = computed(() => {
    const term = (this.#debouncedSearch() ?? '').trim().toLowerCase();
    const assignee = this.#assigneeFilter();
    const priority = this.#priorityFilter();

    return this.#issues().filter((issue) => {
      // Search by title or id (case-insensitive)
      if (term) {
        const matchesTitle = issue.title.toLowerCase().includes(term);
        const matchesId = issue.id.toLowerCase().includes(term);
        if (!matchesTitle && !matchesId) {
          return false;
        }
      }

      // Assignee filter: 'All' | 'Unassigned' | specific assigneeId
      if (assignee !== 'All') {
        if (assignee === 'Unassigned') {
          if (issue.assigneeId !== null) return false;
        } else {
          if (issue.assigneeId !== assignee) return false;
        }
      }

      // Priority filter: 'All' | specific priority
      if (priority !== 'All') {
        if (issue.priority !== priority) return false;
      }

      return true;
    });
  });

  readonly filteredCount = computed(() => this.filteredIssues().length);

  // Group and sort column issues (FR-1: sorted by priority Critical first, then due date earliest first)
  readonly todoIssues = computed(() => this.getColumnIssues('To Do'));
  readonly inProgressIssues = computed(() => this.getColumnIssues('In Progress'));
  readonly inReviewIssues = computed(() => this.getColumnIssues('In Review'));
  readonly doneIssues = computed(() => this.getColumnIssues('Done'));

  constructor() {
    // Single persistence effect (runs whenever #issues changes, saving to localStorage)
    effect(() => {
      const current = this.#issues();
      // Ensure we don't overwrite with empty before initial seed/storage is populated
      if (current && current.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      }
    });
  }

  // Column helper: filter by status and sort per FR-1
  private getColumnIssues(status: IssueStatus): Issue[] {
    const column = this.filteredIssues().filter((issue) => issue.status === status);
    return column.sort((a, b) => {
      // 1. Sort by Priority (Critical first, then High, Medium, Low)
      const pDiff = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
      if (pDiff !== 0) {
        return pDiff;
      }
      // 2. Sort by Due Date (earliest first, nulls last)
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }

  // Helper to count issues in progress for a team member
  getInProgressCountForMember(assigneeId: string, excludeIssueId?: string): number {
    return this.#issues().filter(
      (item) => item.status === 'In Progress' && item.assigneeId === assigneeId && item.id !== excludeIssueId
    ).length;
  }

  // Get team member name by id
  getTeamMemberName(assigneeId: string | null): string {
    if (!assigneeId) return 'Unassigned';
    const member = this.#team().find((m) => m.id === assigneeId);
    return member ? member.name : 'Unknown';
  }

  // Store actions
  setSearchQuery(query: string): void {
    this.#searchQuery.set(query);
  }

  setAssigneeFilter(filter: AssigneeFilter): void {
    this.#assigneeFilter.set(filter);
  }

  setPriorityFilter(filter: PriorityFilter): void {
    this.#priorityFilter.set(filter);
  }

  clearFilters(): void {
    this.#searchQuery.set('');
    this.#assigneeFilter.set('All');
    this.#priorityFilter.set('All');
  }

  selectIssue(id: string | null): void {
    this.#selectedIssueId.set(id);
    this.#ruleError.set(null);
  }

  openCreateModal(): void {
    this.#isCreateModalOpen.set(true);
    this.#ruleError.set(null);
  }

  closeCreateModal(): void {
    this.#isCreateModalOpen.set(false);
  }

  clearRuleError(): void {
    this.#ruleError.set(null);
  }

  showToast(type: 'success' | 'error' | 'info', message: string): void {
    this.#toast.set({ type, message });
    setTimeout(() => {
      if (this.#toast()?.message === message) {
        this.#toast.set(null);
      }
    }, 4000);
  }

  dismissToast(): void {
    this.#toast.set(null);
  }

  // BR-1, BR-2, BR-3, BR-5: Status Move
  moveIssueStatus(issueId: string, targetStatus: IssueStatus): { success: boolean; error?: string } {
    this.#ruleError.set(null);
    const issue = this.#issues().find((item) => item.id === issueId);
    if (!issue) {
      const err = 'Issue not found.';
      this.showToast('error', err);
      return { success: false, error: err };
    }

    if (issue.status === targetStatus) {
      return { success: true };
    }

    // BR-1: Check permitted transitions
    const allowed = ALLOWED_STATUS_TRANSITIONS[issue.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      const err = `Cannot move issue from "${issue.status}" to "${targetStatus}". Permitted moves: ${allowed.join(', ') || 'None'}.`;
      this.#ruleError.set(err);
      this.showToast('error', err);
      return { success: false, error: err };
    }

    // BR-2: An issue cannot move to In Progress without an assignee
    if (targetStatus === 'In Progress') {
      if (!issue.assigneeId) {
        const err = 'An issue cannot move to "In Progress" without an assignee.';
        this.#ruleError.set(err);
        this.showToast('error', err);
        return { success: false, error: err };
      }

      // BR-5: When reopened (Done -> To Do), dueDate is cleared and must be set again before moving to In Progress
      if (!issue.dueDate) {
        const err = 'A due date must be set before this issue can move to "In Progress".';
        this.#ruleError.set(err);
        this.showToast('error', err);
        return { success: false, error: err };
      }

      // BR-3: WIP limit. Max 3 issues In Progress per person
      const currentWip = this.getInProgressCountForMember(issue.assigneeId, issue.id);
      if (currentWip >= 3) {
        const memberName = this.getTeamMemberName(issue.assigneeId);
        const err = `WIP limit reached: ${memberName} already has 3 issues In Progress. Maximum allowed is 3.`;
        this.#ruleError.set(err);
        this.showToast('error', err);
        return { success: false, error: err };
      }
    }

    // Prepare updated issue
    let updatedDueDate = issue.dueDate;
    // BR-5: When an issue is reopened (Done -> To Do), its due date is cleared
    if (issue.status === 'Done' && targetStatus === 'To Do') {
      updatedDueDate = null;
    }

    const updated: Issue = {
      ...issue,
      status: targetStatus,
      dueDate: updatedDueDate
    };

    // Immutable update
    this.#issues.update((list) => list.map((item) => (item.id === issueId ? updated : item)));
    this.showToast('success', `${issue.id} moved to "${targetStatus}".`);
    return { success: true };
  }

  // FR-4, BR-2, BR-3, BR-4: Edit issue details
  updateIssueDetails(
    issueId: string,
    updates: {
      title: string;
      priority: IssuePriority;
      assigneeId: string | null;
      storyPoints: StoryPoints;
      description?: string;
      dueDate?: string | null;
    }
  ): { success: boolean; error?: string } {
    this.#ruleError.set(null);
    const issue = this.#issues().find((item) => item.id === issueId);
    if (!issue) {
      return { success: false, error: 'Issue not found.' };
    }

    // Title validation
    const trimmedTitle = updates.title.trim();
    if (!trimmedTitle || trimmedTitle.length < 5) {
      const err = 'Title is required and must be at least 5 characters.';
      this.#ruleError.set(err);
      this.showToast('error', err);
      return { success: false, error: err };
    }

    // BR-4: Story points validation
    if (!STORY_POINTS_OPTIONS.includes(updates.storyPoints)) {
      const err = 'Story points must be one of 1, 2, 3, 5, 8.';
      this.#ruleError.set(err);
      this.showToast('error', err);
      return { success: false, error: err };
    }

    // BR-2: An issue that is In Progress cannot be unassigned
    if (issue.status === 'In Progress' && updates.assigneeId === null) {
      const err = 'An issue that is In Progress cannot be unassigned.';
      this.#ruleError.set(err);
      this.showToast('error', err);
      return { success: false, error: err };
    }

    // BR-3: WIP limit check if issue is In Progress and reassigned
    if (issue.status === 'In Progress' && updates.assigneeId && updates.assigneeId !== issue.assigneeId) {
      const targetWip = this.getInProgressCountForMember(updates.assigneeId, issue.id);
      if (targetWip >= 3) {
        const memberName = this.getTeamMemberName(updates.assigneeId);
        const err = `Cannot reassign: ${memberName} already has 3 issues In Progress (WIP limit reached).`;
        this.#ruleError.set(err);
        this.showToast('error', err);
        return { success: false, error: err };
      }
    }

    const updated: Issue = {
      ...issue,
      title: trimmedTitle,
      priority: updates.priority,
      assigneeId: updates.assigneeId,
      storyPoints: updates.storyPoints,
      description: updates.description !== undefined ? updates.description : issue.description,
      dueDate: updates.dueDate !== undefined ? updates.dueDate : issue.dueDate
    };

    // Immutable update
    this.#issues.update((list) => list.map((item) => (item.id === issueId ? updated : item)));
    this.showToast('success', `Changes saved for ${issue.id}.`);
    return { success: true };
  }

  // FR-5: Create new issue
  createIssue(payload: {
    title: string;
    description: string;
    type: IssueType;
    priority: IssuePriority;
    storyPoints: StoryPoints;
    dueDate: string | null;
    assigneeId: string | null;
  }): { success: boolean; error?: string } {
    this.#ruleError.set(null);

    const trimmedTitle = payload.title.trim();
    if (!trimmedTitle || trimmedTitle.length < 5) {
      const err = 'Title is required and must be at least 5 characters.';
      this.#ruleError.set(err);
      this.showToast('error', err);
      return { success: false, error: err };
    }

    // Due date cannot be in the past
    if (payload.dueDate) {
      const today = new Date().toISOString().split('T')[0];
      if (payload.dueDate < today) {
        const err = 'Due date cannot be in the past.';
        this.#ruleError.set(err);
        this.showToast('error', err);
        return { success: false, error: err };
      }
    }

    // BR-4: Story points validation
    if (!STORY_POINTS_OPTIONS.includes(payload.storyPoints)) {
      const err = 'Story points must be one of 1, 2, 3, 5, 8.';
      this.#ruleError.set(err);
      this.showToast('error', err);
      return { success: false, error: err };
    }

    // Compute next ID: format TRK-116 after TRK-115
    const nextId = this.getNextIssueId();

    const newIssue: Issue = {
      id: nextId,
      title: trimmedTitle,
      description: payload.description.trim(),
      type: payload.type,
      priority: payload.priority,
      status: 'To Do', // FR-5: status To Do
      assigneeId: payload.assigneeId,
      storyPoints: payload.storyPoints,
      dueDate: payload.dueDate
    };

    // Immutable append
    this.#issues.update((list) => [...list, newIssue]);
    this.#isCreateModalOpen.set(false);
    this.showToast('success', `Created issue ${nextId} in To Do.`);
    return { success: true };
  }

  private getNextIssueId(): string {
    let maxNum = 100;
    for (const issue of this.#issues()) {
      const match = issue.id.match(/^TRK-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
    return `TRK-${maxNum + 1}`;
  }

  // FR-6: Reset Data
  resetData(): void {
    localStorage.removeItem(STORAGE_KEY);
    const freshSeed = this.#seedIssues.value();
    if (freshSeed && freshSeed.length > 0) {
      this.#issues.set([...freshSeed]);
    } else {
      this.#seedIssues.reload();
    }
    this.#selectedIssueId.set(null);
    this.#ruleError.set(null);
    this.clearFilters();
    this.showToast('info', 'Workspace reset to original seed data.');
  }
}
