'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'

import tableStyles from '@core/styles/table.module.css'

const COLORS = new Set(['primary', 'secondary', 'success', 'error', 'warning', 'info'])

const InventoryTable = ({
  data,
  loading,
  page,
  rowsPerPage,
  locale,
  dictionary,
  canWrite,
  canDelete,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onAdjust,
  onDelete,
  onCreate,
  onView
}) => {
  const renderActions = item => (
    <EntityActionsMenu
      actions={[
        { label: dictionary.actions.view || 'View details', icon: 'tabler-eye', onClick: () => onView(item) },
        canWrite && { label: dictionary.actions.edit, icon: 'tabler-edit', onClick: () => onEdit(item) },
        canWrite && { label: dictionary.actions.adjust, icon: 'tabler-arrows-exchange', onClick: () => onAdjust(item) },
        canDelete && {
          label: dictionary.actions.delete,
          icon: 'tabler-trash',
          color: 'error',
          onClick: () => onDelete(item)
        }
      ]}
      moreActionsLabel={dictionary.table.actions}
    />
  )

  return (
    <>
      <ResponsiveDataTable
        mobileRows={data.items}
        loading={loading}
        getMobileRowId={item => item.id}
        renderMobilePrimary={item => (
          <div className='min-is-0'>
            <Typography className='truncate font-semibold'>{item.sku_code}</Typography>
            <Typography variant='body2' color='text.secondary' className='truncate'>
              {item.name}
            </Typography>
          </div>
        )}
        renderMobileStatus={item => {
          const stockColor =
            item.stock_state === 'OUT_OF_STOCK' ? 'error' : item.stock_state === 'LOW_STOCK' ? 'warning' : 'success'

          const statusColor = COLORS.has(item.status.color_code) ? item.status.color_code : stockColor

          return (
            <Chip
              size='small'
              variant='tonal'
              color={statusColor}
              label={dictionary.stockStatus[item.status.value] || item.status.label}
            />
          )
        }}
        renderMobileActions={renderActions}
        mobileMetadata={[
          { id: 'category', label: dictionary.table.category, render: item => item.category.label },
          { id: 'quantity', label: dictionary.table.quantity, render: item => item.quantity_in_stock },
          {
            id: 'unit-price',
            label: 'Purchase Unit Cost',
            render: item => <DualCurrencyAmount amount={item.unit_price} amountBase={item.amount_base} currency={item.currency} exchangeRate={item.exchange_rate} locale={locale} />
          },
          {
            id: 'total-value',
            label: 'Asset Inventory Value',
            render: item => <DualCurrencyAmount amount={item.total_value} amountBase={item.total_value_base} currency={item.currency} exchangeRate={item.exchange_rate} locale={locale} />
          },
          { id: 'reorder', label: dictionary.table.reorderLevel, render: item => item.reorder_level },
          { id: 'stock', label: dictionary.table.status, render: item => dictionary.stockStatus[item.stock_state] }
        ]}
        emptyState={{
          icon: 'tabler-packages',
          title: dictionary.empty.title,
          description: dictionary.empty.description,
          actionLabel: canWrite ? dictionary.actions.add : undefined,
          onAction: canWrite ? onCreate : undefined
        }}
        onRowClick={onView}
      >
        <div className='no-scrollbar overflow-x-auto scroll-smooth'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>{dictionary.table.sku}</th>
                <th>{dictionary.table.item}</th>
                <th>{dictionary.table.category}</th>
                <th className='text-end'>{dictionary.table.quantity}</th>
                <th className='text-end'>Purchase Unit Cost</th>
                <th className='text-end'>Asset Inventory Value</th>
                <th className='text-end'>{dictionary.table.reorderLevel}</th>
                <th>{dictionary.table.status}</th>
                <th className='text-end'>{dictionary.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={9} />
              ) : data.items.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={9}
                  icon='tabler-packages'
                  title={dictionary.empty.title}
                  description={dictionary.empty.description}
                  actionLabel={canWrite ? dictionary.actions.add : null}
                  onAction={canWrite ? onCreate : null}
                />
              ) : (
                data.items.map(item => {
                  const stockColor =
                    item.stock_state === 'OUT_OF_STOCK'
                      ? 'error'
                      : item.stock_state === 'LOW_STOCK'
                        ? 'warning'
                        : 'success'

                  const statusColor = COLORS.has(item.status.color_code) ? item.status.color_code : stockColor

                  return (
                    <tr key={item.id} className='cursor-pointer' onClick={event => {
                      if (!event.target.closest('button, a, input, select, textarea, [role="button"], [data-row-action]')) onView(item)
                    }}>
                      <td>
                        <div className='flex min-is-[150px] items-center gap-3'>
                          <span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
                            <i className='tabler-receipt-tax' />
                          </span>
                          <Typography className='min-is-[105px] whitespace-nowrap font-semibold text-primary'>
                            {item.sku_code}
                          </Typography>
                        </div>
                      </td>
                      <td>
                        <div className='min-is-[170px]'>
                          <Typography className='max-is-[220px] truncate font-medium'>{item.name}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {dictionary.stockStatus[item.stock_state]}
                          </Typography>
                        </div>
                      </td>
                      <td>
                        <Chip size='small' variant='tonal' color='secondary' label={item.category.label} />
                      </td>
                      <td className='text-end'>
                        <Chip size='small' variant='tonal' color={stockColor} label={item.quantity_in_stock} />
                      </td>
                      <td className='text-end'>
                        <DualCurrencyAmount amount={item.unit_price} amountBase={item.amount_base} currency={item.currency} exchangeRate={item.exchange_rate} locale={locale} className='min-is-[120px] items-end' />
                      </td>
                      <td className='text-end'>
                        <DualCurrencyAmount amount={item.total_value} amountBase={item.total_value_base} currency={item.currency} exchangeRate={item.exchange_rate} locale={locale} className='min-is-[130px] items-end' />
                      </td>
                      <td className='text-end'>
                        <Typography>{item.reorder_level}</Typography>
                      </td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={statusColor}
                          label={dictionary.stockStatus[item.status.value] || item.status.label}
                        />
                      </td>
                      <td className='text-end'>{renderActions(item)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </ResponsiveDataTable>
      <DashboardTablePagination
        count={data.totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageLabel={dictionary.common.rowsPerPage}
        ofLabel={dictionary.common.of}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  )
}

export default InventoryTable
