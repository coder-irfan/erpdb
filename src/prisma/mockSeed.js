import { Prisma } from '@prisma/client'

import { DAY_IN_MILLISECONDS, isAfghanistanWorkingDay } from '../utils/payrollCalendar.js'

const SEED_PREFIX = 'seed-'
const USD_AFN_RATE = 70
const DAY_MS = DAY_IN_MILLISECONDS

const decimal = value => new Prisma.Decimal(value)
const dateKey = date => date.toISOString().slice(0, 10)
const monthKey = date => dateKey(date).slice(0, 7)
const atUtcDate = date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
const todayUtc = () => atUtcDate(new Date())
const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS)
const relativeDate = days => addDays(todayUtc(), days)

const monthDate = (monthOffset, day = 1) => {
  const today = todayUtc()

  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, day))
}

const dateTime = (date, hour, minute = 0) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute))

const amountInBase = (amount, currency) => decimal(currency === 'USD' ? amount * USD_AFN_RATE : amount)
const isWeekend = date => !isAfghanistanWorkingDay(date)

const findWorkingBlock = (startOffset, length, holidayKeys) => {
  let candidate = relativeDate(startOffset)

  for (let attempt = 0; attempt < 90; attempt += 1) {
    const dates = Array.from({ length }, (_, index) => addDays(candidate, index))

    if (dates.every(date => !isWeekend(date) && !holidayKeys.has(dateKey(date)))) return dates
    candidate = addDays(candidate, 1)
  }

  throw new Error('Could not find a working-day block for mock leave data.')
}

const clearMockData = async transaction => {
  const seededId = { startsWith: SEED_PREFIX }

  await transaction.auditlog.deleteMany({ where: { id: seededId } })
  await transaction.account.deleteMany({ where: { id: seededId } })
  await transaction.session.deleteMany({ where: { id: seededId } })
  await transaction.verificationToken.deleteMany({ where: { token: seededId } })
  await transaction.contractnotification.deleteMany({ where: { id: seededId } })
  await transaction.hrmleaveattendancebackup.deleteMany({ where: { id: seededId } })
  await transaction.hrmstafftimesheet.deleteMany({ where: { id: seededId } })
  await transaction.loanrepayment.deleteMany({ where: { id: seededId } })
  await transaction.inventorymovement.deleteMany({ where: { id: seededId } })
  await transaction.taskassignee.deleteMany({ where: { id: seededId } })
  await transaction.task.deleteMany({ where: { id: seededId } })
  await transaction.projectmember.deleteMany({ where: { id: seededId } })
  await transaction.financeexpense.deleteMany({ where: { id: seededId } })
  await transaction.financeincome.deleteMany({ where: { id: seededId } })
  await transaction.contractinvoice.deleteMany({ where: { id: seededId } })
  await transaction.financesalary.deleteMany({ where: { id: seededId } })
  await transaction.financeloan.deleteMany({ where: { id: seededId } })
  await transaction.hrmstaffleave.deleteMany({ where: { id: seededId } })
  await transaction.companyholiday.deleteMany({ where: { id: seededId } })
  await transaction.inventory.deleteMany({ where: { id: seededId } })
  await transaction.project.deleteMany({ where: { id: seededId } })
  await transaction.contract.deleteMany({ where: { id: seededId } })
  await transaction.crmactivity.deleteMany({ where: { id: seededId } })
  await transaction.crmvisitor.deleteMany({ where: { id: seededId } })
  await transaction.crmclient.deleteMany({ where: { id: seededId } })
  await transaction.crmlead.deleteMany({ where: { id: seededId } })
  await transaction.hrmstaffcontract.deleteMany({ where: { id: seededId } })
  await transaction.hrmstaff.deleteMany({ where: { id: seededId } })
  await transaction.user.deleteMany({ where: { id: seededId } })
}

const getOptionMap = async transaction => {
  const options = await transaction.option.findMany({ select: { id: true, category: true, value: true } })

  return new Map(options.map(option => [`${option.category}:${option.value}`, option.id]))
}

const requireOption = (options, category, value) => {
  const id = options.get(`${category}:${value}`)

  if (!id) throw new Error(`Required seed option ${category}:${value} is missing.`)

  return id
}

const seedSetupAndUsers = async (transaction, passwordHash) => {
  await transaction.setup.upsert({
    where: { scope: 'GLOBAL' },
    update: {
      app_name: 'Nawid Services ERP',
      company_name: 'Nawid Business Services Ltd.',
      company_email: 'info@nawid-demo.local',
      company_phone: '+93 20 220 4455',
      company_address: 'Shahr-e-Naw, Kabul, Afghanistan',
      company_tax_id: 'AF-TIN-2026-00421',
      currency_code: 'AFN',
      currency_symbol: 'AFN',
      usd_afn_exchange_rate: decimal(USD_AFN_RATE),
      date_format: 'YYYY-MM-DD',
      fiscal_year_start: '01-01',
      default_work_start: '08:30',
      default_work_end: '17:30',
      weekend_days: '5',
      signatory_name: 'Amina Rahimi',
      signatory_title: 'General Manager'
    },
    create: {
      scope: 'GLOBAL',
      app_name: 'Nawid Services ERP',
      company_name: 'Nawid Business Services Ltd.',
      company_email: 'info@nawid-demo.local',
      company_phone: '+93 20 220 4455',
      company_address: 'Shahr-e-Naw, Kabul, Afghanistan',
      company_tax_id: 'AF-TIN-2026-00421',
      currency_code: 'AFN',
      currency_symbol: 'AFN',
      usd_afn_exchange_rate: decimal(USD_AFN_RATE),
      date_format: 'YYYY-MM-DD',
      fiscal_year_start: '01-01',
      default_work_start: '08:30',
      default_work_end: '17:30',
      weekend_days: '5',
      signatory_name: 'Amina Rahimi',
      signatory_title: 'General Manager'
    }
  })

  await transaction.systemsetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' }
  })

  const roleRows = await transaction.role.findMany({
    where: { name: { in: ['super_admin', 'hr_manager', 'finance_manager', 'inventory_manager', 'employee'] } },
    select: { id: true, name: true }
  })

  const roleIds = new Map(roleRows.map(role => [role.name, role.id]))

  const userDefinitions = [
    ['seed-user-admin', 'Amina Rahimi', 'admin@demo.erp.local', 'super_admin', 'ACTIVE'],
    ['seed-user-hr', 'Farid Ahmadi', 'hr.manager@demo.erp.local', 'hr_manager', 'ACTIVE'],
    ['seed-user-finance', 'Laila Safi', 'finance.manager@demo.erp.local', 'finance_manager', 'ACTIVE'],
    ['seed-user-inventory', 'Omar Waziri', 'inventory.manager@demo.erp.local', 'inventory_manager', 'ACTIVE'],
    ['seed-user-employee', 'Sana Mohammadi', 'employee@demo.erp.local', 'employee', 'PENDING_ACTIVATION']
  ]

  for (const [id, name, email, roleName, accountStatus] of userDefinitions) {
    const roleId = roleIds.get(roleName)

    if (!roleId) throw new Error(`Required seed role ${roleName} is missing.`)

    await transaction.user.create({
      data: {
        id,
        name,
        email,
        emailVerified: relativeDate(-120),
        password_hash: passwordHash,
        account_status: accountStatus,
        locale: 'en',
        roles: { connect: { id: roleId } }
      }
    })
  }

  await transaction.account.createMany({
    data: userDefinitions.map(([userId], index) => ({
      id: `seed-account-${index + 1}`,
      userId,
      type: 'credentials',
      provider: 'seed-credentials',
      providerAccountId: userId
    }))
  })
  await transaction.session.createMany({
    data: userDefinitions.map(([userId], index) => ({
      id: `seed-session-${index + 1}`,
      sessionToken: `seed-expired-session-${index + 1}`,
      userId,
      expires: relativeDate(-1)
    }))
  })
  await transaction.verificationToken.createMany({
    data: userDefinitions.map(([, , email], index) => ({
      identifier: `seed:${email}`,
      token: `seed-expired-token-${index + 1}`,
      expires: relativeDate(-1)
    }))
  })
}

