import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamMember } from '../../models/team.model';
import { AssigneeFilter, PriorityFilter } from '../../models/filter.model';
import { ISSUE_PRIORITIES } from '../../models/issue.model';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterBarComponent {
  readonly team = input<TeamMember[]>([]);
  readonly searchQuery = input<string>('');
  readonly assigneeFilter = input<AssigneeFilter>('All');
  readonly priorityFilter = input<PriorityFilter>('All');
  readonly filteredCount = input<number>(0);
  readonly totalCount = input<number>(0);

  readonly searchChange = output<string>();
  readonly assigneeChange = output<AssigneeFilter>();
  readonly priorityChange = output<PriorityFilter>();
  readonly clearFiltersClick = output<void>();

  readonly priorities = ISSUE_PRIORITIES;

  get isFiltered(): boolean {
    return (
      (this.searchQuery() ?? '').trim().length > 0 ||
      this.assigneeFilter() !== 'All' ||
      this.priorityFilter() !== 'All'
    );
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }

  onAssigneeSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AssigneeFilter;
    this.assigneeChange.emit(value);
  }

  onPrioritySelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PriorityFilter;
    this.priorityChange.emit(value);
  }

  clearSearch(inputElem: HTMLInputElement): void {
    inputElem.value = '';
    this.searchChange.emit('');
  }
}
