import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const permissions = [
  { key: 'hrm:read', module: 'HRM', description: 'View HRM records' },
  { key: 'hrm:write', module: 'HRM', description: 'Create and update HRM records' },
  { key: 'hrm:delete', module: 'HRM', description: 'Delete HRM records' },
  { key: 'hrm_contract:read', module: 'HRM', description: 'View staff contracts' },
  { key: 'hrm_contract:write', module: 'HRM', description: 'Create and update staff contracts' },
  { key: 'hrm_timesheet:read', module: 'HRM', description: 'View attendance and timesheets' },
  { key: 'hrm_timesheet:write', module: 'HRM', description: 'Create and update attendance and timesheets' },
  { key: 'hrm_timesheet:delete', module: 'HRM', description: 'Delete attendance and timesheets' },
  { key: 'hrm_leave:read', module: 'HRM', description: 'View leave requests' },
  { key: 'hrm_leave:write', module: 'HRM', description: 'Create and approve leave requests' },
  { key: 'hrm_leave:delete', module: 'HRM', description: 'Delete leave requests' },
  { key: 'hrm_payroll:read', module: 'HRM', description: 'View payroll and payslips' },
  { key: 'hrm_payroll:write', module: 'HRM', description: 'Generate and process payroll' },
  { key: 'hrm_payroll:delete', module: 'HRM', description: 'Delete draft payroll records' },
  { key: 'hrm_reports:read', module: 'HRM', description: 'View HRM analytical reports' },
  { key: 'projects:read', module: 'Projects', description: 'View projects' },
  { key: 'projects:write', module: 'Projects', description: 'Create and update projects' },
  { key: 'projects:delete', module: 'Projects', description: 'Delete projects' },
  { key: 'contracts:read', module: 'Contracts', description: 'View contracts and invoices' },
  { key: 'contracts:write', module: 'Contracts', description: 'Create and update contracts and invoices' },
  { key: 'contracts:delete', module: 'Contracts', description: 'Delete contracts and invoices' },
  { key: 'crm:read', module: 'CRM', description: 'View CRM records' },
  { key: 'crm:write', module: 'CRM', description: 'Create and update CRM records' },
  { key: 'crm:delete', module: 'CRM', description: 'Delete CRM records' },
  { key: 'crm_lead:read', module: 'CRM', description: 'View leads and pipeline activity' },
  { key: 'crm_lead:write', module: 'CRM', description: 'Create, update, convert, and log lead activities' },
  { key: 'crm_lead:delete', module: 'CRM', description: 'Delete unconverted leads' },
  { key: 'crm_client:read', module: 'CRM', description: 'View clients and their related records' },
  { key: 'crm_client:write', module: 'CRM', description: 'Create, update, and log client activities' },
  { key: 'crm_client:delete', module: 'CRM', description: 'Delete clients without active dependencies' },
  { key: 'crm_visitor:read', module: 'CRM', description: 'View front-desk visitor records' },
  { key: 'crm_visitor:write', module: 'CRM', description: 'Check in, update, check out, and convert visitors' },
  { key: 'crm_visitor:delete', module: 'CRM', description: 'Delete visitor records' },
  { key: 'tasks:read', module: 'Tasks', description: 'View tasks' },
  { key: 'tasks:write', module: 'Tasks', description: 'Create and update tasks' },
  { key: 'tasks:delete', module: 'Tasks', description: 'Delete tasks' },
  { key: 'finance:read', module: 'Finance', description: 'View finance records' },
  { key: 'finance:write', module: 'Finance', description: 'Create and update finance records' },
  { key: 'finance:delete', module: 'Finance', description: 'Delete finance records' },
  { key: 'options:read', module: 'Options', description: 'View lookup options' },
  { key: 'options:write', module: 'Options', description: 'Manage lookup options' },
  { key: 'setup:manage', module: 'Setup', description: 'Manage company setup' },
  { key: 'settings:manage', module: 'Settings', description: 'Manage roles and system settings' },
  { key: 'audit:read', module: 'Audit', description: 'View system audit logs' }
]

