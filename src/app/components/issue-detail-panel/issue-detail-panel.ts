import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ALLOWED_STATUS_TRANSITIONS,
  ISSUE_PRIORITIES,
  Issue,
  IssuePriority,
  IssueStatus,
  STORY_POINTS_OPTIONS,
  StoryPoints
} from '../../models/issue.model';
import { TeamMember } from '../../models/team.model';
import { isIssueOverdue } from '../../services/issue-store';

@Component({
  selector: 'app-issue-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './issue-detail-panel.html',
  styleUrl: './issue-detail-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueDetailPanelComponent {
  readonly issue = input.required<Issue>();
  readonly team = input<TeamMember[]>([]);
  readonly ruleError = input<string | null>(null);

  readonly closePanel = output<void>();
  readonly statusChange = output<{ issueId: string; newStatus: IssueStatus }>();
  readonly saveDetails = output<{
    issueId: string;
    title: string;
    priority: IssuePriority;
    assigneeId: string | null;
    storyPoints: StoryPoints;
    description: string;
    dueDate: string | null;
  }>();

  // Mode: view or edit
  // Reset automatically when the selected issue changes
  readonly isEditing = linkedSignal<boolean>(() => false);

  // Editable fields using linkedSignal (auto-resets when issue changes)
  readonly editTitle = linkedSignal<string>(() => this.issue().title);
  readonly editPriority = linkedSignal<IssuePriority>(() => this.issue().priority);
  readonly editAssigneeId = linkedSignal<string | null>(() => this.issue().assigneeId);
  readonly editStoryPoints = linkedSignal<StoryPoints>(() => this.issue().storyPoints);
  readonly editDescription = linkedSignal<string>(() => this.issue().description);
  readonly editDueDate = linkedSignal<string | null>(() => this.issue().dueDate);

  readonly localFormError = signal<string | null>(null);

  readonly priorities = ISSUE_PRIORITIES;
  readonly storyPointsOptions = STORY_POINTS_OPTIONS;

  readonly isOverdue = computed(() => {
    const item = this.issue();
    return isIssueOverdue(item.dueDate, item.status);
  });

  readonly allowedTransitions = computed<IssueStatus[]>(() => {
    return ALLOWED_STATUS_TRANSITIONS[this.issue().status] ?? [];
  });

  readonly assigneeName = computed(() => {
    const aId = this.issue().assigneeId;
    if (!aId) return 'Unassigned';
    const member = this.team().find((m) => m.id === aId);
    return member ? member.name : 'Unknown';
  });

  startEditing(): void {
    this.localFormError.set(null);
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    // Discard changes and revert
    this.editTitle.set(this.issue().title);
    this.editPriority.set(this.issue().priority);
    this.editAssigneeId.set(this.issue().assigneeId);
    this.editStoryPoints.set(this.issue().storyPoints);
    this.editDescription.set(this.issue().description);
    this.editDueDate.set(this.issue().dueDate);
    this.localFormError.set(null);
    this.isEditing.set(false);
  }

  onSave(): void {
    this.localFormError.set(null);
    const titleVal = this.editTitle().trim();
    if (!titleVal || titleVal.length < 5) {
      this.localFormError.set('Title is required and must be at least 5 characters.');
      return;
    }

    this.saveDetails.emit({
      issueId: this.issue().id,
      title: titleVal,
      priority: this.editPriority(),
      assigneeId: this.editAssigneeId(),
      storyPoints: this.editStoryPoints(),
      description: this.editDescription().trim(),
      dueDate: this.editDueDate()
    });

    // If no store rule error occurs, close edit mode
    // (We keep isEditing true if parent catches an error)
    setTimeout(() => {
      if (!this.ruleError() && !this.localFormError()) {
        this.isEditing.set(false);
      }
    }, 50);
  }

  onStatusClick(newStatus: IssueStatus): void {
    this.statusChange.emit({
      issueId: this.issue().id,
      newStatus
    });
  }

  onAssigneeSelect(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.editAssigneeId.set(val === 'null' ? null : val);
  }

  onStoryPointsSelect(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value) as StoryPoints;
    this.editStoryPoints.set(val);
  }
}
