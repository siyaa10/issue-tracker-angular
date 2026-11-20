import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Issue, IssueStatus } from '../../models/issue.model';
import { IssueCardComponent } from '../issue-card/issue-card';

@Component({
  selector: 'app-board-column',
  standalone: true,
  imports: [CommonModule, IssueCardComponent],
  templateUrl: './board-column.html',
  styleUrl: './board-column.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoardColumnComponent {
  readonly status = input.required<IssueStatus>();
  readonly issues = input.required<Issue[]>();
  readonly selectedIssueId = input<string | null>(null);
  readonly teamMemberLookup = input<Record<string, string>>({});

  readonly issueSelect = output<string>();

  readonly issueCount = computed(() => this.issues().length);
  readonly totalStoryPoints = computed(() =>
    this.issues().reduce((sum, issue) => sum + issue.storyPoints, 0)
  );

  getMemberName(assigneeId: string | null): string {
    if (!assigneeId) return 'Unassigned';
    return this.teamMemberLookup()[assigneeId] ?? 'Unknown';
  }
}
