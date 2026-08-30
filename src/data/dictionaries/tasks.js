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
      log: 'Add Hours',
      addItem: 'Add',
      browse: 'Browse Files',
      comment: 'Comment'
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
      hoursToAdd: 'Hours to Add',
      workDate: 'Work Date',
      workNotes: 'Work Notes'
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
      description: 'Define ownership, priority, schedule, and working-hour estimates.',
      actualHoursLocked: 'Actual hours are read-only and can only increase through time logs.'
    },
    detail: {
      title: 'Task Details',
      overview: 'Overview',
      schedule: 'Schedule & Hours',
      people: 'People',
      legacyAssignee: 'Legacy Assignee',
      created: 'Created',
      updated: 'Updated',
      timeAudit: 'Timesheet Audit Trail',
      noTimeLogs: 'No task time has been logged yet.'
    },
    hours: {
      title: 'Log Task Hours',
      description: 'Add worked hours to the current actual-hours total.',
      current: 'Current logged hours: {hours}',
      notesOptional: 'Optional notes describing the work performed.'
    },
    kanban: {
      zeroHoursConfirm: 'This task has no logged hours. Move it anyway? Choose Cancel to log initial hours first.',
      subtasks: '{completed}/{total} sub-tasks completed'
    },
    collaboration: {
      subtasks: 'Sub-tasks',
      newSubtask: 'New sub-task',
      childSubtask: 'Nested sub-task',
      addChild: 'Add nested sub-task',
      attachments: 'Attachments & Links',
      dropFiles: 'Drop screenshots or PDFs here',
      noAttachments: 'No attachments yet.',
      linkName: 'Link name',
      linkUrl: 'Figma or external URL',
      comments: 'Discussion',
      noComments: 'No comments yet.',
      commentPlaceholder: 'Write a comment; type @ to mention a team member',
      uploadFailed: 'The attachment could not be uploaded.',
      uploadInvalid: 'Use an image or PDF up to 4 MB.'
    },
    common: {
      unassigned: 'Unassigned',
      noDueDate: 'No due date',
      overdue: 'Overdue',
      completed: 'Completed',
      of: 'of',
      rowsPerPage: 'Rows per page:',
      loading: 'Loading...',
      scopeCompleted: '100% Scope Completed',
      hoursSaved: 'Saved {hours}h',
      hoursOver: 'Over by {hours}h',
      noNotes: 'No notes',
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
      invalidRelation: 'One or more selected records are invalid.',
      dueDateBeforeCreated: 'Due date cannot be earlier than today or the task creation date.',
      workDateInvalid: 'Work date must be between the task creation date and today.',
      notesTooLong: 'Notes must not exceed 2,000 characters.',
      subtaskInvalid: 'Enter a valid sub-task title.',
      attachmentInvalid: 'Enter a valid attachment or HTTPS link.',
      commentInvalid: 'Comments are required and must not exceed 5,000 characters.'
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
      timesheetAttached: 'Timesheet entry attached to the task.',
      timesheetApprovalRequired: 'Only approved timesheet entries can be attached to tasks.',
      projectCompleted: 'This project is completed and its timesheets are locked.',
      taskCompleted: 'Completed tasks do not accept additional time logs.',
      subtaskAdded: 'Sub-task added.',
      subtaskUpdated: 'Sub-task updated.',
      attachmentAdded: 'Attachment added.',
      commentAdded: 'Comment posted.',
      operationFailed: 'The operation could not be completed.'
    }
  }
}

translations.fa = translations.en
translations.ps = translations.en

export const getTasksDictionary = locale => translations[locale] || translations.en
