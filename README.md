# Issue Tracker – Angular 22

A Kanban-style Issue Tracker application built using **Angular 22** and **Signals** to manage Bugs, Tasks, and Stories through a simple and interactive board.

## Features

- Kanban board with four statuses: To Do, In Progress, In Review, and Done.
- Create, view, edit, and manage issues.
- Search issues by title or ID.
- Filter issues by assignee and priority.
- Issue summary showing open issues, overdue issues, and completion percentage.
- Story point tracking and priority-based sorting.
- Business rule validation for status transitions and workload limits.
- Data persistence using Local Storage.
- Reset functionality to restore the original seed data.
- Responsive user interface.

## Technologies Used

- Angular 22
- TypeScript
- Angular Signals
- HTML5
- SCSS
- RxJS
- Local Storage

## Project Setup

### Prerequisites

- Node.js
- npm
- Angular CLI

### Installation

Clone the repository:

```bash
git clone https://github.com/siyaa10/issue-tracker-angular.git
```

Navigate to the project directory:

```bash
cd issue-tracker-angular
```

Install dependencies:

```bash
npm install
```

### Run the Application

```bash
ng serve
```

Open your browser and navigate to:

`http://localhost:4200/`

### Run Tests

```bash
ng test --watch=false
```

### Production Build

```bash
ng build
```

## Project Structure

```text
issue-tracker-angular/
├── public/
│   ├── issues.json
│   └── team.json
├── src/
│   └── app/
│       ├── components/
│       ├── models/
│       └── services/
├── angular.json
├── package.json
├── package-lock.json
└── README.md
```

## Data

The application loads its initial issue and team data from JSON seed files in the `public` folder. Issue updates are persisted in browser Local Storage.

## Author

Developed as an Angular Signals-based Issue Tracker project.