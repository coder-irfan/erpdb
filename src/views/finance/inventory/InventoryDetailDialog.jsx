'use client'

import { useEffect, useState } from 'react'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import DetailDialog from '@/components/dialogs/DetailDialog'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const Item = ({ label, value }) => (
  <div className='rounded-lg border border-divider/70 bg-backgroundDefault/40 p-3'>
    <Typography variant='caption' color='text.secondary' className='text-xs'>{label}</Typography>
    <div className='mt-1 break-words text-sm font-medium sm:text-base'>{value || '—'}</div>
  </div>
)

const InventoryDetailDialog = ({ item, open, locale, dictionary, onClose }) => {
  const [movements, setMovements] = useState([])

  useEffect(() => {
    if (!open || !item?.id) return

    const controller = new AbortController()

    setMovements([])
    fetch(`/api/finance/inventory/${item.id}/movements?locale=${locale}&limit=100`, { cache: 'no-store', signal: controller.signal })
      .then(response => response.json())
      .then(result => { if (result.success) setMovements(result.data.movements || []) })
      .catch(() => {})

    return () => controller.abort()
  }, [item?.id, locale, open])

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
          <Item label='Quantity in Stock' value={item.quantity_in_stock} />
          <Item label='Reorder Level' value={item.reorder_level} />
          <Item label='Purchase Unit Cost' value={<DualCurrencyAmount amount={item.unit_price} amountBase={item.amount_base} currency={item.currency} exchangeRate={item.exchange_rate} locale={locale} />} />
          <Item label='Asset Inventory Value' value={<DualCurrencyAmount amount={item.total_value} amountBase={item.total_value_base} currency={item.currency} exchangeRate={item.exchange_rate} locale={locale} />} />
          <Item label='USD Unit Value' value={formatCurrency(item.unit_value_usd, locale, 'USD')} />
          <Item label='Currency / Locked Rate' value={`${item.currency} / ${item.exchange_rate}`} />
        </div>
        <section className='rounded-lg border border-divider/70 p-4'>
          <Typography variant='subtitle2' className='mb-3'>Stock Movement Audit Trail</Typography>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[760px] text-sm'>
              <thead><tr className='border-be border-divider'><th className='p-2 text-start'>Date</th><th className='p-2 text-start'>Movement</th><th className='p-2 text-end'>Quantity</th><th className='p-2 text-start'>Source / Reason</th><th className='p-2 text-start'>Assigned Staff</th><th className='p-2 text-start'>Notes / Reference</th><th className='p-2 text-end'>Balance</th></tr></thead>
              <tbody>{movements.length ? movements.map(movement => <tr key={movement.id} className='border-be border-divider'><td className='p-2'>{toDateInputValue(movement.occurred_at)}</td><td className='p-2'>{movement.direction === 'IN' ? 'Stock In' : 'Stock Out'}</td><td className={`p-2 text-end ${movement.direction === 'OUT' ? 'text-error' : 'text-success'}`}>{movement.direction === 'OUT' ? '-' : '+'}{movement.quantity}</td><td className='p-2'>{movement.source_vendor || movement.reason?.replaceAll('_', ' ') || '—'}</td><td className='p-2'>{movement.assigned_staff?.full_name || '—'}</td><td className='p-2'>{movement.notes || movement.reference_id || '—'}</td><td className='p-2 text-end font-semibold'>{movement.quantity_after}</td></tr>) : <tr><td colSpan='7' className='p-4 text-center text-textSecondary'>No stock movements recorded.</td></tr>}</tbody>
            </table>
          </div>
        </section>
      </div>
    </DetailDialog>
  )
}

export default InventoryDetailDialog
