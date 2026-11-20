import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IssueStore } from '../../services/issue-store';
import { SummaryBarComponent } from '../summary-bar/summary-bar';
import { FilterBarComponent } from '../filter-bar/filter-bar';
import { BoardColumnComponent } from '../board-column/board-column';
import { IssueDetailPanelComponent } from '../issue-detail-panel/issue-detail-panel';
import { IssueCreateModalComponent } from '../issue-create-modal/issue-create-modal';
import { AssigneeFilter, PriorityFilter } from '../../models/filter.model';
import { IssuePriority, IssueStatus, StoryPoints } from '../../models/issue.model';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    SummaryBarComponent,
    FilterBarComponent,
    BoardColumnComponent,
    IssueDetailPanelComponent,
    IssueCreateModalComponent
  ],
  templateUrl: './board.html',
  styleUrl: './board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoardComponent {
  readonly store = inject(IssueStore);

  // In-app styled confirmation dialog state for Reset Data
  readonly isResetConfirmOpen = signal<boolean>(false);

  readonly teamMemberLookup = computed<Record<string, string>>(() => {
    const lookup: Record<string, string> = {};
    for (const m of this.store.team()) {
      lookup[m.id] = m.name;
    }
    return lookup;
  });

  onSearchChange(query: string): void {
    this.store.setSearchQuery(query);
  }

  onAssigneeChange(assignee: AssigneeFilter): void {
    this.store.setAssigneeFilter(assignee);
  }

  onPriorityChange(priority: PriorityFilter): void {
    this.store.setPriorityFilter(priority);
  }

  onClearFilters(): void {
    this.store.clearFilters();
  }

  onIssueSelected(issueId: string): void {
    this.store.selectIssue(issueId);
  }

  onCloseDetailPanel(): void {
    this.store.selectIssue(null);
  }

  onStatusChange(event: { issueId: string; newStatus: IssueStatus }): void {
    this.store.moveIssueStatus(event.issueId, event.newStatus);
  }

  onSaveIssueDetails(event: {
    issueId: string;
    title: string;
    priority: IssuePriority;
    assigneeId: string | null;
    storyPoints: StoryPoints;
    description: string;
    dueDate: string | null;
  }): void {
    this.store.updateIssueDetails(event.issueId, {
      title: event.title,
      priority: event.priority,
      assigneeId: event.assigneeId,
      storyPoints: event.storyPoints,
      description: event.description,
      dueDate: event.dueDate
    });
  }

  onOpenCreateModal(): void {
    this.store.openCreateModal();
  }

  onCloseCreateModal(): void {
    this.store.closeCreateModal();
  }

  onCreateIssue(payload: {
    title: string;
    description: string;
    type: any;
    priority: IssuePriority;
    storyPoints: StoryPoints;
    dueDate: string | null;
    assigneeId: string | null;
  }): void {
    this.store.createIssue(payload);
  }

  onPromptReset(): void {
    this.isResetConfirmOpen.set(true);
  }

  onCancelReset(): void {
    this.isResetConfirmOpen.set(false);
  }

  onConfirmReset(): void {
    this.isResetConfirmOpen.set(false);
    this.store.resetData();
  }
}
