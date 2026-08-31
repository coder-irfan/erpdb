const translations = {
  en: {
    metrics: {
      active: 'Active Projects',
      activeHint: 'Currently in progress',
      budget: 'Total Budget',
      budgetHint: 'Converted to {currency}',
      hours: 'Hours Overview',
      hoursHint: '{actual} logged of {estimated} estimated',
      overdue: 'Overdue Projects',
      overdueHint: 'Past due without completion'
    },
    filters: {
      search: 'Search projects',
      searchPlaceholder: 'Code, title, or sponsor...',
      client: 'Client',
      manager: 'Project manager',
      status: 'Status',
      priority: 'Priority',
      allClients: 'All clients',
      allManagers: 'All managers',
      allStatuses: 'All statuses',
      allPriorities: 'All priorities',
      clear: 'Clear filters'
    },
    table: {
      project: 'Code & Title',
      client: 'Client',
      team: 'Manager & Team',
      timeline: 'Timeline',
      hours: 'Hours Progress',
      budget: 'Budget',
      status: 'Status & Priority',
      actions: 'Actions'
    },
    actions: {
      add: 'New Project',
      view: 'View Details',
      edit: 'Edit Project',
      manageMembers: 'Manage Members',
      delete: 'Delete Project',
      cancel: 'Cancel',
      create: 'Create Project',
      save: 'Save Changes',
      saving: 'Saving...',
      assign: 'Assign Member',
      remove: 'Remove',
      link: 'Update Contract',
      unlink: 'Unlink Contract',
      changeStatus: 'Change Status',
      close: 'Close'
    },
    form: {
      addTitle: 'Create Project',
      editTitle: 'Edit Project',
      description: 'Set the project scope, ownership, timeline, and locked financial values.',
      basePreview: 'Base amount ({currency})',
      optional: 'Optional'
    },
    fields: {
      title: 'Title',
      description: 'Description',
      client: 'Client',
      contract: 'Contract',
      manager: 'Project Manager',
      status: 'Status',
      priority: 'Priority',
      area: 'Project Area',
      sponsor: 'Project Sponsor',
      estimatedHours: 'Estimated Hours',
      actualHours: 'Actual Hours',
      budget: 'Budget',
      currency: 'Currency',
      exchangeRate: 'USD / AFN Exchange Rate',
      startDate: 'Start Date',
      endDate: 'End Date',
      actualEndDate: 'Actual End Date',
      member: 'Staff Member',
      role: 'Project Role'
    },
    placeholders: {
      client: 'Select client',
      contract: 'No linked contract',
      manager: 'Select manager',
      status: 'Select status',
      priority: 'Select priority',
      member: 'Select staff',
      role: 'e.g. Lead Developer',
      task: 'Select task'
    },
    detail: {
      overview: 'Overview & Info',
      team: 'Team Members',
      contract: 'Contract',
      timesheets: 'Hours & Timesheets',
      tasks: 'Tasks',
      finances: 'Finances',
      scope: 'Project Scope',
      financial: 'Financial Breakdown',
      timeline: 'Timeline & Progress',
      noMembers: 'No team members assigned.',
      noContract: 'No contract is linked to this project.',
      noTimesheets: 'No project timesheets have been logged.',
      noFinances: 'No project financial records are available.',
      revenue: 'Total Revenue',
      expenses: 'Total Expenses',
      profit: 'Net Profitability',
      transactionAmount: 'Transaction Budget',
      baseAmount: 'Base Budget',
      rate: 'Locked Exchange Rate',
      assigned: 'Assigned',
      staff: 'Staff',
      date: 'Date',
      hours: 'Hours',
      note: 'Description',
      type: 'Type',
      amount: 'Amount',
      task: 'Task'
    },
    common: {
      notAvailable: '—',
      overdue: 'Overdue',
      completed: 'Completed',
      unassigned: 'Unassigned',
      noTeam: 'No team',
      loading: 'Loading...',
      of: 'of',
      rowsPerPage: 'Rows per page:'
    },
    empty: { title: 'No projects found', description: 'Create a project or adjust the current search and filters.' },
    delete: { title: 'Delete project', description: 'Delete {name}? This cannot be undone.' },
    validation: {
      required: 'This field is required.',
      titleTooLong: 'Title must not exceed 191 characters.',
      numberInvalid: 'Enter a valid non-negative number.',
      positiveInvalid: 'Enter a value greater than zero.',
      dateInvalid: 'Enter a valid date.',
      dateRangeInvalid: 'End date must be on or after start date.',
      invalidRelation: 'One or more selected records are invalid.',
      duplicateMember: 'This staff member is already assigned to the project.'
    },
    messages: {
      unauthenticated: 'Authentication is required.',
      forbidden: 'You do not have permission for this action.',
      loadFailed: 'Projects could not be loaded.',
      optionsLoadFailed: 'Project form options could not be loaded.',
      detailLoadFailed: 'Project details could not be loaded.',
      notFound: 'Project was not found.',
      created: 'Project created successfully.',
      updated: 'Project updated successfully.',
      statusUpdated: 'Project status updated successfully.',
      deleted: 'Project deleted successfully.',
      memberAssigned: 'Team member assigned successfully.',
      memberRemoved: 'Team member removed successfully.',
      contractUpdated: 'Linked contract updated successfully.',
      operationFailed: 'The operation could not be completed.',
      duplicate: 'A conflicting project record already exists.',
      inUse: 'This project has linked operational or financial records and cannot be deleted.'
    }
  }
}