const seedStaffAndAttendance = async (transaction, options) => {
  const staffDefinitions = [
    {
      id: 'seed-staff-01',
      first: 'Amina',
      last: 'Rahimi',
      position: 'General Manager',
      salary: 1800,
      currency: 'USD',
      status: 'ACTIVE',
      userId: 'seed-user-admin',
      join: monthDate(-38, 3)
    },
    {
      id: 'seed-staff-02',
      first: 'Farid',
      last: 'Ahmadi',
      position: 'HR Manager',
      salary: 95000,
      currency: 'AFN',
      status: 'ACTIVE',
      userId: 'seed-user-hr',
      join: monthDate(-30, 12)
    },
    {
      id: 'seed-staff-03',
      first: 'Laila',
      last: 'Safi',
      position: 'Finance Manager',
      salary: 1200,
      currency: 'USD',
      status: 'ACTIVE',
      userId: 'seed-user-finance',
      join: monthDate(-27, 8)
    },
    {
      id: 'seed-staff-04',
      first: 'Omar',
      last: 'Waziri',
      position: 'Inventory Manager',
      salary: 65000,
      currency: 'AFN',
      status: 'ACTIVE',
      userId: 'seed-user-inventory',
      join: monthDate(-21, 18)
    },
    {
      id: 'seed-staff-05',
      first: 'Mariam',
      last: 'Akbari',
      position: 'Software Engineer',
      salary: 900,
      currency: 'USD',
      status: 'ACTIVE',
      join: monthDate(-16, 5)
    },
    {
      id: 'seed-staff-06',
      first: 'Hamid',
      last: 'Karimi',
      position: 'Project Manager',
      salary: 85000,
      currency: 'AFN',
      status: 'ACTIVE',
      join: monthDate(-19, 21)
    },
    {
      id: 'seed-staff-07',
      first: 'Zohra',
      last: 'Noori',
      position: 'Sales Specialist',
      salary: 60000,
      currency: 'AFN',
      status: 'ACTIVE',
      join: monthDate(-13, 10)
    },
    {
      id: 'seed-staff-08',
      first: 'Bilal',
      last: 'Azizi',
      position: 'Former Support Officer',
      salary: 55000,
      currency: 'AFN',
      status: 'TERMINATED',
      join: monthDate(-24, 14),
      termination: relativeDate(-12)
    },
    {
      id: 'seed-staff-09',
      first: 'Sana',
      last: 'Mohammadi',
      position: 'Onboarding Data Analyst',
      salary: 75000,
      currency: 'AFN',
      status: 'INACTIVE',
      userId: 'seed-user-employee',
      join: relativeDate(14)
    }
  ]

  await transaction.hrmstaff.createMany({
    data: staffDefinitions.map((staff, index) => ({
      id: staff.id,
      first_name: staff.first,
      last_name: staff.last,
      father_name: ['Khalid', 'Jamal', 'Nabi', 'Latif', 'Nasir', 'Rahman', 'Karim', 'Aziz', 'Mahmood'][index],
      phone: `+93 70 555 10${String(index + 1).padStart(2, '0')}`,
      email: `${staff.first.toLowerCase()}.${staff.last.toLowerCase()}@demo.erp.local`,
      address: ['Kabul', 'Herat', 'Kabul', 'Mazar-e-Sharif', 'Kabul', 'Kabul', 'Herat', 'Kabul', 'Kabul'][index],
      educations: [
        'MBA',
        'BBA Human Resources',
        'ACCA',
        'BSc Logistics',
        'BSc Computer Science',
        'PMP / BEng',
        'BBA Marketing',
        'BA English',
        'BSc Data Science'
      ][index],
      tazkira_no: `SEED-TZ-${String(index + 1).padStart(4, '0')}`,
      position: staff.position,
      salary: decimal(staff.salary),
      guarantor_name: `Mock Guarantor ${index + 1}`,
      guarantor_phone: `+93 79 400 20${String(index + 1).padStart(2, '0')}`,
      guarantor_license: `SEED-GL-${String(index + 1).padStart(4, '0')}`,
      join_date: staff.join,
      termination_date: staff.termination || null,
      contract_period: staff.status === 'INACTIVE' ? 'Pending activation' : '12 months',
      user_id: staff.userId || null,
      status: staff.status,
      salary_currency: staff.currency,
      salary_exchange_rate: decimal(USD_AFN_RATE),
      amount_base: amountInBase(staff.salary, staff.currency)
    }))
  })

  const activeStatus = requireOption(options, 'CONTRACT_STATUS', 'ACTIVE')
  const expiredStatus = requireOption(options, 'CONTRACT_STATUS', 'EXPIRED')
  const pendingStatus = requireOption(options, 'CONTRACT_STATUS', 'PENDING')
  const employmentType = requireOption(options, 'CONTRACT_TYPE_HRM', 'EMPLOYMENT')
  const internshipType = requireOption(options, 'CONTRACT_TYPE_HRM', 'INTERNSHIP')

  await transaction.hrmstaffcontract.createMany({
    data: staffDefinitions.map((staff, index) => ({
      id: `seed-staff-contract-${String(index + 1).padStart(2, '0')}`,
      staff_id: staff.id,
      contract_number: `SCNT-${String(index + 1).padStart(3, '0')}`,
      contract_type_id: index === 8 ? internshipType : employmentType,
      position_title: staff.position,
      base_salary: decimal(staff.salary),
      start_date: staff.join,
      end_date: index === 7 ? staff.termination : index === 8 ? relativeDate(194) : monthDate(12, 28),
      document_url: `https://example.invalid/mock-contracts/SCNT-${String(index + 1).padStart(3, '0')}.pdf`,
      status_id: index === 7 ? expiredStatus : index === 8 ? pendingStatus : activeStatus,
      content_html: `<p>Mock employment agreement for ${staff.first} ${staff.last}.</p>`,
      currency: staff.currency,
      exchange_rate: decimal(USD_AFN_RATE),
      amount_base: amountInBase(staff.salary, staff.currency)
    }))
  })

  const holidays = [
    ['Seed Staff Development Day', monthDate(-2, 15)],
    ['Seed Company Foundation Day', monthDate(-1, 10)],
    ['Seed Public Holiday', monthDate(0, 5)],
    ['Seed Systems Maintenance Holiday', monthDate(0, 20)],
    ['Seed Community Service Day', monthDate(1, 10)],
    ['Seed Year Planning Day', monthDate(2, 19)]
  ]

  await transaction.companyholiday.createMany({
    data: holidays.map(([name, date], index) => ({ id: `seed-holiday-${index + 1}`, name, date, is_active: true }))
  })

  const holidayKeys = new Set(holidays.map(([, date]) => dateKey(date)))
  const annualBlock = findWorkingBlock(-37, 2, holidayKeys)
  const sickBlock = findWorkingBlock(-28, 1, holidayKeys)
  const pendingBlock = findWorkingBlock(-20, 2, holidayKeys)
  const rejectedBlock = findWorkingBlock(-16, 1, holidayKeys)
  const unpaidBlock = findWorkingBlock(-9, 1, holidayKeys)
  const executiveBlock = findWorkingBlock(-45, 1, holidayKeys)
  const onboardingBlock = findWorkingBlock(22, 2, holidayKeys)

  const leaveDefinitions = [
    {
      id: 'seed-leave-01',
      staff: 'seed-staff-05',
      type: 'ANNUAL',
      status: 'APPROVED',
      dates: annualBlock,
      days: 2,
      paid: true,
      reason: 'Family visit'
    },
    {
      id: 'seed-leave-02',
      staff: 'seed-staff-07',
      type: 'SICK',
      status: 'APPROVED',
      dates: sickBlock,
      days: 0.5,
      paid: true,
      reason: 'Medical appointment (half day)'
    },
    {
      id: 'seed-leave-03',
      staff: 'seed-staff-06',
      type: 'CASUAL',
      status: 'PENDING',
      dates: pendingBlock,
      days: 2,
      paid: true,
      reason: 'Personal administration'
    },
    {
      id: 'seed-leave-04',
      staff: 'seed-staff-04',
      type: 'ANNUAL',
      status: 'REJECTED',
      dates: rejectedBlock,
      days: 1,
      paid: true,
      reason: 'Peak stock-count period'
    },
    {
      id: 'seed-leave-05',
      staff: 'seed-staff-02',
      type: 'UNPAID',
      status: 'APPROVED',
      dates: unpaidBlock,
      days: 1,
      paid: false,
      reason: 'Personal matter'
    },
    {
      id: 'seed-leave-06',
      staff: 'seed-staff-01',
      type: 'ANNUAL',
      status: 'APPROVED',
      dates: executiveBlock,
      days: 1,
      paid: true,
      reason: 'Annual leave'
    },
    {
      id: 'seed-leave-07',
      staff: 'seed-staff-09',
      type: 'CASUAL',
      status: 'PENDING',
      dates: onboardingBlock,
      days: 2,
      paid: true,
      reason: 'Pre-employment commitment'
    }
  ]

  await transaction.hrmstaffleave.createMany({
    data: leaveDefinitions.map(leave => ({
      id: leave.id,
      staff_id: leave.staff,
      leave_type_id: requireOption(options, 'LEAVE_TYPE', leave.type),
      start_date: leave.dates[0],
      end_date: leave.dates.at(-1),
      total_days: decimal(leave.days),
      is_paid: leave.paid,
      reason: leave.reason,
      status_id: requireOption(options, 'LEAVE_STATUS', leave.status),
      approved_by_id:
        leave.status === 'APPROVED' ? (leave.staff === 'seed-staff-01' ? 'seed-staff-02' : 'seed-staff-01') : null,
      approved_by_user_id:
        leave.status === 'APPROVED' ? (leave.staff === 'seed-staff-01' ? 'seed-user-hr' : 'seed-user-admin') : null
    }))
  })

  const approvedLeaveByStaffDate = new Map()
  const backups = []

  for (const leave of leaveDefinitions.filter(item => item.status === 'APPROVED')) {
    for (let cursor = leave.dates[0]; cursor <= leave.dates.at(-1); cursor = addDays(cursor, 1)) {
      approvedLeaveByStaffDate.set(`${leave.staff}:${dateKey(cursor)}`, leave)
      backups.push({
        id: `seed-leave-backup-${leave.id.slice(-2)}-${dateKey(cursor).replaceAll('-', '')}`,
        leave_id: leave.id,
        staff_id: leave.staff,
        date: cursor,
        record_existed: true,
        original_status: 'PRESENT',
        original_check_in_time: dateTime(cursor, 8, 30),
        original_check_out_time: dateTime(cursor, 17),
        original_hours_worked: decimal(8.5),
        original_notes: 'Snapshot retained before approved leave synchronization.'
      })
    }
  }

  await transaction.hrmleaveattendancebackup.createMany({ data: backups })

  const attendanceRows = []
  const attendanceStart = monthDate(-2, 1)
  const attendanceEnd = todayUtc()

  staffDefinitions.slice(0, 8).forEach((staff, staffIndex) => {
    const lastDate = staff.termination && staff.termination < attendanceEnd ? staff.termination : attendanceEnd

    for (let date = attendanceStart; date <= lastDate; date = addDays(date, 1)) {
      if (date < atUtcDate(staff.join)) continue

      const key = dateKey(date)
      const approvedLeave = approvedLeaveByStaffDate.get(`${staff.id}:${key}`)
      const weekend = isWeekend(date)
      const holiday = holidayKeys.has(key)
      const absent = !weekend && !holiday && (date.getUTCDate() + staffIndex * 3) % 23 === 0
      const present = !approvedLeave && !weekend && !holiday && !absent

      attendanceRows.push({
        id: `seed-att-${String(staffIndex + 1).padStart(2, '0')}-${key.replaceAll('-', '')}`,
        staff_id: staff.id,
        leave_id: approvedLeave?.id || null,
        status: approvedLeave ? 'LEAVE' : present ? 'PRESENT' : 'ABSENT',
        date,
        check_in_time: present ? dateTime(date, 8, 30 + (staffIndex % 3) * 5) : null,
        check_out_time: present ? dateTime(date, 17, staffIndex % 2 ? 15 : 0) : null,
        hours_worked: present ? decimal(staffIndex % 2 ? 8.67 : 8.5) : null,
        notes: approvedLeave
          ? `${approvedLeave.paid ? 'Paid' : 'Unpaid'} approved leave`
          : weekend
            ? 'Official weekend - non-working day'
            : holiday
              ? 'Company holiday - non-working day'
              : absent
                ? 'Unplanned absence'
                : 'Regular working day'
      })
    }
  })

  await transaction.hrmstafftimesheet.createMany({ data: attendanceRows })

  return { staffDefinitions, attendanceRows, holidays, leaveDefinitions }
}

