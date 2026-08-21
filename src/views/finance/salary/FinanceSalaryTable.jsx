'use client'

import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

import tableStyles from '@core/styles/table.module.css'

const initials = name =>
  name
    ?.split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

const FinanceSalaryTable = ({
  data,
  loading,
  busyId,
  page,
  rowsPerPage,
  locale,
  dictionary,
  canWrite,
  canDelete,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onEdit,
  onPay,
  onDelete
}) => (
  <>
    <div className='no-scrollbar overflow-x-auto scroll-smooth'>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>{dictionary.table.staff}</th>
            <th>{dictionary.table.monthDays}</th>
            <th>{dictionary.table.baseSalary}</th>
            <th>{dictionary.table.earnedBonus}</th>
            <th>{dictionary.table.loanDeduction}</th>
            <th>{dictionary.table.payable}</th>
            <th>{dictionary.table.status}</th>
            <th className='text-end'>{dictionary.table.actions}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeletonRows columns={8} />
          ) : data.salaries.length === 0 ? (
            <TableEmptyStateRow
              colSpan={8}
              icon='tabler-file-dollar'
              title={dictionary.empty.title}
              description={dictionary.empty.description}
            />
          ) : (
            data.salaries.map(salary => (
              <tr key={salary.id} onClick={() => onView(salary)}>
                <td>
                  <div className='flex min-is-[210px] items-center gap-3'>
                    <Avatar variant='rounded' className='bg-primaryLighter text-primary'></Avatar>
                    <div className='min-is-0'>
                      <Typography className='max-is-[190px] truncate font-medium'>{salary.staff.full_name}</Typography>
                      <Typography variant='caption' color='text.secondary' className='block max-is-[190px] truncate'>
                        {salary.staff.position}
                      </Typography>
                    </div>
                  </div>
                </td>
                <td>
                  <div className='min-is-[135px]'>
                    <Chip size='small' variant='outlined' label={salary.timesheet_month} />
                    <Typography variant='caption' color='text.secondary' className='mt-1 block'>
                      {dictionary.common.days
                        .replace('{worked}', salary.worked_days)
                        .replace('{total}', salary.total_month_days)}
                    </Typography>
                  </div>
                </td>
                <td>
                  <Tooltip
                    title={`${dictionary.fields.dailyRate}: ${formatCurrency(salary.base_daily_rate, locale, salary.currency)}`}
                  >
                    <Typography className='min-is-[140px] whitespace-nowrap font-medium'>
                      {formatCurrency(salary.base_salary, locale, salary.currency)}
                    </Typography>
                  </Tooltip>
                </td>
                <td>
                  <div className='min-is-[160px]'>
                    <Typography variant='body2' className='whitespace-nowrap font-medium'>
                      {formatCurrency(salary.earned_salary, locale, salary.currency)}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' className='whitespace-nowrap'>
                      {dictionary.common.bonus.replace(
                        '{amount}',
                        formatCurrency(salary.bonus_amount, locale, salary.currency)
                      )}
                    </Typography>
                  </div>
                </td>
                <td>
                  {toFiniteNumber(salary.loan_deduction) > 0 ? (
                    <Typography className='min-is-[130px] whitespace-nowrap font-semibold text-error'>
                      − {formatCurrency(salary.loan_deduction, locale, salary.currency)}
                    </Typography>
                  ) : (
                    <Typography variant='body2' color='text.secondary'>
                      {dictionary.common.noLoan}
                    </Typography>
                  )}
                </td>
                <td>
                  <Tooltip
                    title={`${dictionary.fields.baseAmount}: ${formatCurrency(salary.amount_base, locale, data.baseCurrency)}`}
                  >
                    <div className='min-is-[155px]'>
                      <Typography className='whitespace-nowrap font-semibold text-primary'>
                        {formatCurrency(salary.payable_amount, locale, salary.currency)}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {salary.currency}
                      </Typography>
                    </div>
                  </Tooltip>
                </td>
                <td>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={salary.status === 'PAID' ? 'success' : 'warning'}
                    label={dictionary.status[salary.status] || salary.status}
                  />
                </td>
                <td className='text-end' onClick={event => event.stopPropagation()}>
                  <EntityActionsMenu
                    moreActionsLabel={dictionary.table.actions}
                    actions={[
                      { label: dictionary.actions.view, icon: 'tabler-receipt', onClick: () => onView(salary) },
                      canWrite &&
                        salary.status === 'DRAFT' && {
                          label: dictionary.actions.edit,
                          icon: 'tabler-edit',
                          onClick: () => onEdit(salary)
                        },
                      canWrite &&
                        salary.status === 'DRAFT' && {
                          label: dictionary.actions.markPaid,
                          icon: 'tabler-circle-check',
                          disabled: busyId === salary.id,
                          onClick: () => onPay(salary)
                        },
                      canDelete &&
                        salary.status === 'DRAFT' && {
                          label: dictionary.actions.delete,
                          icon: 'tabler-trash',
                          color: 'error',
                          onClick: () => onDelete(salary)
                        }
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    <DashboardTablePagination
      count={data.totalCount}
      page={page}
      rowsPerPage={rowsPerPage}
      rowsPerPageLabel={dictionary.common.rowsPerPage}
      ofLabel={dictionary.common.of}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
    />
  </>
)

export default FinanceSalaryTable
