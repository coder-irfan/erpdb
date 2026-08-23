'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const ContractStatsCards = ({ summary, locale, currency, dictionary, variant = 'default' }) => {
  const toneClasses = {
    success: 'bg-successLighter text-success',
    warning: 'bg-secondaryLighter text-secondary',
    primary: 'bg-primaryLighter text-primary',
    info: 'bg-infoLighter text-info'
  }

  const standardCards = [
    {
      label: dictionary.kpis.active,
      value: summary.activeCount,
      detail: formatCurrency(toFiniteNumber(summary.activeValue), locale, currency),
      icon: 'tabler-file-check',
      tone: 'success'
    },
    {
      label: dictionary.kpis.expiring,
      value: summary.expiringCount,
      detail: formatCurrency(toFiniteNumber(summary.expiringValue), locale, currency),
      icon: 'tabler-clock-exclamation',
      tone: 'warning'
    },
    {
      label: dictionary.kpis.monthlyRevenue,
      value: formatCurrency(toFiniteNumber(summary.monthlyActiveRevenue), locale, currency),
      detail: dictionary.kpis.baseCurrency.replace('{currency}', currency),
      icon: 'tabler-cash',
      tone: 'primary'
    },
    {
      label: dictionary.kpis.drafts,
      value: summary.draftCount,
      detail: dictionary.kpis.awaiting,
      icon: 'tabler-signature',
      tone: 'info'
    }
  ]

  const otherCards = [
    { label: 'Total Contracts', value: summary.totalCount || 0, detail: 'Other and third-party agreements', icon: 'tabler-files', tone: 'primary' },
    { label: 'Active', value: summary.activeCount, detail: 'Currently active', icon: 'tabler-file-check', tone: 'success' },
    { label: 'Expiring Soon', value: summary.expiringCount, detail: 'Within 30 days', icon: 'tabler-clock-exclamation', tone: 'warning' },
    { label: 'Total Value', value: formatCurrency(toFiniteNumber(summary.totalValue), locale, currency), detail: dictionary.kpis.baseCurrency.replace('{currency}', currency), icon: 'tabler-cash', tone: 'info' }
  ]

  const cards = variant === 'others' ? otherCards : standardCards

  return (
     <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible'>
      {cards.map(card => (
        <Card key={card.label} className='min-w-[280px] snap-start xl:min-w-0'>
          <CardContent className='flex items-center justify-between gap-4'>
            <div className='min-is-0'>
              <Typography variant='body2' color='text.secondary' className='truncate'>
                {card.label}
              </Typography>
              <Typography variant='h5' className='mt-1 truncate'>
                {card.value}
              </Typography>
              <Typography variant='caption' color='text.secondary' className='block truncate'>
                {card.detail}
              </Typography>
            </div>
            <div className={`flex size-11 shrink-0 items-center justify-center rounded ${toneClasses[card.tone]}`}>
              <i className={`${card.icon} text-2xl`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default ContractStatsCards
