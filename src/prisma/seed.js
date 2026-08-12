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
  { key: 'projects:read', module: 'Projects', description: 'View projects' },
  { key: 'projects:write', module: 'Projects', description: 'Create and update projects' },
  { key: 'projects:delete', module: 'Projects', description: 'Delete projects' },
  { key: 'contracts:read', module: 'Contracts', description: 'View contracts and invoices' },
  { key: 'contracts:write', module: 'Contracts', description: 'Create and update contracts and invoices' },
  { key: 'contracts:delete', module: 'Contracts', description: 'Delete contracts and invoices' },
  { key: 'crm:read', module: 'CRM', description: 'View CRM records' },
  { key: 'crm:write', module: 'CRM', description: 'Create and update CRM records' },
  { key: 'crm:delete', module: 'CRM', description: 'Delete CRM records' },
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
      'hrm_leave:delete'
    ]
  },
  {
    name: 'finance_manager',
    display_name: 'Finance Manager',
    description: 'Manage income, expenses, salary, loans, and inventory records',
    is_system: false,
    permissions: ['finance:read', 'finance:write', 'finance:delete', 'hrm_contract:read']
  },
  {
    name: 'project_manager',
    display_name: 'Project Manager',
    description: 'Manage projects and their tasks',
    is_system: false,
    permissions: ['projects:read', 'projects:write', 'projects:delete', 'tasks:read', 'tasks:write', 'tasks:delete']
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
