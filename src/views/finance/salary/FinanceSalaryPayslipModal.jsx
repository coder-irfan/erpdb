'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { getFinanceSalaryDetail } from '@/actions/financeSalary'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const initials = name =>
  name
    ?.split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

const MoneyRow = ({ label, value, className = '' }) => (
  <div className='flex items-center justify-between gap-4 border-be border-divider py-3'>
    <Typography color='text.secondary'>{label}</Typography>
    <Typography className={`whitespace-nowrap font-medium ${className}`}>{value}</Typography>
  </div>
)

const FinanceSalaryPayslipModal = ({ open, salaryId, locale, dictionary, refreshKey, onClose }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !salaryId) return
    let active = true

    setLoading(true)
    setError('')
    getFinanceSalaryDetail(salaryId, { locale }).then(result => {
      if (!active) return
      if (result.success) setData(result.data)
      else setError(result.error || dictionary.messages.detailLoadFailed)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [dictionary.messages.detailLoadFailed, locale, open, refreshKey, salaryId])

  const salary = data?.salary
  const company = data?.company

  const unpaidAmount = salary
    ? Math.max(0, toFiniteNumber(salary.base_salary) - toFiniteNumber(salary.earned_salary))
    : 0

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth='md'>
      <DialogTitle className='finance-payslip-toolbar flex items-center justify-between gap-4'>
        <div>
          <Typography variant='h5'>{dictionary.payslip.title}</Typography>
          <Typography color='text.secondary'>{salary?.staff?.full_name || dictionary.common.notAvailable}</Typography>
        </div>
        <div className='flex items-center gap-2'>
          {salary && (
            <Button variant='contained' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>
              {dictionary.actions.print}
            </Button>
          )}
          <IconButton onClick={onClose} disabled={loading} aria-label={dictionary.actions.close}>
            <i className='tabler-x' />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers className='min-bs-[560px]'>
        {loading ? (
          <div className='flex min-bs-[480px] items-center justify-center'>
            <CircularProgress />
          </div>
        ) : error ? (
          <Alert severity='error'>{error}</Alert>
        ) : salary ? (
          <div className='finance-payslip-print mx-auto flex max-is-[820px] flex-col gap-6 bg-background p-2 sm:p-6'>
            <div className='flex flex-wrap items-start justify-between gap-4 border-be-2 border-primary pb-5'>
              <div className='flex flex-col items-start gap-3'>
                {company?.company_logo && (
                  <img
                    src={company.company_logo}
                    alt={company.company_name || company.app_name}
                    className='max-bs-20 max-is-48 object-contain'
                  />
                )}
                <div>
                  <Typography variant='h4'>{company?.company_name || company?.app_name}</Typography>
                  <Typography color='text.secondary'>{company?.company_email}</Typography>
                  <Typography color='text.secondary'>{company?.company_phone}</Typography>
                </div>
              </div>
              <div className='text-end'>
                <Typography variant='h4' className='uppercase text-primary'>
                  {dictionary.payslip.title}
                </Typography>
                <Chip
                  variant='tonal'
                  color={salary.status === 'PAID' ? 'success' : 'warning'}
                  label={dictionary.status[salary.status]}
                />
                <Typography className='mt-2 font-semibold'>{salary.timesheet_month}</Typography>
              </div>
            </div>
            <div className='grid grid-cols-1 gap-4 rounded border border-divider p-4 sm:grid-cols-2'>
              <div className='flex items-center gap-3'>
                <Avatar className='size-12'>{initials(salary.staff.full_name)}</Avatar>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.payslip.employee}
                  </Typography>
                  <Typography className='font-semibold'>{salary.staff.full_name}</Typography>
                  <Typography variant='body2'>{salary.staff.email}</Typography>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.payslip.designation}
                  </Typography>
                  <Typography className='font-medium'>{salary.staff.position}</Typography>
                </div>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.payslip.payrollMonth}
                  </Typography>
                  <Typography className='font-medium'>{salary.timesheet_month}</Typography>
                </div>
              </div>
            </div>
            <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
              <div>
                <Typography variant='h6' className='border-be border-divider pb-2 text-success'>
                  {dictionary.payslip.earnings}
                </Typography>
                <MoneyRow
                  label={dictionary.payslip.baseSalary}
                  value={formatCurrency(salary.base_salary, locale, salary.currency)}
                />
                <MoneyRow
                  label={`${dictionary.payslip.earnedPay} (${salary.worked_days}/${salary.total_month_days})`}
                  value={formatCurrency(salary.earned_salary, locale, salary.currency)}
                />
                <MoneyRow
                  label={dictionary.payslip.bonus}
                  value={formatCurrency(salary.bonus_amount, locale, salary.currency)}
                  className='text-success'
                />
              </div>
              <div>
                <Typography variant='h6' className='border-be border-divider pb-2 text-error'>
                  {dictionary.payslip.deductions}
                </Typography>
                <MoneyRow
                  label={dictionary.payslip.loan}
                  value={formatCurrency(salary.loan_deduction, locale, salary.currency)}
                  className='text-error'
                />
                <MoneyRow
                  label={`${dictionary.payslip.offDays} (${salary.off_days})`}
                  value={formatCurrency(unpaidAmount, locale, salary.currency)}
                  className='text-error'
                />
              </div>
            </div>
            <div className='rounded bg-primaryLighter p-5 text-end'>
              <Typography color='text.secondary'>{dictionary.payslip.netPayable}</Typography>
              <Typography variant='h3' className='text-primary'>
                {formatCurrency(salary.payable_amount, locale, salary.currency)}
              </Typography>
            </div>
            {salary.timesheet_summary && (
              <div>
                <Typography variant='caption' color='text.secondary'>
                  {dictionary.fields.notes}
                </Typography>
                <Typography className='whitespace-pre-wrap'>{salary.timesheet_summary}</Typography>
              </div>
            )}
            <div className='grid grid-cols-1 gap-6 border-bs border-divider pt-6 sm:grid-cols-2'>
              <div>
                <Typography variant='caption' color='text.secondary'>
                  {dictionary.fields.paymentDate}
                </Typography>
                <Typography className='font-medium'>
                  {salary.payment_date ? toDateInputValue(salary.payment_date) : dictionary.payslip.notProcessed}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {dictionary.fields.processor}:{' '}
                  {salary.processed_by?.full_name ||
                    salary.processor_identity?.full_name ||
                    dictionary.payslip.notProcessed}
                </Typography>
              </div>
              <div className='text-end'>
                <div className='mb-2 ms-auto w-48 border-be border-divider' />
                <Typography variant='caption' color='text.secondary'>
                  {company?.signatory_name || dictionary.payslip.signature}
                </Typography>
                <Typography variant='caption' color='text.secondary' className='block'>
                  {company?.signatory_title}
                </Typography>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .finance-payslip-print,
          .finance-payslip-print * {
            visibility: visible !important;
          }
          .finance-payslip-print {
            position: fixed;
            inset: 0;
            width: 100%;
            max-width: none !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
          }
          .finance-payslip-toolbar {
            display: none !important;
          }
        }
      `}</style>
    </Dialog>
  )
}

export default FinanceSalaryPayslipModal