const roles = [
  {
    name: 'super_admin',
    display_name: 'Super Admin',
    description: 'Full access to every ERP module and system setting',
    is_system: true,
    permissions: permissions.map(permission => permission.key)
  },
  {
    name: 'hr_manager',
    display_name: 'HR Manager',
    description: 'Manage staff, contracts, leave, and timesheet records',
    is_system: false,
    permissions: [
      'hrm:read',
      'hrm:write',
      'hrm:delete',
      'hrm_contract:read',
      'hrm_contract:write',
      'hrm_timesheet:read',
      'hrm_timesheet:write',
      'hrm_timesheet:delete',
      'hrm_leave:read',
      'hrm_leave:write',
      'hrm_leave:delete',
      'hrm_payroll:read',
      'hrm_payroll:write',
      'hrm_payroll:delete',
      'hrm_reports:read'
    ]
  },
  {
    name: 'finance_manager',
    display_name: 'Finance Manager',
    description: 'Manage income, expenses, salary, loans, and inventory records',
    is_system: false,
    permissions: ['finance:read', 'finance:write', 'finance:delete', 'contracts:read', 'hrm_contract:read', 'hrm_payroll:read', 'hrm_payroll:write', 'hrm_reports:read']
  },
  {
    name: 'project_manager',
    display_name: 'Project Manager',
    description: 'Manage projects and their tasks',
    is_system: false,
    permissions: ['projects:read', 'projects:write', 'projects:delete', 'tasks:read', 'tasks:write', 'tasks:delete']
  },
  {
    name: 'sales_manager',
    display_name: 'Sales Manager',
    description: 'Manage CRM leads, clients, visitors, activities, and conversions',
    is_system: false,
      permissions: ['crm:read', 'crm:write', 'crm:delete', 'crm_lead:read', 'crm_lead:write', 'crm_lead:delete', 'crm_client:read', 'crm_client:write', 'crm_client:delete', 'crm_visitor:read', 'crm_visitor:write', 'crm_visitor:delete', 'contracts:read', 'contracts:write', 'options:read']
  }
]

const syncRolePermissions = async (transaction, roleId, permissionIds) => {
  await transaction.rolePermission.deleteMany({
    where: {
      role_id: roleId,
      permission_id: { notIn: permissionIds }
    }
  })

  await transaction.rolePermission.createMany({
    data: permissionIds.map(permissionId => ({
      role_id: roleId,
      permission_id: permissionId
    })),
    skipDuplicates: true
  })
}

const contractStatuses = [
  { label: 'Draft', value: 'DRAFT', color_code: 'secondary', sort_order: 1 },
  { label: 'Active', value: 'ACTIVE', color_code: 'success', sort_order: 2 },
  { label: 'Expired', value: 'EXPIRED', color_code: 'warning', sort_order: 3 },
  { label: 'Terminated', value: 'TERMINATED', color_code: 'error', sort_order: 4 }
]

const contractTypes = [
  { label: 'Website', value: 'WEBSITE', sort_order: 1 },
  { label: 'Digital Marketing', value: 'DIGITAL_MARKETING', sort_order: 2 },
  { label: 'Maintenance', value: 'MAINTENANCE', sort_order: 3 }
]

const contractDurations = [
  { label: '1 Year', value: '1_YEAR', sort_order: 1 },
  { label: '2 Years', value: '2_YEARS', sort_order: 2 },
  { label: '3 Years', value: '3_YEARS', sort_order: 3 },
  { label: '5 Years', value: '5_YEARS', sort_order: 4 }
]

const contractCountries = [
  { label: 'Afghanistan', value: 'AFGHANISTAN', sort_order: 1, is_default: true },
  { label: 'United States', value: 'UNITED_STATES', sort_order: 2 }
]

const contractLevels = [
  { label: 'Standard', value: 'STANDARD', sort_order: 1, is_default: true },
  { label: 'Premium', value: 'PREMIUM', sort_order: 2 },
  { label: 'Enterprise', value: 'ENTERPRISE', sort_order: 3 }
]

const invoiceStatuses = [
  { label: 'Unpaid', value: 'UNPAID', color_code: 'warning', sort_order: 1, is_default: true },
  { label: 'Partially Paid', value: 'PARTIALLY_PAID', color_code: 'info', sort_order: 2 },
  { label: 'Paid', value: 'PAID', color_code: 'success', sort_order: 3 },
  { label: 'Cancelled', value: 'CANCELLED', color_code: 'secondary', sort_order: 4 }
]

