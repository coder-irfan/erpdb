'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { toFiniteNumber } from '@/utils/formatCurrency'
import { useCurrency } from '@/contexts/CurrencyContext'

const STYLES = {
  primary: 'bg-primaryLighter text-primary',
  success: 'bg-successLighter text-success',
  error: 'bg-errorLighter text-error',
  warning: 'bg-secondaryLighter text-secondary'
}

const InvoiceStatsCards = ({ summary, locale, currency, dictionary }) => {
  const { formatCurrency } = useCurrency()

  const cards = [
    {
      label: dictionary.kpis.totalInvoiced,
      value: summary.totalInvoiced,
      icon: 'tabler-receipt-2',
      tone: 'primary',
      detail: dictionary.kpis.allInvoices
    },
    {
      label: dictionary.kpis.paidRevenue,
      value: summary.paidRevenue,
      icon: 'tabler-cash-banknote',
      tone: 'success',
      detail: dictionary.kpis.paidInvoices
    },
    {
      label: dictionary.kpis.overdueInvoices,
      value: summary.overdueAmount,
      icon: 'tabler-alert-circle',
      tone: 'error',
      detail: dictionary.kpis.overdueCount.replace('{count}', summary.overdueCount)
    },
    {
      label: dictionary.kpis.outstanding,
      value: summary.outstandingBalance,
      icon: 'tabler-hourglass',
      tone: 'warning',
      detail: dictionary.kpis.pendingInvoices
    }
  ]

  return (
    <div className='no-scrollbar flex w-full snap-x items-stretch gap-4 overflow-x-auto'>
      {cards.map(card => (
        <Card key={card.label} className='min-is-[220px] flex-1 snap-start sm:min-is-[250px]'>
          <CardContent className='flex items-center justify-between gap-4'>
            <div className='min-is-0'>
              <Typography variant='body2' color='text.secondary' className='truncate'>
                {card.label}
              </Typography>
              <Typography variant='h5' className='mt-1 truncate'>
                {formatCurrency(toFiniteNumber(card.value), locale, currency)}
              </Typography>
              <Typography variant='caption' color='text.secondary' className='block truncate'>
                {card.detail}
              </Typography>
            </div>
            <span className={`flex size-11 shrink-0 items-center justify-center rounded ${STYLES[card.tone]}`}>
              <i className={`${card.icon} text-2xl`} />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default InvoiceStatsCards
