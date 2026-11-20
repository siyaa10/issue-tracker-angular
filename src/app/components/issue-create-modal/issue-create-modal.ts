import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  IssuePriority,
  IssueType,
  STORY_POINTS_OPTIONS,
  StoryPoints
} from '../../models/issue.model';
import { TeamMember } from '../../models/team.model';

@Component({
  selector: 'app-issue-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './issue-create-modal.html',
  styleUrl: './issue-create-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueCreateModalComponent {
  readonly team = input<TeamMember[]>([]);
  readonly ruleError = input<string | null>(null);

  readonly closeModal = output<void>();
  readonly createIssue = output<{
    title: string;
    description: string;
    type: IssueType;
    priority: IssuePriority;
    storyPoints: StoryPoints;
    dueDate: string | null;
    assigneeId: string | null;
  }>();

  readonly types = ISSUE_TYPES;
  readonly priorities = ISSUE_PRIORITIES;
  readonly storyPointsOptions = STORY_POINTS_OPTIONS;

  // Form field signals
  readonly title = signal<string>('');
  readonly description = signal<string>('');
  readonly type = signal<IssueType>('Task');
  readonly priority = signal<IssuePriority>('Medium');
  readonly storyPoints = signal<StoryPoints>(3);
  readonly dueDate = signal<string | null>(null);
  readonly assigneeId = signal<string | null>(null);

  // Field touch tracking for validation messages
  readonly titleTouched = signal<boolean>(false);
  readonly dueDateTouched = signal<boolean>(false);

  // Today in YYYY-MM-DD
  readonly todayString = new Date().toISOString().split('T')[0];

  // Validation computed signals (FR-5)
  readonly isTitleValid = computed(() => {
    return this.title().trim().length >= 5;
  });

  readonly isDueDateValid = computed(() => {
    const due = this.dueDate();
    if (!due) return true; // optional
    return due >= this.todayString; // cannot be in the past
  });

  readonly isFormValid = computed(() => {
    return this.isTitleValid() && this.isDueDateValid();
  });

  onAssigneeSelect(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.assigneeId.set(val === 'null' ? null : val);
  }

  onStoryPointsSelect(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value) as StoryPoints;
    this.storyPoints.set(val);
  }

  onSubmit(): void {
    this.titleTouched.set(true);
    this.dueDateTouched.set(true);

    if (!this.isFormValid()) {
      return;
    }

    this.createIssue.emit({
      title: this.title().trim(),
      description: this.description().trim(),
      type: this.type(),
      priority: this.priority(),
      storyPoints: this.storyPoints(),
      dueDate: this.dueDate(),
      assigneeId: this.assigneeId()
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal.emit();
    }
  }
}
