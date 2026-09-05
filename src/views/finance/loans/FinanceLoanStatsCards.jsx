'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import { useCurrency } from '@/contexts/CurrencyContext'

const STAFF_CARDS = [
  {
    label: 'Staff Receivables Total',
    key: 'staffReceivables',
    hint: 'Outstanding balances owed by staff',
    icon: 'tabler-user-dollar',
    tone: 'bg-primaryLighter text-primary'
  },
  {
    label: 'Monthly Payroll Recovery',
    key: 'payrollRecovery',
    hint: 'Auto-deductions scheduled this month',
    icon: 'tabler-calendar-dollar',
    tone: 'bg-infoLighter text-info'
  },
  {
    label: 'Active Staff Borrowers',
    key: 'activeStaffBorrowers',
    hint: 'Employees with active staff loans',
    icon: 'tabler-users',
    tone: 'bg-successLighter text-success',
    count: true
  },
  {
    label: 'Recovered This Month',
    key: 'staffRecoveredThisMonth',
    hint: 'Payroll and manual repayments collected',
    icon: 'tabler-cash-banknote',
    tone: 'bg-successLighter text-success'
  }
]

const CORPORATE_CARDS = [
  {
    label: 'Corporate Debt Total',
    key: 'corporateDebt',
    hint: 'Outstanding principal owed to lenders',
    icon: 'tabler-building-bank',
    tone: 'bg-secondaryLighter text-warning'
  },
  {
    label: 'Monthly Debt Obligation',
    key: 'monthlyDebtObligation',
    hint: 'Principal and interest due this month',
    icon: 'tabler-calendar-dollar',
    tone: 'bg-errorLighter text-error'
  },
  {
    label: 'Active Corporate Loans',
    key: 'activeCorporateLoans',
    hint: 'Active external and bank loans',
    icon: 'tabler-file-dollar',
    tone: 'bg-infoLighter text-info',
    count: true
  },
  {
    label: 'Paid To Lenders This Month',
    key: 'corporatePaidThisMonth',
    hint: 'Repayments paid to external lenders',
    icon: 'tabler-transfer-out',
    tone: 'bg-primaryLighter text-primary'
  }
]

const FinanceLoanStatsCards = ({ summary, loanType, locale, loading }) => {
  const { formatCurrency } = useCurrency()
  const cards = loanType === 'CORPORATE' ? CORPORATE_CARDS : STAFF_CARDS

  return (
    <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible pb-3 md:pb-0'>
      {cards.map(card => (
        <Card key={card.label} className='min-w-[265px] snap-start xl:min-w-0 border border-divider/70 shadow-sm'>
          <CardContent className='flex items-center justify-between gap-4'>
            <div className='min-is-0'>
              <Typography variant='body2' color='text.secondary' className='truncate'>
                {card.label}
              </Typography>
              {loading ? (
                <Skeleton variant='rounded' width={120} height={29} className='mt-1' />
              ) : (
                <Typography variant='h5' className='mt-1 truncate'>
                  {card.count
                    ? Number(summary[card.key] || 0).toLocaleString(locale)
                    : formatCurrency(summary[card.key], locale, 'AFN')}
                </Typography>
              )}
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
