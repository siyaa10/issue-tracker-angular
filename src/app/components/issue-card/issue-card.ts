import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Issue } from '../../models/issue.model';
import { isIssueOverdue } from '../../services/issue-store';

@Component({
  selector: 'app-issue-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './issue-card.html',
  styleUrl: './issue-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueCardComponent {
  readonly issue = input.required<Issue>();
  readonly teamMemberName = input<string>('Unassigned');
  readonly isSelected = input<boolean>(false);

  readonly cardClick = output<string>();

  readonly isOverdue = computed(() => {
    const item = this.issue();
    return isIssueOverdue(item.dueDate, item.status);
  });

  onCardClicked(): void {
    this.cardClick.emit(this.issue().id);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onCardClicked();
    }
  }
}
