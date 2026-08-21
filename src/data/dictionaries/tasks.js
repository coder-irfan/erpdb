const translations = {
  en: {
    metrics: {
      total: 'Total Tasks',
      totalHint: 'Tasks visible to you',
      progress: 'In Progress',
      progressHint: 'Currently active work',
      overdue: 'Overdue Tasks',
      overdueHint: 'Past due and not completed',
      hours: 'Hours Logged',
      hoursHint: '{actual} actual of {estimated} estimated'
    },
    views: { kanban: 'Kanban View', table: 'Table View' },
    filters: {
      search: 'Search tasks',
      searchPlaceholder: 'Title, description, or project...',
      project: 'Project',
      priority: 'Priority',
      status: 'Status',
      assignee: 'Assignee',
      allProjects: 'All projects',
      allPriorities: 'All priorities',
      allStatuses: 'All statuses',
      allAssignees: 'All assignees',
      clear: 'Clear filters'
    },
    table: {
      task: 'Title & Project',
      assignees: 'Assignees',
      priority: 'Priority',
      status: 'Status',
      dueDate: 'Due Date',
      hours: 'Hours Progress',
      actions: 'Actions'
    },
    actions: {
      add: 'New Task',
      view: 'View Details',
      edit: 'Edit Task',
      logHours: 'Log Hours',
      delete: 'Delete Task',
      cancel: 'Cancel',
      create: 'Create Task',
      save: 'Save Changes',
      saving: 'Saving...',
      changeStatus: 'Change Status',
      close: 'Close',
      log: 'Add Hours'
    },
    fields: {
      title: 'Title',
      project: 'Parent Project',
      description: 'Description',
      assignees: 'Staff Assignees',
      status: 'Status',
      priority: 'Priority',
      estimatedHours: 'Estimated Hours',
      actualHours: 'Actual Hours',
      dueDate: 'Due Date',
      completedAt: 'Completed At',
      createdBy: 'Created By',
      hoursToAdd: 'Hours to Add'
    },
    placeholders: {
      project: 'Select project',
      assignees: 'Select one or more staff',
      status: 'Select status',
      priority: 'Select priority'
    },
    form: {
      addTitle: 'Create Task',
      editTitle: 'Edit Task',
      description: 'Define ownership, priority, schedule, and working-hour estimates.'
    },
    detail: {
      title: 'Task Details',
      overview: 'Overview',
      schedule: 'Schedule & Hours',
      people: 'People',
      legacyAssignee: 'Legacy Assignee',
      created: 'Created',
      updated: 'Updated'
    },
    hours: {
      title: 'Log Task Hours',
      description: 'Add worked hours to the current actual-hours total.',
      current: 'Current logged hours: {hours}'
    },
    common: {
      unassigned: 'Unassigned',
      noDueDate: 'No due date',
      overdue: 'Overdue',
      completed: 'Completed',
      of: 'of',
      rowsPerPage: 'Rows per page:',
      loading: 'Loading...',
      notAvailable: '—'
    },
    empty: {
      title: 'No tasks found',
      description: 'Create a task or adjust the current search and filters.',
      column: 'No tasks in this status.'
    },
    delete: { title: 'Delete task', description: 'Delete {name}? This cannot be undone.' },
    validation: {
      required: 'This field is required.',
      titleTooLong: 'Title must not exceed 191 characters.',
      numberInvalid: 'Enter a valid non-negative number.',
      positiveInvalid: 'Enter a number greater than zero.',
      dateInvalid: 'Enter a valid date.',
      invalidRelation: 'One or more selected records are invalid.'
    },
    messages: {
      unauthenticated: 'Authentication is required.',
      forbidden: 'You do not have permission for this action.',
      staffProfileRequired: 'Your user account is not linked to a staff profile.',
      loadFailed: 'Tasks could not be loaded.',
      optionsLoadFailed: 'Task options could not be loaded.',
      detailLoadFailed: 'Task details could not be loaded.',
      notFound: 'Task was not found.',
      created: 'Task created successfully.',
      updated: 'Task updated successfully.',
      deleted: 'Task deleted successfully.',
      statusUpdated: 'Task status updated successfully.',
      assigneesUpdated: 'Task assignees updated successfully.',
      hoursLogged: 'Hours logged successfully.',
      operationFailed: 'The operation could not be completed.'
    }
  }
}

translations.fa = translations.en
translations.ps = translations.en

export const getTasksDictionary = locale => translations[locale] || translations.en