const paymentMethods = [
  { label: 'Cash', value: 'CASH', sort_order: 1, is_default: true },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER', sort_order: 2 },
  { label: 'Card', value: 'CARD', sort_order: 3 },
  { label: 'Cheque', value: 'CHEQUE', sort_order: 4 }
]

const incomeTypes = [
  { label: 'Contract Payment', value: 'CONTRACT_PAYMENT', sort_order: 1, is_default: true }
]

const leaveTypes = [
  { label: 'Annual Leave', value: 'ANNUAL', sort_order: 1 },
  { label: 'Sick Leave', value: 'SICK', sort_order: 2 },
  { label: 'Casual Leave', value: 'CASUAL', sort_order: 3 },
  { label: 'Unpaid Leave', value: 'UNPAID', sort_order: 4 }
]

const leaveStatuses = [
  { label: 'Pending', value: 'PENDING', sort_order: 1 },
  { label: 'Approved', value: 'APPROVED', sort_order: 2 },
  { label: 'Rejected', value: 'REJECTED', sort_order: 3 }
]

const payrollStatuses = [
  { label: 'Draft', value: 'DRAFT', color_code: 'secondary', sort_order: 1 },
  { label: 'Pending', value: 'PENDING', color_code: 'warning', sort_order: 2 },
  { label: 'Paid', value: 'PAID', color_code: 'success', sort_order: 3 }
]

const payrollPaymentMethods = [
  { label: 'Cash', value: 'CASH', sort_order: 1 },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER', sort_order: 2 },
  { label: 'Check', value: 'CHECK', sort_order: 3 }
]

const leadStatuses = [
  { label: 'New', value: 'NEW', color_code: 'primary', sort_order: 1 },
  { label: 'Contacted', value: 'CONTACTED', color_code: 'info', sort_order: 2 },
  { label: 'Proposal Sent', value: 'PROPOSAL_SENT', color_code: 'warning', sort_order: 3 },
  { label: 'Won', value: 'WON', color_code: 'success', sort_order: 4 },
  { label: 'Lost', value: 'LOST', color_code: 'error', sort_order: 5 }
]

const leadSources = [
  { label: 'Website', value: 'WEBSITE', color_code: 'primary', sort_order: 1 },
  { label: 'Referral', value: 'REFERRAL', color_code: 'success', sort_order: 2 },
  { label: 'Walk-in', value: 'WALK_IN', color_code: 'info', sort_order: 3 },
  { label: 'Email Campaign', value: 'EMAIL_CAMPAIGN', color_code: 'warning', sort_order: 4 },
  { label: 'Other', value: 'OTHER', color_code: 'secondary', sort_order: 5 }
]

