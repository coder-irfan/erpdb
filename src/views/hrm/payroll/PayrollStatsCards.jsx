import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { formatCurrency } from '@/utils/formatCurrency'

const cards = [
  { key: 'totalPayroll', label: 'totalPayroll', icon: 'tabler-wallet', classes: 'bg-primaryLighter text-primary' },
  { key: 'totalPaid', label: 'totalPaid', icon: 'tabler-circle-check', classes: 'bg-successLight text-success' },
  { key: 'totalPending', label: 'totalPending', icon: 'tabler-hourglass', classes: 'bg-warningLight text-warning' },
  { key: 'totalDeductions', label: 'totalDeductions', icon: 'tabler-receipt-tax', classes: 'bg-errorLight text-error' }
]

const PayrollStatsCards = ({ summary, locale, currencyCode, dictionary }) => (
  <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4'>
    {cards.map(card => (
      <Card key={card.key}>
        <CardContent className='flex items-center justify-between gap-4'>
          <div>
            <Typography color='text.secondary'>{dictionary.summary[card.label]}</Typography>
            <Typography variant='h5' className='mt-1'>{formatCurrency(summary[card.key] || 0, locale, currencyCode)}</Typography>
          </div>
          <div className={`flex size-12 shrink-0 items-center justify-center rounded ${card.classes}`}><i className={`${card.icon} text-3xl`} /></div>
        </CardContent>
      </Card>
    ))}
  </div>
)

export default PayrollStatsCards