const seedCrm = async (transaction, options) => {
  const leadData = [
    [
      'seed-lead-01',
      'Website Redesign Opportunity',
      'Aryana Retail Group',
      'Nasir Wardak',
      'nasir@aryana-demo.local',
      'WEBSITE',
      'WON',
      8500,
      'USD'
    ],
    [
      'seed-lead-02',
      'Managed IT Services',
      'Hindukush Logistics',
      'Shabnam Hussaini',
      'shabnam@hindukush-demo.local',
      'REFERRAL',
      'WON',
      650000,
      'AFN'
    ],
    [
      'seed-lead-03',
      'Accounting Automation',
      'Sadaf Foods',
      'Latif Azimi',
      'latif@sadaf-demo.local',
      'EMAIL_CAMPAIGN',
      'WON',
      5200,
      'USD'
    ],
    [
      'seed-lead-04',
      'Network Upgrade',
      'Kabul Learning Center',
      'Nadia Jalali',
      'nadia@klc-demo.local',
      'WALK_IN',
      'PROPOSAL_SENT',
      310000,
      'AFN'
    ],
    [
      'seed-lead-05',
      'HR Portal Deployment',
      'Bamyan Construction',
      'Ehsan Mohammadi',
      'ehsan@bamyan-demo.local',
      'WEBSITE',
      'CONTACTED',
      7200,
      'USD'
    ],
    [
      'seed-lead-06',
      'Inventory Digitization',
      'Pamir Traders',
      'Sayed Hashemi',
      'sayed@pamir-demo.local',
      'REFERRAL',
      'NEW',
      440000,
      'AFN'
    ],
    [
      'seed-lead-07',
      'Mobile App Discovery',
      'Rumi Education',
      'Soraya Rahman',
      'soraya@rumi-demo.local',
      'OTHER',
      'LOST',
      3900,
      'USD'
    ],
    [
      'seed-lead-08',
      'Cloud Migration',
      'Wakhan Telecom',
      'Jawad Nazari',
      'jawad@wakhan-demo.local',
      'EMAIL_CAMPAIGN',
      'CONTACTED',
      980000,
      'AFN'
    ]
  ]

  await transaction.crmlead.createMany({
    data: leadData.map((lead, index) => ({
      id: lead[0],
      title: lead[1],
      company_name: lead[2],
      contact_name: lead[3],
      email: lead[4],
      phone: `+93 78 330 4${String(index + 1).padStart(2, '0')}`,
      source_id: requireOption(options, 'LEAD_SOURCE', lead[5]),
      status_id: requireOption(options, 'LEAD_STATUS', lead[6]),
      assigned_to_id: index % 2 === 0 ? 'seed-staff-07' : 'seed-staff-01',
      estimated_value: decimal(lead[7]),
      amount_base: amountInBase(lead[7], lead[8]),
      currency: lead[8],
      exchange_rate: decimal(USD_AFN_RATE),
      notes: 'Deterministic CRM lead created for end-to-end testing.',
      next_follow_up_date: index < 6 ? relativeDate(index + 2) : null,
      created_at: relativeDate(-75 + index * 7)
    }))
  })

  const clientData = [
    ['seed-client-01', 'seed-lead-01', 'Aryana Retail Group', 'Nasir Wardak', 'accounts@aryana-demo.local'],
    ['seed-client-02', 'seed-lead-02', 'Hindukush Logistics', 'Shabnam Hussaini', 'finance@hindukush-demo.local'],
    ['seed-client-03', 'seed-lead-03', 'Sadaf Foods', 'Latif Azimi', 'billing@sadaf-demo.local'],
    ['seed-client-04', null, 'Kohistan Health Services', 'Farzana Wali', 'admin@kohistan-demo.local'],
    ['seed-client-05', null, 'Blue Mosque Hospitality', 'Qadir Samadi', 'finance@bluem-hotel-demo.local'],
    ['seed-client-06', null, 'Noor Renewable Energy', 'Samira Atal', 'office@noor-energy-demo.local']
  ]

  await transaction.crmclient.createMany({
    data: clientData.map((client, index) => ({
      id: client[0],
      lead_id: client[1],
      company_name: client[2],
      primary_contact_name: client[3],
      email: client[4],
      phone: `+93 79 720 5${String(index + 1).padStart(2, '0')}`,
      address: `${index + 1} Business District, Kabul, Afghanistan`,
      tax_id: `SEED-CLIENT-TIN-${index + 1}`,
      account_manager_id: index % 2 === 0 ? 'seed-staff-07' : 'seed-staff-01',
      status: index === 4 ? 'INACTIVE' : 'ACTIVE',
      notes: 'Mock client with interconnected contracts, projects, and finance records.'
    }))
  })

  const visitorData = [
    [
      'seed-visitor-01',
      'Nadia Jalali',
      'Kabul Learning Center',
      'Network project discussion',
      'CHECKED_OUT',
      'seed-lead-04'
    ],
    ['seed-visitor-02', 'Sayed Hashemi', 'Pamir Traders', 'Inventory demonstration', 'CHECKED_IN', null],
    ['seed-visitor-03', 'Roya Habibi', 'Independent', 'Employment inquiry', 'CHECKED_OUT', null],
    ['seed-visitor-04', 'Faisal Rafiq', 'Wakhan Telecom', 'Cloud migration workshop', 'CHECKED_IN', null],
    ['seed-visitor-05', 'Mina Farhad', 'UN Supplier', 'Vendor registration', 'CHECKED_OUT', null],
    ['seed-visitor-06', 'Haroon Bashir', 'Kabul Bank', 'Finance meeting', 'CHECKED_OUT', null]
  ]

  await transaction.crmvisitor.createMany({
    data: visitorData.map((visitor, index) => ({
      id: visitor[0],
      full_name: visitor[1],
      email: `visitor${index + 1}@demo.erp.local`,
      phone: `+93 77 440 6${String(index + 1).padStart(2, '0')}`,
      company_name: visitor[2],
      purpose: visitor[3],
      status: visitor[4],
      converted_lead_id: visitor[5],
      host_staff_id: index % 2 === 0 ? 'seed-staff-07' : 'seed-staff-06',
      visited_at: relativeDate(-10 + index),
      check_out_time: visitor[4] === 'CHECKED_OUT' ? dateTime(relativeDate(-10 + index), 16, 30) : null,
      notes: 'Mock front-desk visitor record.'
    }))
  })

  await transaction.crmactivity.createMany({
    data: Array.from({ length: 10 }, (_, index) => ({
      id: `seed-crm-activity-${String(index + 1).padStart(2, '0')}`,
      lead_id: index < 5 ? `seed-lead-${String(index + 4).padStart(2, '0')}` : null,
      client_id: index >= 5 ? `seed-client-${String((index % 6) + 1).padStart(2, '0')}` : null,
      staff_id: index % 2 === 0 ? 'seed-staff-07' : 'seed-staff-01',
      activity_type: ['CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP', 'PROPOSAL'][index % 5],
      title: `CRM follow-up activity ${index + 1}`,
      description: 'Mock CRM activity with a realistic ownership and completion state.',
      activity_date: relativeDate(-30 + index * 3),
      due_date: relativeDate(index - 2),
      is_completed: index < 7
    }))
  })

  return { clientData }
}