const fa = {
  metrics: { active: 'پروژه‌های فعال', activeHint: 'در حال اجرا', budget: 'بودجه مجموعی', budgetHint: 'تبدیل‌شده به {currency}', hours: 'نمای کلی ساعت‌ها', hoursHint: '{actual} ثبت‌شده از {estimated} تخمینی', overdue: 'پروژه‌های تأخیرشده', overdueHint: 'از موعد گذشته و تکمیل‌نشده' },
  filters: { search: 'جستجوی پروژه‌ها', searchPlaceholder: 'کد، عنوان یا حامی...', client: 'مشتری', manager: 'مدیر پروژه', status: 'وضعیت', priority: 'اولویت', allClients: 'همه مشتریان', allManagers: 'همه مدیران', allStatuses: 'همه وضعیت‌ها', allPriorities: 'همه اولویت‌ها', clear: 'پاک‌کردن فیلترها' },
  table: { project: 'کد و عنوان', client: 'مشتری', team: 'مدیر و تیم', timeline: 'زمان‌بندی', hours: 'پیشرفت ساعت‌ها', budget: 'بودجه', status: 'وضعیت و اولویت', actions: 'عملیات' },
  actions: { add: 'پروژه جدید', view: 'مشاهده جزئیات', edit: 'ویرایش پروژه', manageMembers: 'مدیریت اعضا', delete: 'حذف پروژه', cancel: 'لغو', create: 'ایجاد پروژه', save: 'ذخیره تغییرات', saving: 'در حال ذخیره...', assign: 'تعیین عضو', remove: 'حذف', link: 'به‌روزرسانی قرارداد', unlink: 'لغو پیوند قرارداد', changeStatus: 'تغییر وضعیت', close: 'بستن' },
  form: { addTitle: 'ایجاد پروژه', editTitle: 'ویرایش پروژه', description: 'محدوده، مسئولیت، زمان‌بندی و ارزش‌های مالی تثبیت‌شده پروژه را تعیین کنید.', basePreview: 'مبلغ پایه ({currency})', optional: 'اختیاری' },
  fields: { title: 'عنوان', description: 'توضیحات', client: 'مشتری', contract: 'قرارداد', manager: 'مدیر پروژه', status: 'وضعیت', priority: 'اولویت', area: 'حوزه پروژه', sponsor: 'حامی پروژه', estimatedHours: 'ساعت‌های تخمینی', actualHours: 'ساعت‌های واقعی', budget: 'بودجه', currency: 'واحد پول', exchangeRate: 'نرخ تبدیل دالر / افغانی', startDate: 'تاریخ آغاز', endDate: 'تاریخ پایان', actualEndDate: 'تاریخ پایان واقعی', member: 'عضو کارکنان', role: 'نقش در پروژه' },
  placeholders: { client: 'مشتری را انتخاب کنید', contract: 'قراردادی پیوند نشده است', manager: 'مدیر را انتخاب کنید', status: 'وضعیت را انتخاب کنید', priority: 'اولویت را انتخاب کنید', member: 'کارمند را انتخاب کنید', role: 'مثلاً توسعه‌دهنده ارشد', task: 'وظیفه را انتخاب کنید' },
  detail: { overview: 'نمای کلی و اطلاعات', team: 'اعضای تیم', contract: 'قرارداد', timesheets: 'ساعت‌ها و تایم‌شیت‌ها', tasks: 'وظایف', finances: 'مالی', scope: 'محدوده پروژه', financial: 'جزئیات مالی', timeline: 'زمان‌بندی و پیشرفت', noMembers: 'هیچ عضو تیمی تعیین نشده است.', noContract: 'هیچ قراردادی به این پروژه پیوند نشده است.', noTimesheets: 'هیچ تایم‌شیتی برای پروژه ثبت نشده است.', noFinances: 'هیچ رکورد مالی برای پروژه موجود نیست.', revenue: 'مجموع درآمد', expenses: 'مجموع مصارف', profit: 'سود خالص', transactionAmount: 'بودجه معامله', baseAmount: 'بودجه پایه', rate: 'نرخ تبدیل تثبیت‌شده', assigned: 'تعیین‌شده', staff: 'کارکنان', date: 'تاریخ', hours: 'ساعت‌ها', note: 'توضیحات', type: 'نوع', amount: 'مبلغ', task: 'وظیفه' },
  common: { notAvailable: '—', overdue: 'تأخیرشده', completed: 'تکمیل‌شده', unassigned: 'تعیین‌نشده', noTeam: 'بدون تیم', loading: 'در حال بارگذاری...', of: 'از', rowsPerPage: 'ردیف در هر صفحه:' },
  empty: { title: 'پروژه‌ای یافت نشد', description: 'یک پروژه ایجاد کنید یا جستجو و فیلترهای فعلی را تغییر دهید.' }, delete: { title: 'حذف پروژه', description: 'پروژه {name} حذف شود؟ این عمل قابل بازگشت نیست.' },
  validation: { required: 'این فیلد الزامی است.', titleTooLong: 'عنوان نباید بیشتر از ۱۹۱ نویسه باشد.', numberInvalid: 'یک عدد معتبر و غیرمنفی وارد کنید.', positiveInvalid: 'مقداری بزرگ‌تر از صفر وارد کنید.', dateInvalid: 'یک تاریخ معتبر وارد کنید.', dateRangeInvalid: 'تاریخ پایان باید برابر یا بعد از تاریخ آغاز باشد.', invalidRelation: 'یک یا چند رکورد انتخاب‌شده معتبر نیست.', duplicateMember: 'این کارمند قبلاً به پروژه تعیین شده است.' },
  messages: { unauthenticated: 'ورود به سیستم الزامی است.', forbidden: 'اجازه انجام این عمل را ندارید.', loadFailed: 'پروژه‌ها بارگذاری نشدند.', optionsLoadFailed: 'گزینه‌های فرم پروژه بارگذاری نشدند.', detailLoadFailed: 'جزئیات پروژه بارگذاری نشد.', notFound: 'پروژه یافت نشد.', created: 'پروژه با موفقیت ایجاد شد.', updated: 'پروژه با موفقیت به‌روزرسانی شد.', statusUpdated: 'وضعیت پروژه با موفقیت به‌روزرسانی شد.', deleted: 'پروژه با موفقیت حذف شد.', memberAssigned: 'عضو تیم با موفقیت تعیین شد.', memberRemoved: 'عضو تیم با موفقیت حذف شد.', contractUpdated: 'قرارداد پیوندشده با موفقیت به‌روزرسانی شد.', operationFailed: 'عملیات تکمیل نشد.', duplicate: 'یک رکورد پروژه متضاد از قبل وجود دارد.', inUse: 'این پروژه رکوردهای عملیاتی یا مالی پیوندشده دارد و حذف نمی‌شود.' }
}

