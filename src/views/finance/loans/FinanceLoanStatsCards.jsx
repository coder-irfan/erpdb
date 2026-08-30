'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { formatCurrency } from '@/utils/formatCurrency'

const FinanceLoanStatsCards = ({ summary, locale, dictionary }) => {
  const cards = [
    {
      label: 'Staff Receivables Total',
      value: summary.staffReceivables,
      hint: 'Outstanding balances owed by staff',
      icon: 'tabler-user-dollar',
      tone: 'bg-primaryLighter text-primary'
    },
    {
      label: 'Corporate Debt Total',
      value: summary.corporateDebt,
      hint: 'Outstanding principal owed to lenders',
      icon: 'tabler-building-bank',
      tone: 'bg-warningLighter text-warning'
    },
    {
      label: 'Monthly Payroll Recovery',
      value: summary.payrollRecovery,
      hint: 'Auto-deductions scheduled this month',
      icon: 'tabler-calendar-dollar',
      tone: 'bg-infoLighter text-info'
    },
    {
      label: 'Monthly Debt Disbursement',
      value: summary.debtDisbursement,
      hint: 'Principal and interest due this month',
      icon: 'tabler-calendar-dollar',
      tone: 'bg-errorLighter text-error'
    }
  ]

  return (
    <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible pb-3 md:pb-0'>
      {cards.map(card => (
        <Card key={card.label} className='min-w-[265px] snap-start xl:min-w-0 border border-divider/70 shadow-sm'>
          <CardContent className='flex items-center justify-between gap-4'>
            <div className='min-is-0'>
              <Typography variant='body2' color='text.secondary' className='truncate'>
                {card.label}
              </Typography>
              <Typography variant='h5' className='mt-1 truncate'>
                {formatCurrency(card.value, locale, 'AFN')}
              </Typography>
              <Typography variant='caption' color='text.secondary' className='block truncate'>
                {card.hint}
              </Typography>
            </div>
            <span className={`flex size-11 shrink-0 items-center justify-center rounded ${card.tone}`}>
              <i className={`${card.icon} text-2xl`} />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default FinanceLoanStatsCards