const seedContractsProjectsAndTasks = async (transaction, options) => {
  const contractData = [
    [
      'seed-contract-01',
      'CNT-001',
      'seed-client-01',
      'E-commerce Platform Support',
      'ACTIVE',
      'RETAINER',
      9600,
      'USD',
      -11,
      13,
      true
    ],
    [
      'seed-contract-02',
      'CNT-002',
      'seed-client-02',
      'Fleet Operations ERP',
      'ACTIVE',
      'FIXED_PRICE',
      780000,
      'AFN',
      -8,
      10,
      false
    ],
    [
      'seed-contract-03',
      'CNT-003',
      'seed-client-03',
      'Finance Automation Rollout',
      'EXPIRED',
      'SLA',
      6800,
      'USD',
      -18,
      -2,
      false
    ],
    [
      'seed-contract-04',
      'CNT-004',
      'seed-client-04',
      'Health Records Advisory',
      'PENDING',
      'FIXED_PRICE',
      410000,
      'AFN',
      1,
      8,
      false
    ],
    [
      'seed-contract-05',
      'CNT-005',
      'seed-client-05',
      'Hospitality Technology Retainer',
      'ACTIVE',
      'RETAINER',
      5200,
      'USD',
      -5,
      7,
      true
    ],
    [
      'seed-contract-06',
      'CNT-006',
      'seed-client-06',
      'Solar Asset Monitoring',
      'DRAFT',
      'SLA',
      560000,
      'AFN',
      2,
      14,
      true
    ]
  ]

  await transaction.contract.createMany({
    data: contractData.map((contract, index) => ({
      id: contract[0],
      contract_number: contract[1],
      client_id: contract[2],
      lead_id: index < 3 ? `seed-lead-${String(index + 1).padStart(2, '0')}` : null,
      title: contract[3],
      status_id: requireOption(options, 'CONTRACT_STATUS', contract[4]),
      contract_type_id: requireOption(options, 'CONTRACT_TYPE_CUSTOMER', contract[5]),
      country_id: requireOption(options, 'CONTRACT_COUNTRY', 'AFGHANISTAN'),
      level_id: requireOption(
        options,
        'CONTRACT_LEVEL',
        index % 3 === 0 ? 'ENTERPRISE' : index % 2 ? 'PREMIUM' : 'STANDARD'
      ),
      total_amount: decimal(contract[6]),
      amount_base: amountInBase(contract[6], contract[7]),
      currency: contract[7],
      exchange_rate: decimal(USD_AFN_RATE),
      percentage: decimal(100),
      contract_duration: '1_YEAR',
      signed_date: contract[4] === 'DRAFT' || contract[4] === 'PENDING' ? null : monthDate(contract[8], 3),
      start_date: monthDate(contract[8], 5),
      end_date: monthDate(contract[9], 28),
      auto_renew: contract[10],
      renewal_status: contract[10] ? 'ACTIVE' : 'NOT_APPLICABLE',
      document_url: `https://example.invalid/mock-contracts/${contract[1]}.pdf`,
      account_manager_id: index % 2 === 0 ? 'seed-staff-07' : 'seed-staff-01'
    }))
  })

  await transaction.contractnotification.createMany({
    data: contractData.slice(0, 6).map((contract, index) => ({
      id: `seed-contract-notification-${index + 1}`,
      contract_id: contract[0],
      reminder_type: index % 2 ? 'EXPIRY_30_DAYS' : 'RENEWAL_REVIEW',
      sent_at: relativeDate(-index * 4),
      recipient_email: `contracts${index + 1}@demo.erp.local`,
      status: index === 5 ? 'PENDING' : 'SENT'
    }))
  })

  const projectData = [
    [
      'seed-project-01',
      'PRJ-001',
      'seed-client-01',
      'seed-contract-01',
      'Retail Platform Upgrade',
      'IN_PROGRESS',
      'HIGH',
      18500,
      'USD',
      62
    ],
    [
      'seed-project-02',
      'PRJ-002',
      'seed-client-02',
      'seed-contract-02',
      'Fleet ERP Implementation',
      'IN_PROGRESS',
      'URGENT',
      980000,
      'AFN',
      48
    ],
    [
      'seed-project-03',
      'PRJ-003',
      'seed-client-03',
      'seed-contract-03',
      'Finance Workflow Automation',
      'COMPLETED',
      'MEDIUM',
      7200,
      'USD',
      100
    ],
    [
      'seed-project-04',
      'PRJ-004',
      'seed-client-04',
      'seed-contract-04',
      'Clinic Data Assessment',
      'PLANNING',
      'MEDIUM',
      360000,
      'AFN',
      15
    ],
    [
      'seed-project-05',
      'PRJ-005',
      'seed-client-05',
      'seed-contract-05',
      'Hotel Booking Integration',
      'ON_HOLD',
      'LOW',
      6100,
      'USD',
      35
    ],
    [
      'seed-project-06',
      'PRJ-006',
      'seed-client-06',
      'seed-contract-06',
      'Solar Monitoring Prototype',
      'ACTIVE',
      'HIGH',
      450000,
      'AFN',
      55
    ]
  ]

  await transaction.project.createMany({
    data: projectData.map((project, index) => ({
      id: project[0],
      project_code: project[1],
      client_id: project[2],
      contract_id: project[3],
      title: project[4],
      description: `Mock project at ${project[9]}% completion for integrated ERP testing.`,
      status_id: requireOption(options, 'PROJECT_STATUS', project[5]),
      priority_id: requireOption(options, 'PROJECT_PRIORITY', project[6]),
      project_area: ['Technology', 'Operations', 'Finance', 'Healthcare', 'Hospitality', 'Energy'][index],
      project_sponsor: [
        'Nasir Wardak',
        'Shabnam Hussaini',
        'Latif Azimi',
        'Farzana Wali',
        'Qadir Samadi',
        'Samira Atal'
      ][index],
      project_manager_id: index % 2 === 0 ? 'seed-staff-06' : 'seed-staff-01',
      estimated_hours: decimal(320 + index * 75),
      actual_hours: decimal(project[9] * 3.2),
      budget: decimal(project[7]),
      amount_base: amountInBase(project[7], project[8]),
      currency: project[8],
      exchange_rate: decimal(USD_AFN_RATE),
      start_date: monthDate(-6 + index, 4),
      end_date: monthDate(2 + index, 24),
      actual_end_date: project[5] === 'COMPLETED' ? monthDate(-1, 20) : null
    }))
  })

  await transaction.projectmember.createMany({
    data: projectData.flatMap((project, index) => [
      {
        id: `seed-project-member-${index + 1}-1`,
        project_id: project[0],
        staff_id: 'seed-staff-06',
        role: 'Project Lead'
      },
      {
        id: `seed-project-member-${index + 1}-2`,
        project_id: project[0],
        staff_id: index % 2 ? 'seed-staff-04' : 'seed-staff-05',
        role: index % 2 ? 'Operations Specialist' : 'Technical Specialist'
      },
      {
        id: `seed-project-member-${index + 1}-3`,
        project_id: project[0],
        staff_id: 'seed-staff-07',
        role: 'Client Liaison'
      }
    ])
  })

  const taskRows = []
  const assigneeRows = []
  const taskStatusCycle = ['TO_DO', 'IN_PROGRESS', 'COMPLETED']
  const priorityCycle = ['MEDIUM', 'HIGH', 'URGENT', 'LOW']

  projectData.forEach((project, projectIndex) => {
    for (let taskIndex = 0; taskIndex < 3; taskIndex += 1) {
      const ordinal = projectIndex * 3 + taskIndex + 1
      const status = project[5] === 'COMPLETED' ? 'COMPLETED' : taskStatusCycle[(projectIndex + taskIndex) % 3]
      const taskId = `seed-task-${String(ordinal).padStart(2, '0')}`

      taskRows.push({
        id: taskId,
        project_id: project[0],
        title: ['Requirements and discovery', 'Implementation and configuration', 'Quality review and handover'][
          taskIndex
        ],
        description: `Mock delivery task ${ordinal} for ${project[4]}.`,
        status_id: requireOption(options, 'TASK_STATUS', status),
        priority_id: requireOption(options, 'TASK_PRIORITY', priorityCycle[ordinal % priorityCycle.length]),
        created_by_id: 'seed-staff-06',
        estimated_hours: decimal(18 + taskIndex * 14),
        actual_hours: decimal(status === 'COMPLETED' ? 17 + taskIndex * 13 : 5 + taskIndex * 4),
        due_date: relativeDate(-12 + ordinal * 3),
        completed_at: status === 'COMPLETED' ? relativeDate(-15 + ordinal) : null
      })
      assigneeRows.push({
        id: `seed-task-assignee-${ordinal}-1`,
        task_id: taskId,
        staff_id: taskIndex === 1 ? 'seed-staff-04' : 'seed-staff-05'
      })

      if (taskIndex === 2) {
        assigneeRows.push({ id: `seed-task-assignee-${ordinal}-2`, task_id: taskId, staff_id: 'seed-staff-07' })
      }
    }
  })

  await transaction.task.createMany({ data: taskRows })
  await transaction.taskassignee.createMany({ data: assigneeRows })

  return { contractData, projectData }
}

