import 'server-only'

import { Prisma } from '@prisma/client'

import { prisma } from '@/libs/prisma'

export const PAYROLL_READ_PERMISSIONS = ['hrm:read', 'hrm_payroll:read', 'finance:read']
export const PAYROLL_WRITE_PERMISSIONS = ['hrm:write', 'hrm_payroll:write', 'finance:write']
export const PAYROLL_DELETE_PERMISSIONS = ['hrm:delete', 'hrm_payroll:delete']

export const payrollSelect = {
  id: true,
  staff_id: true,
  month: true,
  year: true,
  base_salary: true,
  total_allowance: true,
  unpaid_leave_deduction: true,
  tax_deduction: true,
  net_salary: true,
  status_id: true,
  payment_method_id: true,
  payment_date: true,
  processed_by_id: true,
  notes: true,
  created_at: true,
  updated_at: true,
  staff: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      position: true,
      tazkira_no: true,
      contracts: {
        select: { contract_number: true, start_date: true },
        orderBy: { start_date: 'desc' },
        take: 1
      }
    }
  },
  processed_by: { select: { id: true, first_name: true, last_name: true } },
  status: { select: { id: true, label: true, value: true, is_active: true } },
  payment_method: { select: { id: true, label: true, value: true, is_active: true } }
}

export const normalizePayroll = payroll => ({
  ...payroll,
  base_salary: payroll.base_salary.toFixed(2),
  total_allowance: payroll.total_allowance.toFixed(2),
  unpaid_leave_deduction: payroll.unpaid_leave_deduction.toFixed(2),
  tax_deduction: payroll.tax_deduction.toFixed(2),
  net_salary: payroll.net_salary.toFixed(2),
  payment_date: payroll.payment_date?.toISOString() || null,
  created_at: payroll.created_at.toISOString(),
  updated_at: payroll.updated_at.toISOString(),
  staff: { ...payroll.staff, full_name: `${payroll.staff.first_name} ${payroll.staff.last_name}`.trim() },
  processed_by: payroll.processed_by
    ? { ...payroll.processed_by, full_name: `${payroll.processed_by.first_name} ${payroll.processed_by.last_name}`.trim() }
    : null,
  contract_number: payroll.staff.contracts[0]?.contract_number || null
})

export const getMonthRange = (month, year) => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 1)),
  inclusiveEnd: new Date(Date.UTC(year, month, 0))
})

export const calculatePayrollForStaff = async (transaction, staff, month, year) => {
  const { start, end, inclusiveEnd } = getMonthRange(month, year)
  const contract = staff.contracts[0]

  if (!contract) return null

  const [approvedUnpaidLeaves, absentDays] = await Promise.all([
    transaction.hrmStaffLeave.findMany({
      where: {
        staff_id: staff.id,
        start_date: { lte: inclusiveEnd },
        end_date: { gte: start },
        status: { is: { category: 'LEAVE_STATUS', value: 'APPROVED' } },
        leave_type: { is: { category: 'LEAVE_TYPE', value: 'UNPAID' } }
      },
      select: { start_date: true, end_date: true }
    }),
    transaction.hrmStaffTimesheet.count({ where: { staff_id: staff.id, date: { gte: start, lt: end }, status: 'ABSENT' } })
  ])

  const leaveDays = approvedUnpaidLeaves.reduce((total, leave) => {
    const clippedStart = leave.start_date < start ? start : leave.start_date
    const clippedEnd = leave.end_date > inclusiveEnd ? inclusiveEnd : leave.end_date

    return total + Math.floor((clippedEnd.getTime() - clippedStart.getTime()) / 86_400_000) + 1
  }, 0)

  const unpaidDays = leaveDays + absentDays
  const baseSalary = new Prisma.Decimal(contract.base_salary)
  const deduction = baseSalary.div(30).mul(unpaidDays).toDecimalPlaces(2)

  return {
    baseSalary,
    deduction,
    netSalary: baseSalary.sub(deduction).toDecimalPlaces(2),
    unpaidDays,
    contractNumber: contract.contract_number
  }
}

export const getCurrentStaffId = async userId => {
  const staff = await prisma.hrmStaff.findUnique({ where: { user_id: userId }, select: { id: true } })

  return staff?.id || null
}