const ps = {
  metrics: { active: 'فعالې پروژې', activeHint: 'اوس روانې دي', budget: 'ټوله بودیجه', budgetHint: '{currency} ته بدله شوې', hours: 'د ساعتونو لنډیز', hoursHint: '{actual} ثبت شوي له {estimated} اټکل شوو څخه', overdue: 'ځنډېدلې پروژې', overdueHint: 'له نېټې تېرې او نابشپړې' },
  filters: { search: 'پروژې ولټوئ', searchPlaceholder: 'کوډ، سرلیک یا ملاتړکوونکی...', client: 'پېرودونکی', manager: 'د پروژې مدیر', status: 'حالت', priority: 'لومړیتوب', allClients: 'ټول پېرودونکي', allManagers: 'ټول مدیران', allStatuses: 'ټول حالتونه', allPriorities: 'ټول لومړیتوبونه', clear: 'فلټرونه پاک کړئ' },
  table: { project: 'کوډ او سرلیک', client: 'پېرودونکی', team: 'مدیر او ټیم', timeline: 'مهالوېش', hours: 'د ساعتونو پرمختګ', budget: 'بودیجه', status: 'حالت او لومړیتوب', actions: 'کړنې' },
  actions: { add: 'نوې پروژه', view: 'جزییات کتل', edit: 'پروژه سمول', manageMembers: 'د غړو اداره', delete: 'پروژه ړنګول', cancel: 'لغوه', create: 'پروژه جوړول', save: 'بدلونونه ساتل', saving: 'ساتل کېږي...', assign: 'غړی ټاکل', remove: 'لرې کول', link: 'قرارداد تازه کول', unlink: 'د قرارداد تړاو لرې کول', changeStatus: 'حالت بدلول', close: 'بندول' },
  form: { addTitle: 'پروژه جوړول', editTitle: 'پروژه سمول', description: 'د پروژې حدود، مسئولیت، مهالوېش او تثبیت شوي مالي ارزښتونه وټاکئ.', basePreview: 'بنسټیزه اندازه ({currency})', optional: 'اختیاري' },
  fields: { title: 'سرلیک', description: 'تشریح', client: 'پېرودونکی', contract: 'قرارداد', manager: 'د پروژې مدیر', status: 'حالت', priority: 'لومړیتوب', area: 'د پروژې ساحه', sponsor: 'د پروژې ملاتړکوونکی', estimatedHours: 'اټکل شوي ساعتونه', actualHours: 'اصلي ساعتونه', budget: 'بودیجه', currency: 'پیسه', exchangeRate: 'د ډالر / افغانیو د تبادلې نرخ', startDate: 'د پیل نېټه', endDate: 'د پای نېټه', actualEndDate: 'د پای اصلي نېټه', member: 'د کارکوونکي غړی', role: 'د پروژې رول' },
  placeholders: { client: 'پېرودونکی وټاکئ', contract: 'هیڅ تړلی قرارداد نشته', manager: 'مدیر وټاکئ', status: 'حالت وټاکئ', priority: 'لومړیتوب وټاکئ', member: 'کارکوونکی وټاکئ', role: 'لکه مخکښ پراختیاکوونکی', task: 'دنده وټاکئ' },
  detail: { overview: 'لنډیز او معلومات', team: 'د ټیم غړي', contract: 'قرارداد', timesheets: 'ساعتونه او تایم‌شېټونه', tasks: 'دندې', finances: 'مالي چارې', scope: 'د پروژې حدود', financial: 'مالي جزییات', timeline: 'مهالوېش او پرمختګ', noMembers: 'د ټیم کوم غړی نه دی ټاکل شوی.', noContract: 'له دې پروژې سره کوم قرارداد نه دی تړل شوی.', noTimesheets: 'د پروژې لپاره تایم‌شېټ نه دی ثبت شوی.', noFinances: 'د پروژې هیڅ مالي ریکارډ نشته.', revenue: 'ټول عاید', expenses: 'ټول لګښتونه', profit: 'خالصه ګټه', transactionAmount: 'د معاملې بودیجه', baseAmount: 'بنسټیزه بودیجه', rate: 'تثبیت شوی د تبادلې نرخ', assigned: 'ټاکل شوی', staff: 'کارکوونکي', date: 'نېټه', hours: 'ساعتونه', note: 'تشریح', type: 'ډول', amount: 'اندازه', task: 'دنده' },
  common: { notAvailable: '—', overdue: 'ځنډېدلی', completed: 'بشپړ شوی', unassigned: 'نه دی ټاکل شوی', noTeam: 'بې ټیمه', loading: 'پورته کېږي...', of: 'له', rowsPerPage: 'په هر مخ کې ردیفونه:' },
  empty: { title: 'پروژه ونه موندل شوه', description: 'یوه پروژه جوړه کړئ یا اوسنۍ لټون او فلټرونه بدل کړئ.' }, delete: { title: 'پروژه ړنګول', description: 'پروژه {name} ړنګه شي؟ دا کړنه بېرته نه راګرځي.' },
  validation: { required: 'دا ډګر اړین دی.', titleTooLong: 'سرلیک باید له ۱۹۱ تورو زیات نه وي.', numberInvalid: 'یو سم غیرمنفي شمېر ولیکئ.', positiveInvalid: 'له صفر لوی ارزښت ولیکئ.', dateInvalid: 'یوه سمه نېټه ولیکئ.', dateRangeInvalid: 'د پای نېټه باید د پیل له نېټې سره برابره یا وروسته وي.', invalidRelation: 'یو یا څو ټاکل شوي ریکارډونه سم نه دي.', duplicateMember: 'دا کارکوونکی مخکې پروژې ته ټاکل شوی دی.' },
  messages: { unauthenticated: 'ننوتل اړین دي.', forbidden: 'تاسو د دې کړنې اجازه نه لرئ.', loadFailed: 'پروژې پورته نه شوې.', optionsLoadFailed: 'د پروژې د فورم ټاکنې پورته نه شوې.', detailLoadFailed: 'د پروژې جزییات پورته نه شول.', notFound: 'پروژه ونه موندل شوه.', created: 'پروژه په بریالیتوب جوړه شوه.', updated: 'پروژه په بریالیتوب تازه شوه.', statusUpdated: 'د پروژې حالت په بریالیتوب تازه شو.', deleted: 'پروژه په بریالیتوب ړنګه شوه.', memberAssigned: 'د ټیم غړی په بریالیتوب وټاکل شو.', memberRemoved: 'د ټیم غړی په بریالیتوب لرې شو.', contractUpdated: 'تړلی قرارداد په بریالیتوب تازه شو.', operationFailed: 'کړنه بشپړه نه شوه.', duplicate: 'د پروژې متضاد ریکارډ مخکې شته.', inUse: 'دا پروژه تړلي عملیاتي یا مالي ریکارډونه لري او نه شي ړنګېدای.' }
}

translations.fa = fa
translations.ps = ps

export const getProjectsDictionary = locale => translations[locale] || translations.en