const seedInvoicesAndFinance = async (transaction, options) => {
  const invoiceData = [
    ['seed-invoice-01', 'INV-001', 'seed-contract-01', 'seed-client-01', 120000, 'AFN', 'PAID', 120000, -5, -4],
    ['seed-invoice-02', 'INV-002', 'seed-contract-02', 'seed-client-02', 4000, 'USD', 'PAID', 4000, -4, -3],
    ['seed-invoice-03', 'INV-003', 'seed-contract-01', 'seed-client-01', 180000, 'AFN', 'PARTIALLY_PAID', 60000, -3, 1],
    ['seed-invoice-04', 'INV-004', 'seed-contract-05', 'seed-client-05', 2200, 'USD', 'PARTIALLY_PAID', 700, -2, 2],
    ['seed-invoice-05', 'INV-005', 'seed-contract-02', 'seed-client-02', 90000, 'AFN', 'PARTIALLY_PAID', 30000, -1, 2],
    ['seed-invoice-06', 'INV-006', 'seed-contract-04', 'seed-client-04', 140000, 'AFN', 'UNPAID', 0, -4, -3],
    ['seed-invoice-07', 'INV-007', 'seed-contract-06', 'seed-client-06', 3500, 'USD', 'UNPAID', 0, -3, -2],
    ['seed-invoice-08', 'INV-008', 'seed-contract-03', 'seed-client-03', 75000, 'AFN', 'UNPAID', 0, -2, -1]
  ]

  await transaction.contractinvoice.createMany({
    data: invoiceData.map(invoice => ({
      id: invoice[0],
      invoice_number: invoice[1],
      contract_id: invoice[2],
      client_id: invoice[3],
      amount: decimal(invoice[4]),
      amount_base: amountInBase(invoice[4], invoice[5]),
      currency: invoice[5],
      exchange_rate: decimal(USD_AFN_RATE),
      status_id: requireOption(options, 'INVOICE_STATUS', invoice[6]),
      paid_amount: decimal(invoice[7]),
      remaining_balance: decimal(invoice[4] - invoice[7]),
      issued_date: monthDate(invoice[8], 8),
      due_date: monthDate(invoice[9], 18)
    }))
  })

  const invoicePayments = [
    [
      'seed-income-invoice-01',
      'seed-invoice-01',
      'seed-client-01',
      'seed-contract-01',
      120000,
      'AFN',
      'BANK_TRANSFER',
      -4
    ],
    [
      'seed-income-invoice-02',
      'seed-invoice-02',
      'seed-client-02',
      'seed-contract-02',
      1500,
      'USD',
      'BANK_TRANSFER',
      -3
    ],
    ['seed-income-invoice-03', 'seed-invoice-02', 'seed-client-02', 'seed-contract-02', 2500, 'USD', 'CHEQUE', -2],
    ['seed-income-invoice-04', 'seed-invoice-03', 'seed-client-01', 'seed-contract-01', 60000, 'AFN', 'CASH', -1],
    ['seed-income-invoice-05', 'seed-invoice-04', 'seed-client-05', 'seed-contract-05', 700, 'USD', 'BANK_TRANSFER', 0],
    [
      'seed-income-invoice-06',
      'seed-invoice-05',
      'seed-client-02',
      'seed-contract-02',
      30000,
      'AFN',
      'BANK_TRANSFER',
      0
    ]
  ]

  const incomeRows = invoicePayments.map(payment => ({
    id: payment[0],
    invoice_id: payment[1],
    client_id: payment[2],
    contract_id: payment[3],
    received_by_id: 'seed-staff-03',
    status: 'PAID',
    name: `Invoice settlement ${payment[1].slice(-2)}`,
    pay_details: JSON.stringify({ payment_method: payment[6], seeded: true }),
    payment_method_id: requireOption(options, 'PAYMENT_METHOD', payment[6]),
    payment_date: monthDate(payment[7], 22),
    notes: 'Seeded invoice payment',
    income_type_id: requireOption(options, 'INCOME_TYPE', 'CONTRACT_PAYMENT'),
    total_amount: decimal(payment[4]),
    paid_amount: decimal(payment[4]),
    remind_amount: decimal(0),
    currency: payment[5],
    exchange_rate: decimal(USD_AFN_RATE),
    amount_base: amountInBase(payment[4], payment[5]),
    created_at: monthDate(payment[7], 22)
  }))

  const generalIncome = [
    [
      'seed-income-general-01',
      'Monthly Support Retainer',
      'SERVICE_INCOME',
      85000,
      'AFN',
      'seed-client-04',
      'seed-project-04',
      -5
    ],
    [
      'seed-income-general-02',
      'Implementation Workshop',
      'PROJECT_REVENUE',
      1800,
      'USD',
      'seed-client-05',
      'seed-project-05',
      -4
    ],
    [
      'seed-income-general-03',
      'Data Migration Service',
      'SERVICE_INCOME',
      145000,
      'AFN',
      'seed-client-02',
      'seed-project-02',
      -3
    ],
    [
      'seed-income-general-04',
      'Technical Advisory',
      'OTHER_INCOME',
      950,
      'USD',
      'seed-client-06',
      'seed-project-06',
      -2
    ],
    [
      'seed-income-general-05',
      'Training Delivery',
      'PROJECT_REVENUE',
      72000,
      'AFN',
      'seed-client-01',
      'seed-project-01',
      -1
    ],
    [
      'seed-income-general-06',
      'Annual Maintenance Fee',
      'SERVICE_INCOME',
      1300,
      'USD',
      'seed-client-03',
      'seed-project-03',
      0
    ]
  ]

  generalIncome.forEach(income => {
    incomeRows.push({
      id: income[0],
      client_id: income[5],
      project_id: income[6],
      received_by_id: 'seed-staff-03',
      status: 'PAID',
      name: income[1],
      pay_details: 'Operational income received through the company bank account.',
      income_type_id: requireOption(options, 'INCOME_TYPE', income[2]),
      total_amount: decimal(income[3]),
      paid_amount: decimal(income[3]),
      remind_amount: decimal(0),
      currency: income[4],
      exchange_rate: decimal(USD_AFN_RATE),
      amount_base: amountInBase(income[3], income[4]),
      created_at: monthDate(income[7], 14)
    })
  })

  await transaction.financeincome.createMany({ data: incomeRows })

  const expenseData = [
    ['RENT', 'Kabul office monthly rent', 125000, 'AFN'],
    ['UTILITIES', 'Electricity and internet services', 28000, 'AFN'],
    ['SOFTWARE_SUBSCRIPTIONS', 'Cloud productivity subscriptions', 620, 'USD'],
    ['OFFICE_SUPPLIES', 'Printer paper and stationery', 18500, 'AFN'],
    ['TRAVEL', 'Client implementation travel', 47000, 'AFN'],
    ['PROJECT_COST', 'Fleet ERP field equipment', 1100, 'USD'],
    ['MARKETING', 'Quarterly digital campaign', 36000, 'AFN'],
    ['SOFTWARE_SUBSCRIPTIONS', 'Development platform licenses', 780, 'USD'],
    ['UTILITIES', 'Generator fuel and maintenance', 32000, 'AFN'],
    ['OFFICE_SUPPLIES', 'Meeting and training materials', 22500, 'AFN'],
    ['TRAVEL', 'Regional sales visit', 540, 'USD'],
    ['OTHER_EXPENSE', 'Professional audit consultation', 69000, 'AFN']
  ]

  await transaction.financeexpense.createMany({
    data: expenseData.map((expense, index) => ({
      id: `seed-expense-${String(index + 1).padStart(2, '0')}`,
      voucher_number: `EXP-2026-${String(index + 1).padStart(3, '0')}`,
      vendor_payee: ['Kabul Property Management', 'Kabul Electric', 'Cloud Software Vendor', 'Office Supplies Vendor'][index % 4],
      approval_status: 'PAID',
      approved_at: monthDate(-(index % 6), 3 + (index % 20)),
      paid_at: monthDate(-(index % 6), 4 + (index % 20)),
      project_id: ['PROJECT_COST', 'TRAVEL'].includes(expense[0])
        ? `seed-project-${String((index % 6) + 1).padStart(2, '0')}`
        : null,
      spent_by_id: index % 3 === 0 ? 'seed-staff-06' : 'seed-staff-03',
      payment_method_id: requireOption(options, 'PAYMENT_METHOD', index % 4 === 0 ? 'CASH' : 'BANK_TRANSFER'),
      receipt_url: `https://example.invalid/mock-receipts/EXP-${String(index + 1).padStart(3, '0')}.pdf`,
      expense_date: monthDate(-(index % 6), 4 + (index % 20)),
      details: expense[1],
      expense_type_id: requireOption(options, 'EXPENSE_TYPE', expense[0]),
      quantity: 1,
      unit_price: decimal(expense[2]),
      sub_total: decimal(expense[2]),
      currency: expense[3],
      exchange_rate: decimal(USD_AFN_RATE),
      amount_base: amountInBase(expense[2], expense[3])
    }))
  })

  await transaction.generalledgerentry.createMany({
    data: expenseData.map((expense, index) => ({
      id: `seed-ledger-expense-${String(index + 1).padStart(2, '0')}`,
      expense_id: `seed-expense-${String(index + 1).padStart(2, '0')}`,
      account_code: ['PROJECT_COST', 'TRAVEL'].includes(expense[0]) ? 'EXPENSE-PROJECT' : 'EXPENSE-OVERHEAD',
      entry_type: 'DEBIT',
      transaction_amount: decimal(expense[2]),
      transaction_currency: expense[3],
      exchange_rate: decimal(USD_AFN_RATE),
      debit_base: amountInBase(expense[2], expense[3]),
      credit_base: decimal(0),
      entry_date: monthDate(-(index % 6), 4 + (index % 20)),
      description: `${expense[1]} (${expense[3]})`
    }))
  })
}

