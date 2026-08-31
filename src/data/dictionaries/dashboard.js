const translations = {
  en: {
    title: 'Dashboard overview',
    subtitle: 'Welcome back, {name}. Here is the latest operational picture.',
    period: {
      label: 'Reporting period',
      THIS_MONTH: 'This Month',
      LAST_MONTH: 'Last Month',
      THIS_QUARTER: 'This Quarter',
      THIS_YEAR: 'This Year',
      ALL_TIME: 'All Time',
      CUSTOM: 'Custom Range',
      startDate: 'Start date',
      endDate: 'End date'
    },
    kpis: {
      netProfit: 'Net profit / cash flow',
      netProfitHint: 'Income minus expenses and payroll',
      revenue: 'Total revenue / income',
      revenueHint: '{amount} still outstanding',
      expenses: 'Expenses',
      expensesHint: 'Operating expenses and payroll',
      pipeline: 'Active pipeline value',
      pipelineHint: '{count} active leads and contracts',
      operations: 'Active work & operations',
      operationsHint: '{checked} workforce check-ins in this period',
      workforce: 'Workforce attendance',
      workforceHint: '{rate}% of active staff checked in'
    },
    cashFlow: {
      title: 'Cash flow trend',
      subtitle: 'Income compared with operating expenses and payroll for the selected period',
      income: 'Total income',
      expenses: 'Expenses & salaries'
    },
    distribution: {
      title: 'Financial distribution',
      subtitle: 'Where income is generated and spending is allocated',
      income: 'Income',
      expense: 'Expense',
      total: 'Total value'
    },
    funnel: {
      title: 'Sales lead funnel',
      subtitle: 'Lead progression across every configured CRM stage',
      empty: 'No lead pipeline records are available.'
    },
    projects: {
      title: 'High-priority project trackers',
      subtitle: 'Task delivery, logged effort, and approaching deadlines',
      tasks: '{completed} of {total} tasks complete',
      hours: '{actual}h logged / {estimated}h estimated',
      due: 'Due {date}',
      overdue: 'Overdue {date}',
      empty: 'No active projects require tracking.'
    },
    urgent: {
      title: 'Urgent actions & operational watchlist',
      subtitle: 'Dense, actionable records that need near-term attention',
      outstanding: 'Overdue invoices & outstanding balances',
      outstandingHint: 'Unpaid or partially collected customer balances',
      contracts: 'Upcoming contract expirations',
      contractsHint: 'Active agreements ending in the next 30 days',
      loans: 'Active staff loans',
      loanSummary: '{count} active loans · {amount} base balance',
      inventory: 'Low inventory alerts',
      inventoryHint: 'Stock at or below its configured reorder level',
      due: 'Due {date}',
      monthly: '{amount} monthly deduction',
      noOutstanding: 'No outstanding balances need attention.',
      noContracts: 'No contracts expire within the next 30 days.',
      noLoans: 'No active loan balances are pending.',
      noInventory: 'Inventory levels are above all reorder thresholds.'
    },
    personal: {
      openTasks: 'Open tasks',
      assigned: 'Currently assigned to you',
      overdue: 'Overdue tasks',
      needsAttention: 'Assignments needing attention',
      hours: 'Logged hours',
      thisMonth: 'Your total for this month',
      selectedPeriod: 'Your total for the selected period',
      loan: 'Loan balance',
      loanHint: '{count} active loans',
      noStaff: 'Your user account is not connected to a staff profile.'
    },
    common: {
      refresh: 'Refresh dashboard',
      refreshing: 'Refreshing dashboard',
      retry: 'Try again',
      loadError: 'Dashboard could not be loaded',
      viewAll: 'View all',
      noData: 'No data is available for the selected period.'
    }
  },
  fa: {
    title: 'نمای کلی دشبورد',
    subtitle: 'خوش آمدید، {name}. آخرین وضعیت عملیاتی دشبورد را ببینید.',
    period: {
      label: 'دوره گزارش',
      THIS_MONTH: 'این ماه',
      LAST_MONTH: 'ماه گذشته',
      THIS_QUARTER: 'این ربع',
      THIS_YEAR: 'امسال',
      ALL_TIME: 'تمام زمان',
      CUSTOM: 'محدوده دلخواه',
      startDate: 'تاریخ شروع',
      endDate: 'تاریخ پایان'
    },
    kpis: {
      netProfit: 'سود خالص / جریان نقدی',
      netProfitHint: 'درآمد منهای مصارف و معاشات',
      revenue: 'مجموع درآمد',
      revenueHint: '{amount} هنوز قابل دریافت است',
      expenses: 'مصارف',
      expensesHint: 'مصارف عملیاتی و معاشات',
      pipeline: 'ارزش پایپ‌لاین فعال',
      pipelineHint: '{count} سرنخ و قرارداد فعال',
      operations: 'کار و عملیات فعال',
      operationsHint: '{checked} حضور ثبت‌شده در این دوره',
      workforce: 'حضور نیروی کار',
      workforceHint: '{rate}% کارمندان فعال حاضر شده‌اند'
    },
    cashFlow: {
      title: 'روند جریان نقدی',
      subtitle: 'مقایسه درآمد با مصارف عملیاتی و معاشات در دوره انتخاب‌شده',
      income: 'مجموع درآمد',
      expenses: 'مصارف و معاشات'
    },
    distribution: {
      title: 'توزیع مالی',
      subtitle: 'منابع درآمد و بخش‌های مصرف',
      income: 'درآمد',
      expense: 'مصرف',
      total: 'ارزش مجموعی'
    },
    funnel: {
      title: 'قیف سرنخ‌های فروش',
      subtitle: 'پیشرفت سرنخ‌ها در مراحل تنظیم‌شده CRM',
      empty: 'هیچ سرنخی در پایپ‌لاین موجود نیست.'
    },
    projects: {
      title: 'پیگیری پروژه‌های اولویت‌دار',
      subtitle: 'پیشرفت وظایف، ساعات ثبت‌شده و ضرب‌الاجل‌ها',
      tasks: '{completed} از {total} وظیفه تکمیل',
      hours: '{actual} ساعت ثبت / {estimated} ساعت تخمین',
      due: 'موعد {date}',
      overdue: 'گذشته از موعد {date}',
      empty: 'پروژه فعالی برای پیگیری وجود ندارد.'
    },
    urgent: {
      title: 'اقدامات عاجل و فهرست نظارت',
      subtitle: 'موارد فشرده و قابل اقدام که نیاز به توجه نزدیک دارند',
      outstanding: 'فاکتورهای سررسیدشده و باقی‌مانده‌ها',
      outstandingHint: 'پرداخت‌های دریافت‌نشده یا قسمی مشتریان',
      contracts: 'قراردادهای نزدیک به انقضا',
      contractsHint: 'قراردادهای فعال که تا ۳۰ روز آینده ختم می‌شوند',
      loans: 'قرضه‌های فعال کارمندان',
      loanSummary: '{count} قرضه فعال · {amount} باقی‌مانده پایه',
      inventory: 'هشدار موجودی کم',
      inventoryHint: 'موجودی برابر یا کمتر از حد سفارش',
      due: 'موعد {date}',
      monthly: 'کسر ماهانه {amount}',
      noOutstanding: 'هیچ باقی‌مانده قابل پیگیری وجود ندارد.',
      noContracts: 'در ۳۰ روز آینده قراردادی منقضی نمی‌شود.',
      noLoans: 'هیچ قرضه فعال باقی نمانده است.',
      noInventory: 'تمام موجودی‌ها بالاتر از حد سفارش است.'
    },
    personal: {
      openTasks: 'وظایف باز',
      assigned: 'وظایف سپرده‌شده به شما',
      overdue: 'وظایف تأخیرشده',
      needsAttention: 'وظایف نیازمند توجه',
      hours: 'ساعات ثبت‌شده',
      thisMonth: 'مجموع شما در این ماه',
      selectedPeriod: 'مجموع شما در دوره انتخاب‌شده',
      loan: 'باقی‌مانده قرضه',
      loanHint: '{count} قرضه فعال',
      noStaff: 'حساب کاربری شما به پروفایل کارمند وصل نیست.'
    },
    common: { refresh: 'تازه‌سازی داشبورد', refreshing: 'داشبورد در حال تازه‌سازی است', retry: 'دوباره کوشش کنید', loadError: 'داشبورد بارگیری نشد', viewAll: 'مشاهده همه', noData: 'برای دوره انتخاب‌شده داده‌ای موجود نیست.' }
  },
  ps: {
    title: 'د ادارې عمومي لید',
    subtitle: 'ښه راغلاست، {name}. د ادارې وروستی عملیاتي حالت وګورئ.',
    period: {
      label: 'د راپور موده',
      THIS_MONTH: 'دا میاشت',
      LAST_MONTH: 'تېره میاشت',
      THIS_QUARTER: 'دا ربع',
      THIS_YEAR: 'دا کال',
      ALL_TIME: 'ټول وخت',
      CUSTOM: 'ځانګړې موده',
      startDate: 'د پیل نېټه',
      endDate: 'د پای نېټه'
    },
    kpis: {
      netProfit: 'خالصه ګټه / نغدي جریان',
      netProfitHint: 'عاید منفي لګښتونه او معاشونه',
      revenue: 'ټول عاید',
      revenueHint: '{amount} لا پاتې دی',
      expenses: 'لګښتونه',
      expensesHint: 'عملیاتي لګښتونه او معاشونه',
      pipeline: 'د فعال پایپ‌لاین ارزښت',
      pipelineHint: '{count} فعال لیډونه او قراردادونه',
      operations: 'فعال کار او عملیات',
      operationsHint: '{checked} د دې مودې حاضري',
      workforce: 'د کارکوونکو حاضري',
      workforceHint: '{rate}% فعال کارکوونکي حاضر دي'
    },
    cashFlow: {
      title: 'د نغدي جریان بهیر',
      subtitle: 'د ټاکل شوې مودې عاید، عملیاتي لګښتونه او معاشونه',
      income: 'ټول عاید',
      expenses: 'لګښتونه او معاشونه'
    },
    distribution: {
      title: 'مالي وېش',
      subtitle: 'د عاید سرچینې او د مصرف برخې',
      income: 'عاید',
      expense: 'لګښت',
      total: 'ټول ارزښت'
    },
    funnel: {
      title: 'د پلور لیډونو قیف',
      subtitle: 'د CRM په ټاکل شوو پړاوونو کې د لیډونو پرمختګ',
      empty: 'په پایپ‌لاین کې لیډونه نشته.'
    },
    projects: {
      title: 'د لومړیتوب پروژو څارنه',
      subtitle: 'د دندو پرمختګ، ثبت شوي ساعتونه او نېټې',
      tasks: 'له {total} څخه {completed} دندې بشپړې',
      hours: '{actual} ساعته ثبت / {estimated} ساعته اټکل',
      due: 'نېټه {date}',
      overdue: 'له نېټې اوښتی {date}',
      empty: 'د څارنې لپاره فعاله پروژه نشته.'
    },
    urgent: {
      title: 'بیړني اقدامات او د څار لېست',
      subtitle: 'هغه لنډ او عملي موارد چې ژر پاملرنې ته اړتیا لري',
      outstanding: 'ځنډېدلي بلونه او پاتې بیلانسونه',
      outstandingHint: 'ناورکړل شوي یا نیمګړي ترلاسه شوي بیلانسونه',
      contracts: 'ژر پای ته رسېدونکي قراردادونه',
      contractsHint: 'هغه فعال قراردادونه چې په ۳۰ ورځو کې پای ته رسېږي',
      loans: 'د کارکوونکو فعال پورونه',
      loanSummary: '{count} فعال پورونه · {amount} پاتې بیلانس',
      inventory: 'د کمې ذخیرې خبرتیا',
      inventoryHint: 'ذخیره د بیا فرمایش له کچې سره برابره یا کمه',
      due: 'نېټه {date}',
      monthly: 'میاشتنی کسر {amount}',
      noOutstanding: 'د تعقیب لپاره پاتې بیلانس نشته.',
      noContracts: 'په راتلونکو ۳۰ ورځو کې قرارداد نه پای ته رسېږي.',
      noLoans: 'فعال پاتې پور نشته.',
      noInventory: 'ټوله ذخیره د بیا فرمایش له کچې لوړه ده.'
    },
    personal: {
      openTasks: 'پرانیستې دندې',
      assigned: 'تاسو ته سپارل شوې دندې',
      overdue: 'ځنډېدلې دندې',
      needsAttention: 'پاملرنې ته اړتیا لرونکې دندې',
      hours: 'ثبت شوي ساعتونه',
      thisMonth: 'ستاسو د دې میاشتې مجموعه',
      selectedPeriod: 'ستاسو د ټاکل شوې مودې مجموعه',
      loan: 'د پور بیلانس',
      loanHint: '{count} فعال پورونه',
      noStaff: 'ستاسو حساب د کارکوونکي له پروفایل سره نه دی تړلی.'
    },
    common: { refresh: 'ډشبورډ تازه کول', refreshing: 'ډشبورډ تازه کېږي', retry: 'بیا هڅه وکړئ', loadError: 'ډشبورډ پورته نه شو', viewAll: 'ټول کتل', noData: 'د ټاکلې مودې لپاره معلومات نشته.' }
  }
}

export const getDashboardDictionary = locale => translations[locale] || translations.en
