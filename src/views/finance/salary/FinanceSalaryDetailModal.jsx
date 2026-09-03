'use client'

import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import DetailSkeleton from '@/components/dialogs/DetailSkeleton'
import UserAvatar from '@/components/common/UserAvatar'
import useFinanceSalaryDetail from '@/hooks/useFinanceSalaryDetail'
import { parseSalaryTimesheetSummary } from '@/libs/salaryTimesheetSummary'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const InfoItem = ({ label, value }) => (
  <div className='min-is-0'>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <div className='break-words font-medium'>{value || '—'}</div>
  </div>
)

const AmountRow = ({ label, amount, salary, locale, tone = '' }) => (
  <div className='flex items-center justify-between gap-4 border-be border-divider py-3 last:border-0'>
    <Typography color='text.secondary'>{label}</Typography>
    <DualCurrencyAmount
      amount={amount}
      currency={salary.currency}
      exchangeRate={salary.exchange_rate}
      locale={locale}
      primaryClassName={tone}
      className='items-end text-end'
    />
  </div>
)

const SummaryMetric = ({ label, value }) => (
  <div className='rounded-lg bg-actionHover p-3'>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography className='mt-1 font-semibold'>{value}</Typography>
  </div>
)

const FinanceSalaryDetailModal = ({ open, salaryId, locale, dictionary, refreshKey, onClose }) => {
  const { data, loading, error } = useFinanceSalaryDetail({
    open,
    salaryId,
    locale,
    refreshKey,
    fallbackError: dictionary.messages.detailLoadFailed
  })

  const salary = data?.salary
  const print = dictionary.payslip.print
  const processor = salary?.processed_by || salary?.processor_identity
  const timesheetSummary = salary ? parseSalaryTimesheetSummary(salary.timesheet_summary, salary) : null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle className='flex items-start justify-between gap-4'>
        <div className='flex min-is-0 items-center gap-3'>
          {salary && <UserAvatar user={salary.staff} size={48} />}
          <div className='min-is-0'>
            <Typography variant='h5'>{dictionary.actions.view}</Typography>
            <Typography color='text.secondary' className='truncate'>
              {salary?.staff?.full_name || dictionary.common.notAvailable}
            </Typography>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {salary && (
            <Chip
              size='small'
              variant='tonal'
              color={salary.status === 'PAID' ? 'success' : salary.status === 'FINALIZED' ? 'info' : 'warning'}
              label={dictionary.status[salary.status] || salary.status}
            />
          )}
          <IconButton onClick={onClose} aria-label={dictionary.actions.close}>
            <i className='tabler-x' />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers className='min-bs-[520px]'>
        {loading ? (
          <DetailSkeleton rows={7} />
        ) : error ? (
          <Alert severity='error'>{error}</Alert>
        ) : salary ? (
          <div className='flex flex-col gap-5'>
            <Card
              variant='outlined'
              className='border border-primary/30 bg-primaryLighter/50 shadow-xs dark:bg-primaryLighter'
            >
              <CardContent>
                <Typography variant='h6' className='mb-4'>
                  {print.employeeInformation}
                </Typography>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3'>
                  <InfoItem label={print.staffMember} value={salary.staff.full_name} />
                  <InfoItem label={print.position} value={salary.staff.position} />
                  <InfoItem label={print.employeeId} value={salary.staff.id} />
                  <InfoItem label={dictionary.payslip.payrollMonth} value={salary.timesheet_month} />
                  <InfoItem label={dictionary.fields.paymentDate} value={toDateInputValue(salary.payment_date)} />
                  <InfoItem label={dictionary.fields.processor} value={processor?.full_name} />
                </div>
              </CardContent>
            </Card>

            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6' className='mb-4'>
                  {print.attendanceRate}
                </Typography>
                <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
                  <InfoItem label={print.totalDays} value={String(salary.total_month_days)} />
                  <InfoItem label={print.daysWorked} value={String(salary.worked_days)} />
                  <InfoItem label={print.offDays} value={String(salary.off_days)} />
                  <InfoItem
                    label={print.dailyRate}
                    value={formatCurrency(salary.base_daily_rate, locale, salary.currency)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <Card variant='outlined'>
                <CardContent>
                  <Typography variant='h6'>{dictionary.payslip.earnings}</Typography>
                  <AmountRow
                    label={dictionary.payslip.baseSalary}
                    amount={salary.base_salary}
                    salary={salary}
                    locale={locale}
                  />
                  <AmountRow
                    label={dictionary.payslip.earnedPay}
                    amount={salary.earned_salary}
                    salary={salary}
                    locale={locale}
                  />
                  <AmountRow
                    label={dictionary.payslip.bonus}
                    amount={salary.bonus_amount}
                    salary={salary}
                    locale={locale}
                    tone='text-success'
                  />
                </CardContent>
              </Card>
              <Card variant='outlined'>
                <CardContent>
                  <Typography variant='h6'>{dictionary.payslip.deductions}</Typography>
                  <AmountRow
                    label={dictionary.payslip.loan}
                    amount={salary.loan_deduction}
                    salary={salary}
                    locale={locale}
                    tone='text-error'
                  />
                  <AmountRow
                    label={dictionary.payslip.offDays}
                    amount={salary.unpaid_leave_deduction}
                    salary={salary}
                    locale={locale}
                    tone='text-error'
                  />
                </CardContent>
              </Card>
            </div>

            <Card className='border border-primary/30 bg-primaryLighter/50 shadow-xs dark:bg-primaryLighter'>
              <CardContent className='flex flex-wrap items-center justify-between gap-4'>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.payslip.netPayable}{' '}
                  </Typography>
                  <DualCurrencyAmount
                    amount={salary.payable_amount}
                    amountBase={salary.amount_base}
                    currency={salary.currency}
                    exchangeRate={salary.exchange_rate}
                    locale={locale}
                    primaryClassName='text-xl font-semibold text-primary'
                  />
                </div>
                <InfoItem label={dictionary.fields.exchangeRate} value={salary.exchange_rate} />
              </CardContent>
            </Card>

            {salary.timesheet_summary && (
              <Card variant='outlined'>
                <CardContent>
                  <Typography variant='h6' className='mb-4'>
                    Timesheet Summary
                  </Typography>
                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                    <SummaryMetric label='Working Days' value={`${timesheetSummary.workingDays ?? '---'} Days`} />
                    <SummaryMetric label='Payable Days' value={`${timesheetSummary.payableDays ?? '---'} Days`} />
                    <SummaryMetric
                      label='Absent / Leave'
                      value={`${timesheetSummary.absentDays ?? '---'} Absent · ${timesheetSummary.paidLeaveDays ?? 0} Paid Leave`}
                    />
                    <SummaryMetric label='Logged Hours' value={`${timesheetSummary.loggedHours ?? '---'} hrs`} />
                  </div>
                  {(timesheetSummary.contractNumber || timesheetSummary.unpaidDays !== null) && (
                    <div className='mt-4 flex flex-wrap gap-2'>
                      {timesheetSummary.contractNumber && (
                        <Chip size='small' variant='tonal' color='primary' label={`Contract Ref: ${timesheetSummary.contractNumber}`} />
                      )}
                      {timesheetSummary.unpaidDays !== null && (
                        <Chip size='small' variant='tonal' color='warning' label={`Unpaid Days: ${timesheetSummary.unpaidDays}`} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default FinanceSalaryDetailModal