const seedLoansAndPayroll = async (transaction, options, attendanceRows, holidays, leaveDefinitions) => {
  const loanData = [
    ['seed-loan-01', 'SLN-2026-001', 'seed-staff-05', 60000, 10000, 0, 'REQUESTED', 'AFN'],
    ['seed-loan-02', 'SLN-2026-002', 'seed-staff-07', 45000, 7500, 0, 'APPROVED', 'AFN'],
    ['seed-loan-03', 'SLN-2026-003', 'seed-staff-04', 90000, 15000, 30000, 'ACTIVE', 'AFN'],
    ['seed-loan-04', 'SLN-2026-004', 'seed-staff-05', 1200, 200, 400, 'ACTIVE', 'USD'],
    ['seed-loan-05', 'SLN-2026-005', 'seed-staff-06', 50000, 10000, 50000, 'REPAID', 'AFN'],
    ['seed-loan-06', 'SLN-2026-006', 'seed-staff-02', 700, 140, 0, 'REJECTED', 'USD']
  ]

  await transaction.financeloan.createMany({
    data: loanData.map((loan, index) => ({
      id: loan[0],
      loan_number: loan[1],
      staff_id: loan[2],
      loan_type: 'STAFF',
      total_amount: decimal(loan[3]),
      monthly_deduction: decimal(loan[4]),
      repaid_amount: decimal(loan[5]),
      remaining_balance: decimal(loan[3] - loan[5]),
      status_id: requireOption(options, 'LOAN_STATUS', loan[6]),
      issue_date: monthDate(-8 + Math.min(index, 2), 7),
      repayment_start_date: monthDate(-7 + Math.min(index, 2), 1),
      auto_deduct: true,
      reason: [
        'Medical support',
        'Education expenses',
        'Home equipment',
        'Professional laptop',
        'Family support',
        'Non-eligible request'
      ][index],
      approved_by_id: ['APPROVED', 'ACTIVE', 'REPAID'].includes(loan[6]) ? 'seed-staff-03' : null,
      currency: loan[7],
      exchange_rate: decimal(USD_AFN_RATE),
      amount_base: amountInBase(loan[3], loan[7])
    }))
  })

  const repaymentData = [
    ['seed-repayment-01', 'seed-loan-03', 15000, 'MANUAL_CASH', 'seed-loan03-cash-01', 'CASH', -3],
    ['seed-repayment-02', 'seed-loan-03', 15000, 'SALARY_DEDUCTION', 'seed-salary-04', 'BANK_TRANSFER', 0],
    ['seed-repayment-03', 'seed-loan-04', 200, 'MANUAL_BANK', 'seed-loan04-bank-01', 'BANK_TRANSFER', -2],
    ['seed-repayment-04', 'seed-loan-04', 200, 'SALARY_DEDUCTION', 'seed-salary-05', 'BANK_TRANSFER', 0],
    ['seed-repayment-05', 'seed-loan-05', 10000, 'MANUAL_CASH', 'seed-loan05-cash-01', 'CASH', -5],
    ['seed-repayment-06', 'seed-loan-05', 10000, 'MANUAL_CASH', 'seed-loan05-cash-02', 'CASH', -4],
    ['seed-repayment-07', 'seed-loan-05', 20000, 'MANUAL_BANK', 'seed-loan05-bank-01', 'BANK_TRANSFER', -3],
    ['seed-repayment-08', 'seed-loan-05', 10000, 'SALARY_DEDUCTION', 'seed-salary-06', 'BANK_TRANSFER', 0]
  ]

  await transaction.loanrepayment.createMany({
    data: repaymentData.map(repayment => {
      const loan = loanData.find(item => item[0] === repayment[1])

      return {
        id: repayment[0],
        loan_id: repayment[1],
        amount: decimal(repayment[2]),
        repayment_date: monthDate(repayment[6], 24),
        payment_method_id: requireOption(options, 'PAYMENT_METHOD', repayment[5]),
        source: repayment[3],
        reference_id: repayment[4],
        currency: loan[7],
        exchange_rate: decimal(USD_AFN_RATE),
        amount_base: amountInBase(repayment[2], loan[7]),
        created_by_user_id: 'seed-user-finance',
        notes: 'Historical mock repayment reconciled to the loan aggregate.'
      }
    })
  })

  const payrollMonthDate = monthDate(-1, 1)
  const payrollMonth = monthKey(payrollMonthDate)
  const payrollEnd = monthDate(0, 1)
  const holidayKeys = new Set(holidays.map(([, date]) => dateKey(date)))
  const workingDateKeys = new Set()

  for (let date = payrollMonthDate; date < payrollEnd; date = addDays(date, 1)) {
    if (!isWeekend(date) && !holidayKeys.has(dateKey(date))) workingDateKeys.add(dateKey(date))
  }

  const payrollStaff = [
    ['seed-staff-01', 1800, 'USD', 0],
    ['seed-staff-02', 95000, 'AFN', 0],
    ['seed-staff-03', 1200, 'USD', 0],
    ['seed-staff-04', 65000, 'AFN', 15000],
    ['seed-staff-05', 900, 'USD', 200],
    ['seed-staff-06', 85000, 'AFN', 10000],
    ['seed-staff-07', 60000, 'AFN', 0]
  ]

  await transaction.financesalary.createMany({
    data: payrollStaff.map((staff, index) => {
      const records = attendanceRows.filter(
        row => row.staff_id === staff[0] && dateKey(row.date).startsWith(payrollMonth)
      )

      const presentDays = records.filter(
        row => workingDateKeys.has(dateKey(row.date)) && row.status === 'PRESENT'
      ).length

      const paidLeaveDays = leaveDefinitions
        .filter(leave => leave.staff === staff[0] && leave.status === 'APPROVED' && leave.paid)
        .reduce((total, leave) => {
          const fullRangeDays = Math.floor((leave.dates.at(-1) - leave.dates[0]) / DAY_MS) + 1

          const creditedDates = leave.dates.filter(
            date => dateKey(date).startsWith(payrollMonth) && workingDateKeys.has(dateKey(date))
          )

          return total + Math.min(creditedDates.length, leave.days * (creditedDates.length / fullRangeDays))
        }, 0)

      const paidDays = Math.round((presentDays + paidLeaveDays) * 2) / 2
      const totalDays = workingDateKeys.size
      const dailyRate = staff[1] / totalDays
      const earned = dailyRate * paidDays
      const deduction = Math.min(staff[3], earned)
      const bonus = index === 2 ? 100 : 0
      const payable = earned + bonus - deduction

      return {
        id: `seed-salary-${String(index + 1).padStart(2, '0')}`,
        staff_id: staff[0],
        timesheet_month: payrollMonth,
        total_month_days: totalDays,
        worked_days: decimal(paidDays),
        off_days: decimal(Math.max(0, totalDays - paidDays)),
        base_salary: decimal(staff[1]),
        base_daily_rate: decimal(dailyRate.toFixed(2)),
        earned_salary: decimal(earned.toFixed(2)),
        bonus_amount: decimal(bonus),
        loan_deduction: decimal(deduction),
        payable_amount: decimal(payable.toFixed(2)),
        exchange_rate: decimal(USD_AFN_RATE),
        loan_status: deduction > 0 ? 'DEDUCTED' : 'NOT_APPLICABLE',
        payment_date: monthDate(0, 3),
        processed_by_id: 'seed-staff-03',
        amount_base: amountInBase(Number(payable.toFixed(2)), staff[2]),
        currency: staff[2],
        status: index === 6 ? 'PENDING' : 'PAID',
        timesheet_summary: `Seed payroll: ${paidDays} payable of ${totalDays} working days; ${presentDays} present and ${paidLeaveDays} approved paid leave days.`
      }
    })
  })
}

