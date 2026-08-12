const horizontalMenuData = dictionary => [
  {
    label: dictionary.navigation.dashboard,
    icon: 'tabler-smart-home',
    href: '/dashboard',
    permission: 'dashboard:read'
  },
  {
    label: dictionary.navigation.hrm,
    icon: 'tabler-users',
    permission: 'hrm:read',
    children: [
      {
        label: dictionary.navigation.staffList,
        href: '/hrm/staff',
        permission: 'hrm_staff:read'
      },
      {
        label: dictionary.navigation.staffContracts,
        href: '/hrm/contracts',
        permission: 'hrm_contract:read'
      },
      {
        label: dictionary.navigation.leaves,
        href: '/hrm/leaves',
        permission: 'hrm_leave:read'
      },
      {
        label: dictionary.navigation.timesheets,
        href: '/hrm/timesheets',
        permission: 'hrm_timesheet:read'
      },
      {
        label: dictionary.navigation.hrmReports,
        href: '/hrm/reports',
        permission: 'hrm_reports:read'
      }
    ]
  },
  {
    label: dictionary.navigation.projects,
    icon: 'tabler-briefcase',
    permission: 'projects:read',
    children: [
      {
        label: dictionary.navigation.projectsList,
        href: '/projects',
        permission: 'projects:read'
      },
      {
        label: dictionary.navigation.projectMembers,
        href: '/projects/members',
        permission: 'projects_members:read'
      },
      {
        label: dictionary.navigation.projectContracts,
        href: '/projects/contracts',
        permission: 'projects_contracts:read'
      }
    ]
  },
  {
    label: dictionary.navigation.contractModule,
    icon: 'tabler-file-text',
    permission: 'contracts:read',
    children: [
      {
        label: dictionary.navigation.contractList,
        href: '/contracts',
        permission: 'contracts:read'
      },
      {
        label: dictionary.navigation.contractInvoices,
        href: '/contract/invoices',
        permission: 'contracts_invoice:read'
      },
      {
        label: dictionary.navigation.contractOthers,
        href: '/contract/others',
        permission: 'contracts_other:read'
      },
      {
        label: dictionary.navigation.contractCustomers,
        href: '/contract/customer',
        permission: 'contracts_customer:read'
      },
      {
        label: dictionary.navigation.contractNotifications,
        href: '/contract/notifications',
        permission: 'contracts_notification:read'
      }
    ]
  },
  {
    label: dictionary.navigation.crm,
    icon: 'tabler-user-check',
    permission: 'crm:read',
    children: [
      {
        label: dictionary.navigation.crmLeads,
        href: '/crm/leads',
        permission: 'crm_lead:read'
      },
      {
        label: dictionary.navigation.crmClients,
        href: '/crm/clients',
        permission: 'crm_client:read'
      },
      {
        label: dictionary.navigation.visitors,
        href: '/crm/visitors',
        permission: 'crm_visitor:read'
      }
    ]
  },
  {
    label: dictionary.navigation.tasks,
    icon: 'tabler-checkbox',
    href: '/tasks',
    permission: 'tasks:read'
  },
  {
    label: dictionary.navigation.finance,
    icon: 'tabler-currency-dollar',
    permission: 'finance:read',
    children: [
      {
        label: dictionary.navigation.incomes,
        href: '/finance/incomes',
        permission: 'finance_income:read'
      },
      {
        label: dictionary.navigation.expenses,
        href: '/finance/expenses',
        permission: 'finance_expense:read'
      },
      {
        label: dictionary.navigation.salary,
        href: '/finance/salary',
        permission: 'finance_salary:read'
      },
      {
        label: dictionary.navigation.loans,
        href: '/finance/loans',
        permission: 'finance_loan:read'
      },
      {
        label: dictionary.navigation.inventory,
        href: '/finance/inventory',
        permission: 'finance_inventory:read'
      },
      {
        label: dictionary.navigation.financeReports,
        href: '/finance/reports',
        permission: 'finance_reports:read'
      }
    ]
  },
  {
    label: dictionary.navigation.options,
    icon: 'tabler-list-details',
    permission: 'options:read',
    children: [
      {
        label: dictionary.navigation.lookupOptions,
        href: '/options',
        permission: 'options:read'
      },
      {
        label: dictionary.navigation.contractPolicies,
        href: '/options/contracts/staff-policy',
        permission: 'options:read'
      },
      {
        label: dictionary.navigation.staffPositions,
        href: '/options/hrm/positions',
        permission: 'options:read'
      }
    ]
  },
  {
    label: dictionary.navigation.setupSettings,
    icon: 'tabler-building',
    permission: 'settings:manage',
    children: [
      {
        label: dictionary.navigation.companySetup,
        href: '/setup',
        permission: 'setup:manage'
      },
      {
        label: dictionary.navigation.rolesPermissions,
        href: '/setup/roles',
        permission: 'settings_roles:manage'
      },
      {
        label: dictionary.navigation.systemAuditLogs,
        href: '/setup/audit-logs',
        permission: 'audit:read'
      }
    ]
  }
]

export default horizontalMenuData
