import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-summary-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-bar.html',
  styleUrl: './summary-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryBarComponent {
  readonly totalIssues = input<number>(0);
  readonly openIssues = input<number>(0);
  readonly overdueIssues = input<number>(0);
  readonly completionPercentage = input<number>(0);
  readonly totalStoryPoints = input<number>(0);
  readonly doneStoryPoints = input<number>(0);

  readonly newIssueClick = output<void>();
  readonly resetDataClick = output<void>();
}