const seedInventory = async (transaction, options) => {
  const inventoryData = [
    [
      'seed-inventory-01',
      'Dell Latitude Laptop',
      'ITM-001',
      'COMPUTERS',
      950,
      'USD',
      5,
      [
        ['OPENING_BALANCE', 'IN', 18],
        ['ADDITION', 'IN', 7],
        ['DEDUCTION', 'OUT', 9]
      ]
    ],
    [
      'seed-inventory-02',
      '24-inch Monitor',
      'ITM-002',
      'COMPUTERS',
      185,
      'USD',
      4,
      [
        ['OPENING_BALANCE', 'IN', 20],
        ['DEDUCTION', 'OUT', 8],
        ['RETURN', 'IN', 2]
      ]
    ],
    [
      'seed-inventory-03',
      'Enterprise Wi-Fi Router',
      'ITM-003',
      'NETWORKING',
      22000,
      'AFN',
      3,
      [
        ['OPENING_BALANCE', 'IN', 10],
        ['ADDITION', 'IN', 5],
        ['DAMAGE', 'OUT', 2]
      ]
    ],
    [
      'seed-inventory-04',
      'Managed Network Switch',
      'ITM-004',
      'NETWORKING',
      38000,
      'AFN',
      3,
      [
        ['OPENING_BALANCE', 'IN', 8],
        ['TRANSFER_OUT', 'OUT', 2],
        ['RETURN', 'IN', 1]
      ]
    ],
    [
      'seed-inventory-05',
      'Laser Printer',
      'ITM-005',
      'OFFICE_EQUIPMENT',
      420,
      'USD',
      2,
      [
        ['OPENING_BALANCE', 'IN', 6],
        ['ADDITION', 'IN', 2],
        ['DAMAGE', 'OUT', 1]
      ]
    ],
    [
      'seed-inventory-06',
      'A4 Paper Carton',
      'ITM-006',
      'CONSUMABLES',
      2400,
      'AFN',
      15,
      [
        ['OPENING_BALANCE', 'IN', 60],
        ['ADDITION', 'IN', 40],
        ['DEDUCTION', 'OUT', 72]
      ]
    ],
    [
      'seed-inventory-07',
      'Printer Toner Cartridge',
      'ITM-007',
      'CONSUMABLES',
      6800,
      'AFN',
      8,
      [
        ['OPENING_BALANCE', 'IN', 25],
        ['DEDUCTION', 'OUT', 16],
        ['DAMAGE', 'OUT', 2]
      ]
    ],
    [
      'seed-inventory-08',
      'Ergonomic Office Chair',
      'ITM-008',
      'FURNITURE',
      14500,
      'AFN',
      3,
      [
        ['OPENING_BALANCE', 'IN', 14],
        ['TRANSFER_IN', 'IN', 2],
        ['DEDUCTION', 'OUT', 4]
      ]
    ],
    [
      'seed-inventory-09',
      'External SSD 1TB',
      'ITM-009',
      'COMPUTERS',
      110,
      'USD',
      5,
      [
        ['OPENING_BALANCE', 'IN', 12],
        ['DEDUCTION', 'OUT', 8],
        ['DAMAGE', 'OUT', 1]
      ]
    ]
  ]

  for (const item of inventoryData) {
    const finalQuantity = item[7].reduce(
      (balance, movement) => balance + movement[2] * (movement[1] === 'OUT' ? -1 : 1),
      0
    )

    const status = finalQuantity === 0 ? 'OUT_OF_STOCK' : finalQuantity <= item[6] ? 'LOW_STOCK' : 'IN_STOCK'

    await transaction.inventory.create({
      data: {
        id: item[0],
        name: item[1],
        sku_code: item[2],
        category_id: requireOption(options, 'INVENTORY_CATEGORY', item[3]),
        quantity_in_stock: finalQuantity,
        unit_price: decimal(item[4]),
        status_id: requireOption(options, 'INVENTORY_STATUS', status),
        reorder_level: item[6],
        currency: item[5],
        exchange_rate: decimal(USD_AFN_RATE),
        amount_base: amountInBase(item[4], item[5])
      }
    })

    let balance = 0

    await transaction.inventorymovement.createMany({
      data: item[7].map((movement, movementIndex) => {
        const before = balance

        balance += movement[2] * (movement[1] === 'OUT' ? -1 : 1)

        return {
          id: `seed-movement-${item[2].slice(-3)}-${movementIndex + 1}`,
          inventory_id: item[0],
          movement_type: movement[0],
          direction: movement[1],
          quantity: movement[2],
          quantity_before: before,
          quantity_after: balance,
          occurred_at: relativeDate(-80 + movementIndex * 25 + Number(item[2].slice(-1))),
          reference_id: `SEED-MOV-${item[2]}-${movementIndex + 1}`,
          related_inventory_id:
            movement[0] === 'TRANSFER_OUT'
              ? 'seed-inventory-08'
              : movement[0] === 'TRANSFER_IN'
                ? 'seed-inventory-04'
                : null,
          notes: `Mock ${movement[0].toLowerCase().replaceAll('_', ' ')} inventory transaction.`,
          created_by_user_id: 'seed-user-inventory'
        }
      })
    })
  }
}

