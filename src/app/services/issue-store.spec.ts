import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { IssueStore, isIssueOverdue } from './issue-store';
import { Issue } from '../models/issue.model';

describe('IssueStore Business Rules & Logic', () => {
  let store: IssueStore;

  const mockSeedIssues: Issue[] = [
    {
      id: 'TRK-101',
      title: 'First test bug with minimum length',
      description: 'Desc 1',
      type: 'Bug',
      priority: 'Critical',
      status: 'To Do',
      assigneeId: null,
      storyPoints: 5,
      dueDate: '2026-11-10'
    },
    {
      id: 'TRK-102',
      title: 'Second test task for workflow',
      description: 'Desc 2',
      type: 'Task',
      priority: 'High',
      status: 'In Progress',
      assigneeId: 'tm-1',
      storyPoints: 3,
      dueDate: '2026-11-25'
    },
    {
      id: 'TRK-103',
      title: 'Third in progress issue for alice',
      description: 'Desc 3',
      type: 'Task',
      priority: 'Medium',
      status: 'In Progress',
      assigneeId: 'tm-1',
      storyPoints: 2,
      dueDate: '2026-11-26'
    },
    {
      id: 'TRK-104',
      title: 'Fourth in progress issue for alice reaching limit',
      description: 'Desc 4',
      type: 'Story',
      priority: 'Low',
      status: 'In Progress',
      assigneeId: 'tm-1',
      storyPoints: 1,
      dueDate: '2026-11-27'
    },
    {
      id: 'TRK-105',
      title: 'Completed story already in done state',
      description: 'Desc 5',
      type: 'Story',
      priority: 'Critical',
      status: 'Done',
      assigneeId: 'tm-2',
      storyPoints: 8,
      dueDate: '2026-11-01'
    }
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('issue_tracker_issues', JSON.stringify(mockSeedIssues));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        IssueStore
      ]
    });

    store = TestBed.inject(IssueStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('BR-1: Workflow Transitions', () => {
    it('should allow valid transitions: To Do -> In Progress', () => {
      // TRK-101 has null assignee and null/past dueDate; assign someone and set dueDate
      store.updateIssueDetails('TRK-101', {
        title: 'Updated title with valid length',
        priority: 'High',
        assigneeId: 'tm-2',
        storyPoints: 3,
        dueDate: '2026-11-30'
      });

      const res = store.moveIssueStatus('TRK-101', 'In Progress');
      expect(res.success).toBe(true);
      const updated = store.issues().find((i) => i.id === 'TRK-101');
      expect(updated?.status).toBe('In Progress');
    });

    it('should reject invalid transition: To Do -> Done', () => {
      const res = store.moveIssueStatus('TRK-101', 'Done');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Cannot move issue from "To Do" to "Done"');
    });

    it('should allow valid transition: In Progress -> In Review', () => {
      const res = store.moveIssueStatus('TRK-102', 'In Review');
      expect(res.success).toBe(true);
      const updated = store.issues().find((i) => i.id === 'TRK-102');
      expect(updated?.status).toBe('In Review');
    });

    it('should allow valid transition: In Progress -> To Do', () => {
      const res = store.moveIssueStatus('TRK-102', 'To Do');
      expect(res.success).toBe(true);
      const updated = store.issues().find((i) => i.id === 'TRK-102');
      expect(updated?.status).toBe('To Do');
    });

    it('should allow valid transition: Done -> To Do (Reopen)', () => {
      const res = store.moveIssueStatus('TRK-105', 'To Do');
      expect(res.success).toBe(true);
      const updated = store.issues().find((i) => i.id === 'TRK-105');
      expect(updated?.status).toBe('To Do');
    });
  });

  describe('BR-2: Assignee requirement for In Progress', () => {
    it('should block moving to In Progress without an assignee', () => {
      // TRK-101 has assigneeId: null
      const res = store.moveIssueStatus('TRK-101', 'In Progress');
      expect(res.success).toBe(false);
      expect(res.error).toContain('without an assignee');
    });

    it('should block unassigning an issue that is In Progress', () => {
      // TRK-102 is In Progress with tm-1
      const res = store.updateIssueDetails('TRK-102', {
        title: 'Title of at least five characters',
        priority: 'High',
        assigneeId: null,
        storyPoints: 3
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('cannot be unassigned');
    });
  });

  describe('BR-3: WIP Limit (Maximum 3 issues In Progress per person)', () => {
    it('should block moving a 4th issue to In Progress for the same person', () => {
      // tm-1 already has TRK-102, TRK-103, TRK-104 In Progress (3 issues)
      // Attempt to assign TRK-101 to tm-1 with a due date, then move to In Progress
      store.updateIssueDetails('TRK-101', {
        title: 'Title for TRK-101 testing WIP',
        priority: 'Critical',
        assigneeId: 'tm-1',
        storyPoints: 5,
        dueDate: '2026-11-30'
      });

      const res = store.moveIssueStatus('TRK-101', 'In Progress');
      expect(res.success).toBe(false);
      expect(res.error).toContain('WIP limit reached');
    });

    it('should block reassigning an In Progress issue to a person already at limit', () => {
      // Let's create an issue in progress with tm-2
      store.updateIssueDetails('TRK-101', {
        title: 'Issue for tm-2 to move to In Progress',
        priority: 'High',
        assigneeId: 'tm-2',
        storyPoints: 3,
        dueDate: '2026-11-30'
      });
      store.moveIssueStatus('TRK-101', 'In Progress');

      // Now attempt to reassign TRK-101 (which is In Progress) to tm-1 (who already has 3: TRK-102, 103, 104)
      const res = store.updateIssueDetails('TRK-101', {
        title: 'Issue for tm-2 to move to In Progress',
        priority: 'High',
        assigneeId: 'tm-1',
        storyPoints: 3
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('already has 3 issues In Progress (WIP limit reached)');
    });
  });

  describe('BR-4: Story Points validation', () => {
    it('should reject invalid story points', () => {
      const res = store.updateIssueDetails('TRK-101', {
        title: 'Valid title for points test',
        priority: 'Medium',
        assigneeId: null,
        storyPoints: 4 as any
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Story points must be one of 1, 2, 3, 5, 8');
    });
  });

  describe('BR-5: Reopening an issue (Done -> To Do)', () => {
    it('should clear due date when reopened, and block moving to In Progress until new due date is set', () => {
      // TRK-105 is Done and has dueDate '2026-11-01'
      const reopenRes = store.moveIssueStatus('TRK-105', 'To Do');
      expect(reopenRes.success).toBe(true);

      const reopened = store.issues().find((i) => i.id === 'TRK-105');
      expect(reopened?.status).toBe('To Do');
      expect(reopened?.dueDate).toBeNull(); // Due date cleared!

      // Attempt to move to In Progress without setting due date:
      const moveRes = store.moveIssueStatus('TRK-105', 'In Progress');
      expect(moveRes.success).toBe(false);
      expect(moveRes.error).toContain('A due date must be set before this issue can move to "In Progress"');

      // Now set a due date and retry
      store.updateIssueDetails('TRK-105', {
        title: reopened!.title,
        priority: reopened!.priority,
        assigneeId: reopened!.assigneeId,
        storyPoints: reopened!.storyPoints,
        dueDate: '2026-11-28'
      });

      const moveResAfterDate = store.moveIssueStatus('TRK-105', 'In Progress');
      expect(moveResAfterDate.success).toBe(true);
      const inProgress = store.issues().find((i) => i.id === 'TRK-105');
      expect(inProgress?.status).toBe('In Progress');
    });
  });

  describe('BR-6: Overdue calculation', () => {
    it('should consider issue overdue if dueDate is before today and status is not Done', () => {
      // Suppose today is 2026-11-20
      expect(isIssueOverdue('2026-11-10', 'To Do')).toBe(true);
      expect(isIssueOverdue('2026-11-10', 'In Progress')).toBe(true);
    });

    it('should NOT consider issue overdue if status is Done', () => {
      expect(isIssueOverdue('2026-11-10', 'Done')).toBe(false);
    });

    it('should NOT consider issue overdue if dueDate is today or in the future', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isIssueOverdue(today, 'To Do')).toBe(false);
      expect(isIssueOverdue('2099-12-31', 'To Do')).toBe(false);
    });

    it('should NOT consider issue overdue if dueDate is null', () => {
      expect(isIssueOverdue(null, 'To Do')).toBe(false);
    });
  });

  describe('BR-7: Completion Percentage', () => {
    it('should compute completion percentage as Done points / Total points * 100', () => {
      // mockSeedIssues points:
      // TRK-101: 5 (To Do)
      // TRK-102: 3 (In Progress)
      // TRK-103: 2 (In Progress)
      // TRK-104: 1 (In Progress)
      // TRK-105: 8 (Done)
      // Total points = 5 + 3 + 2 + 1 + 8 = 19
      // Done points = 8
      // 8 / 19 * 100 = 42.1% -> 42%
      expect(store.totalStoryPoints()).toBe(19);
      expect(store.doneStoryPoints()).toBe(8);
      expect(store.completionPercentage()).toBe(42);
    });
  });

  describe('BR-8 & FR-2: Summary bar vs Filtered issues', () => {
    it('should maintain total issues and open issues in summary bar while filtering', () => {
      expect(store.totalIssuesCount()).toBe(5);
      expect(store.openIssuesCount()).toBe(4);

      // Filter by assignee 'tm-1'
      store.setAssigneeFilter('tm-1');

      // Filtered issues should only be 3
      expect(store.filteredCount()).toBe(3);

      // But summary statistics still use ALL issues (BR-8)
      expect(store.totalIssuesCount()).toBe(5);
      expect(store.openIssuesCount()).toBe(4);
    });
  });

  describe('FR-5: Create Issue with Next ID', () => {
    it('should assign the next TRK- id and To Do status', () => {
      const res = store.createIssue({
        title: 'New shiny feature for users',
        description: 'New feature details',
        type: 'Story',
        priority: 'High',
        storyPoints: 5,
        dueDate: '2026-12-01',
        assigneeId: null
      });

      expect(res.success).toBe(true);
      const created = store.issues().find((i) => i.id === 'TRK-106');
      expect(created).toBeTruthy();
      expect(created?.id).toBe('TRK-106');
      expect(created?.status).toBe('To Do');
    });

    it('should reject issue creation if title is less than 5 characters', () => {
      const res = store.createIssue({
        title: 'Bug',
        description: 'Short',
        type: 'Bug',
        priority: 'Low',
        storyPoints: 1,
        dueDate: null,
        assigneeId: null
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('at least 5 characters');
    });
  });

  describe('UI Feedback & Toast Notifications', () => {
    it('should emit success toast when issue is created', () => {
      store.createIssue({
        title: 'Toast test feature story',
        description: 'Toast details',
        type: 'Story',
        priority: 'Medium',
        storyPoints: 3,
        dueDate: null,
        assigneeId: null
      });

      expect(store.toast()?.type).toBe('success');
      expect(store.toast()?.message).toContain('Created issue TRK-106');
    });

    it('should emit error toast when business rule is blocked', () => {
      // TRK-101 is unassigned; moving to In Progress is blocked by BR-2
      store.moveIssueStatus('TRK-101', 'In Progress');
      expect(store.toast()?.type).toBe('error');
      expect(store.toast()?.message).toContain('without an assignee');
    });

    it('should allow manually dismissing active toast', () => {
      store.showToast('info', 'Test notification');
      expect(store.toast()?.message).toBe('Test notification');

      store.dismissToast();
      expect(store.toast()).toBeNull();
    });
  });
});