const main = async () => {
  const passwordHash = await bcrypt.hash('Admin123!', 10)

  await prisma.$transaction(async transaction => {
    const permissionIdsByKey = new Map()

    for (const permission of permissions) {
      const savedPermission = await transaction.permission.upsert({
        where: { key: permission.key },
        update: {
          module: permission.module,
          description: permission.description
        },
        create: permission
      })

      permissionIdsByKey.set(savedPermission.key, savedPermission.id)
    }

    for (const status of contractStatuses) {
      await transaction.option.upsert({
        where: { category_value: { category: 'CONTRACT_STATUS', value: status.value } },
        update: { ...status, is_active: true },
        create: { category: 'CONTRACT_STATUS', ...status, is_active: true }
      })
    }

    for (const contractType of contractTypes) {
      await transaction.option.upsert({
        where: { category_value: { category: 'CONTRACT_TYPE', value: contractType.value } },
        update: { ...contractType, is_active: true },
        create: { category: 'CONTRACT_TYPE', ...contractType, is_active: true }
      })
    }

    for (const duration of contractDurations) {
      await transaction.option.upsert({
        where: { category_value: { category: 'CONTRACT_DURATION', value: duration.value } },
        update: { ...duration, is_active: true },
        create: { category: 'CONTRACT_DURATION', ...duration, is_active: true }
      })
    }

    for (const country of contractCountries) {
      await transaction.option.upsert({
        where: { category_value: { category: 'CONTRACT_COUNTRY', value: country.value } },
        update: { ...country, is_active: true },
        create: { category: 'CONTRACT_COUNTRY', ...country, is_active: true }
      })
    }

    for (const level of contractLevels) {
      await transaction.option.upsert({
        where: { category_value: { category: 'CONTRACT_LEVEL', value: level.value } },
        update: { ...level, is_active: true },
        create: { category: 'CONTRACT_LEVEL', ...level, is_active: true }
      })
    }

    for (const status of invoiceStatuses) {
      await transaction.option.upsert({
        where: { category_value: { category: 'INVOICE_STATUS', value: status.value } },
        update: { ...status, is_active: true },
        create: { category: 'INVOICE_STATUS', ...status, is_active: true }
      })
    }

    for (const method of paymentMethods) {
      await transaction.option.upsert({
        where: { category_value: { category: 'PAYMENT_METHOD', value: method.value } },
        update: { ...method, is_active: true },
        create: { category: 'PAYMENT_METHOD', ...method, is_active: true }
      })
    }

    for (const incomeType of incomeTypes) {
      await transaction.option.upsert({
        where: { category_value: { category: 'INCOME_TYPE', value: incomeType.value } },
        update: { ...incomeType, is_active: true },
        create: { category: 'INCOME_TYPE', ...incomeType, is_active: true }
      })
    }

    for (const leaveType of leaveTypes) {
      await transaction.option.upsert({
        where: { category_value: { category: 'LEAVE_TYPE', value: leaveType.value } },
        update: { ...leaveType, is_active: true },
        create: { category: 'LEAVE_TYPE', ...leaveType, is_active: true }
      })
    }

    for (const leaveStatus of leaveStatuses) {
      await transaction.option.upsert({
        where: { category_value: { category: 'LEAVE_STATUS', value: leaveStatus.value } },
        update: { ...leaveStatus, is_active: true },
        create: { category: 'LEAVE_STATUS', ...leaveStatus, is_active: true }
      })
    }

    for (const payrollStatus of payrollStatuses) {
      await transaction.option.upsert({
        where: { category_value: { category: 'PAYROLL_STATUS', value: payrollStatus.value } },
        update: { ...payrollStatus, is_active: true },
        create: { category: 'PAYROLL_STATUS', ...payrollStatus, is_active: true }
      })
    }

    for (const paymentMethod of payrollPaymentMethods) {
      await transaction.option.upsert({
        where: { category_value: { category: 'PAYROLL_PAYMENT_METHOD', value: paymentMethod.value } },
        update: { ...paymentMethod, is_active: true },
        create: { category: 'PAYROLL_PAYMENT_METHOD', ...paymentMethod, is_active: true }
      })
    }

    for (const leadStatus of leadStatuses) {
      await transaction.option.upsert({
        where: { category_value: { category: 'LEAD_STATUS', value: leadStatus.value } },
        update: { ...leadStatus, is_active: true },
        create: { category: 'LEAD_STATUS', ...leadStatus, is_active: true }
      })
    }

    for (const leadSource of leadSources) {
      await transaction.option.upsert({
        where: { category_value: { category: 'LEAD_SOURCE', value: leadSource.value } },
        update: { ...leadSource, is_active: true },
        create: { category: 'LEAD_SOURCE', ...leadSource, is_active: true }
      })
    }

    let superAdminRole

    for (const roleDefinition of roles) {
      const { permissions: rolePermissionKeys, ...roleData } = roleDefinition

      const role = await transaction.role.upsert({
        where: { name: roleData.name },
        update: {
          display_name: roleData.display_name,
          description: roleData.description,
          is_system: roleData.is_system
        },
        create: roleData
      })

      const permissionIds = rolePermissionKeys.map(permissionKey => permissionIdsByKey.get(permissionKey))

      await syncRolePermissions(transaction, role.id, permissionIds)

      if (role.name === 'super_admin') {
        superAdminRole = role
      }
    }

    if (!superAdminRole) {
      throw new Error('Super Admin role was not created.')
    }

    await transaction.user.upsert({
      where: { email: 'irfan.noorzada123@gmail.com' },
      update: {
        name: 'Admin',
        password_hash: passwordHash,
        account_status: 'ACTIVE',
        roles: {
          connect: { id: superAdminRole.id }
        }
      },
      create: {
        name: 'Admin',
        email: 'irfan.noorzada123@gmail.com',
        password_hash: passwordHash,
        account_status: 'ACTIVE',
        roles: {
          connect: { id: superAdminRole.id }
        }
      }
    })
  })

  process.stdout.write('Permissions, roles, and Super Admin seeded successfully.\n')
}

main()
  .catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
