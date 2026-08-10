const verticalMenuData = dictionary => [
  {
    label: dictionary.navigation.dashboard,
    icon: 'tabler-smart-home',
    href: '/dashboard'
  },
  {
    label: dictionary.navigation.hrm,
    icon: 'tabler-users',
    children: [
      {
        label: dictionary.navigation.staffList,
        href: '/hrm/staff-list'
      },
      {
        label: dictionary.navigation.staffContracts,
        href: '/hrm/contracts'
      },
      {
        label: dictionary.navigation.leaves,
        href: '/hrm/leaves'
      },
      {
        label: dictionary.navigation.timesheets,
        href: '/hrm/timesheets'
      },
      {
        label: dictionary.navigation.hrmReports,
        href: '/hrm/reports'
      }
    ]
  },
  {
    label: dictionary.navigation.projects,
    icon: 'tabler-briefcase',
    children: [
      {
        label: dictionary.navigation.projectsList,
        href: '/projects'
      },
      {
        label: dictionary.navigation.projectMembers,
        href: '/projects/members'
      },
      {
        label: dictionary.navigation.projectContracts,
        href: '/projects/contracts'
      }
    ]
  },
  {
    label: dictionary.navigation.contractModule,
    icon: 'tabler-file-text',
    children: [
      {
        label: dictionary.navigation.contractList,
        href: '/contracts'
      },
      {
        label: dictionary.navigation.contractInvoices,
        href: '/contract/invoices'
      },
      {
        label: dictionary.navigation.contractOthers,
        href: '/contract/others'
      },
      {
        label: dictionary.navigation.contractCustomers,
        href: '/contract/customer'
      },
      {
        label: dictionary.navigation.contractNotifications,
        href: '/contract/notifications'
      }
    ]
  },
  {
    label: dictionary.navigation.crm,
    icon: 'tabler-user-check',
    children: [
      {
        label: dictionary.navigation.crmLeads,
        href: '/crm/leads'
      },
      {
        label: dictionary.navigation.crmClients,
        href: '/crm/clients'
      },
      {
        label: dictionary.navigation.visitors,
        href: '/crm/visitors'
      }
    ]
  },
  {
    label: dictionary.navigation.tasks,
    icon: 'tabler-checkbox',
    href: '/tasks'
  },
  {
    label: dictionary.navigation.finance,
    icon: 'tabler-currency-dollar',
    children: [
      {
        label: dictionary.navigation.incomes,
        href: '/finance/incomes'
      },
      {
        label: dictionary.navigation.expenses,
        href: '/finance/expenses'
      },
      {
        label: dictionary.navigation.salary,
        href: '/finance/salary'
      },
      {
        label: dictionary.navigation.loans,
        href: '/finance/loans'
      },
      {
        label: dictionary.navigation.inventory,
        href: '/finance/inventory'
      },
      {
        label: dictionary.navigation.financeReports,
        href: '/finance/reports'
      }
    ]
  },
  {
    label: dictionary.navigation.options,
    icon: 'tabler-list-details',
    children: [
      {
        label: dictionary.navigation.lookupOptions,
        href: '/options'
      }
    ]
  },
  {
    label: dictionary.navigation.setupSettings,
    icon: 'tabler-building',
    children: [
      {
        label: dictionary.profile.menuLabel,
        href: '/settings/profile'
      },
      {
        label: dictionary.navigation.companySetup,
        href: '/setup'
      },
      {
        label: dictionary.navigation.rolesPermissions,
        href: '/setup/roles'
      },
      {
        label: dictionary.navigation.systemAuditLogs,
        href: '/setup/audit-logs'
      }
    ]
  }
]

export default verticalMenuData