const seedAuditLogs = async transaction => {
  const auditDefinitions = [
    ['SETUP_UPDATED', 'SETUP', 'seed-user-admin'],
    ['STAFF_CREATED', 'HRM', 'seed-user-hr'],
    ['LEAVE_APPROVED', 'HRM', 'seed-user-hr'],
    ['PAYROLL_PROCESSED', 'FINANCE', 'seed-user-finance'],
    ['INVOICE_PAYMENT_RECORDED', 'CONTRACTS', 'seed-user-finance'],
    ['LOAN_REPAYMENT_RECORDED', 'FINANCE', 'seed-user-finance'],
    ['INVENTORY_MOVEMENT_RECORDED', 'INVENTORY', 'seed-user-inventory'],
    ['PROJECT_UPDATED', 'PROJECTS', 'seed-user-admin'],
    ['TASK_COMPLETED', 'TASKS', 'seed-user-employee'],
    ['CRM_ACTIVITY_CREATED', 'CRM', 'seed-user-admin']
  ]

  await transaction.auditlog.createMany({
    data: auditDefinitions.map((audit, index) => ({
      id: `seed-audit-${String(index + 1).padStart(2, '0')}`,
      action: audit[0],
      module: audit[1],
      user_id: audit[2],
      ip_address: '127.0.0.1',
      user_agent: 'ERP deterministic seed',
      details: { seeded: true, sequence: index + 1, description: 'Mock compliance event' },
      created_at: relativeDate(-20 + index * 2)
    }))
  })
}

export const seedMockData = async (prisma, { passwordHash }) => {
  await prisma.$transaction(
    async transaction => {
      await clearMockData(transaction)
      await seedSetupAndUsers(transaction, passwordHash)

      const options = await getOptionMap(transaction)
      const { attendanceRows, holidays, leaveDefinitions } = await seedStaffAndAttendance(transaction, options)

      await seedCrm(transaction, options)
      await seedContractsProjectsAndTasks(transaction, options)
      await seedInvoicesAndFinance(transaction, options)
      await seedLoansAndPayroll(transaction, options, attendanceRows, holidays, leaveDefinitions)
      await seedInventory(transaction, options)
      await seedAuditLogs(transaction)
    },
    { timeout: 120_000 }
  )
}
