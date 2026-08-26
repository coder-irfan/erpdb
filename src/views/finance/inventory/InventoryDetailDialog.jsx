'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import DetailDialog from '@/components/dialogs/DetailDialog'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatLedgerText } from '@/utils/ledgerDisplay'

const Item = ({ label, value }) => (
  <div className='rounded-lg border border-divider/70 bg-backgroundDefault/40 p-3'>
    <Typography variant='caption' color='text.secondary' className='text-xs'>{label}</Typography>
    <Typography className='mt-1 break-words text-sm font-medium sm:text-base'>{value || '—'}</Typography>
  </div>
)

const InventoryDetailDialog = ({ item, open, locale, dictionary, onClose }) => {
  if (!item) return null

  const statusColor = item.stock_state === 'OUT_OF_STOCK' ? 'error' : item.stock_state === 'LOW_STOCK' ? 'warning' : 'success'

  return (
    <DetailDialog open={open} onClose={onClose} title={item.name} subtitle={item.sku_code}>
      <div className='flex flex-col gap-5 sm:gap-6'>
        <div className='flex flex-wrap gap-2'>
          <Chip size='small' variant='tonal' color={statusColor} label={dictionary.stockStatus[item.stock_state] || item.stock_state} />
          <Chip size='small' variant='tonal' color='secondary' label={item.category?.label} />
        </div>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <Item label={dictionary.table.quantity} value={item.quantity_in_stock} />
          <Item label={dictionary.table.reorderLevel} value={item.reorder_level} />
          <Item label={dictionary.table.unitPrice} value={formatCurrency(item.unit_price, locale, item.currency)} />
          <Item label={dictionary.table.totalValue} value={formatCurrency(item.total_value, locale, item.currency)} />
          <Item label={dictionary.fields.baseAmount} value={formatCurrency(item.amount_base, locale, 'USD')} />
          <Item label={dictionary.fields.currency} value={item.currency} />
        </div>
        <section className='rounded-lg border border-divider/70 p-4'>
          <Typography variant='subtitle2'>Notes</Typography>
          <Typography color='text.secondary' className='mt-2 whitespace-pre-wrap text-xs sm:text-sm'>{formatLedgerText(item.notes) || '—'}</Typography>
        </section>
      </div>
    </DetailDialog>
  )
}

export default InventoryDetailDialog
