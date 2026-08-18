import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { formatCurrency } from '@/utils/formatCurrency'

const cards = [
  { key: 'totalPayroll', label: 'totalPayroll', icon: 'tabler-wallet', classes: 'bg-primaryLighter text-primary' },
  { key: 'totalPaid', label: 'totalPaid', icon: 'tabler-circle-check', classes: 'bg-successLighter text-success' },
  { key: 'totalPending', label: 'totalPending', icon: 'tabler-hourglass', classes: 'bg-secondaryLighter text-warning' },
  { key: 'totalDeductions', label: 'totalDeductions', icon: 'tabler-receipt-tax', classes: 'bg-errorLight text-error' }
]

const PayrollStatsCards = ({ summary, locale, currencyCode, dictionary }) => (
  <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible'>
    {cards.map(card => (
      <Card key={card.key} className='min-w-[280px] snap-start xl:min-w-0'>
        <CardContent className='flex items-center justify-between gap-4'>
          <div>
            <Typography color='text.secondary' className='text-sm md:text-base font-semibold'>
              {dictionary.summary[card.label]}
            </Typography>
            <Typography variant='h5' className='mt-1'>
              {formatCurrency(summary?.[card.key], locale, currencyCode)}
            </Typography>
          </div>
          <div className={`flex size-12 shrink-0 items-center justify-center rounded ${card.classes}`}>
            <i className={`${card.icon} text-xl lg:text-2xl`} />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)

export default PayrollStatsCards
