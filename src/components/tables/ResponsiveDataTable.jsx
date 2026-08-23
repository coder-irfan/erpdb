'use client'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { flexRender } from '@tanstack/react-table'

import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'

import tableStyles from '@core/styles/table.module.css'

const MobileEmptyState = ({ icon, title, description, actionLabel, onAction }) => (
  <Card variant='outlined'>
    <CardContent className='flex flex-col items-center justify-center px-3 py-7 text-center sm:px-4 sm:py-10'>
      <div className='mb-3 flex size-12 items-center justify-center rounded-full bg-primaryLighter text-primary sm:mb-4 sm:size-16'>
        <i className={`${icon || 'tabler-file-x'} text-3xl opacity-70 sm:text-5xl`} />
      </div>
      <Typography variant='h6'>{title}</Typography>
      {description && (
        <Typography color='text.secondary' className='mt-1 max-is-[460px]'>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button
          variant='tonal'
          color='secondary'
          startIcon={<i className='tabler-plus' />}
          onClick={onAction}
          className='mt-5'
        >
          {actionLabel}
        </Button>
      )}
    </CardContent>
  </Card>
)

const CardSkeletonRows = ({ rows = 5 }) => (
  <div className='grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4'>
    {Array.from({ length: rows }, (_, index) => (
      <Card key={`responsive-skeleton-${index}`} variant='outlined'>
        <CardContent className='flex flex-col gap-2 p-3 sm:gap-3 sm:p-4'>
          <div className='flex justify-between gap-4'>
            <Skeleton variant='rounded' width='58%' height={44} animation='wave' />
            <Skeleton variant='rounded' width={82} height={28} animation='wave' />
          </div>
          <Skeleton variant='rounded' height={1} animation='wave' />
          <div className='grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 sm:gap-3'>
            {Array.from({ length: 4 }, (_, cellIndex) => (
              <Skeleton key={cellIndex} variant='rounded' height={36} animation='wave' />
            ))}
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)

const ResponsiveDataTable = ({
  table,
  children,
  mobileRows,
  getMobileRowId,
  renderMobilePrimary,
  renderMobileStatus,
  renderMobileActions,
  mobileMetadata = [],
  loading = false,
  primaryColumnId,
  statusColumnId,
  actionsColumnId,
  emptyState,
  loadingRows = 5,
  onRowClick,
  desktopTableClassName = tableStyles.table,
  getDesktopCellClassName
}) => {
  const tanstackRows = table?.getRowModel().rows || []
  const columns = table?.getVisibleLeafColumns() || []
  const headersByColumnId = new Map(table?.getFlatHeaders().map(header => [header.column.id, header]) || [])
  const cardRows = table ? tanstackRows : mobileRows || []

  const desktopContent = children || (
    <div className='no-scrollbar overflow-x-auto scroll-smooth'>
      <table className={desktopTableClassName}>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className={header.column.id === actionsColumnId ? 'text-end' : undefined}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: loadingRows }, (_, rowIndex) => (
              <tr key={`desktop-skeleton-${rowIndex}`} aria-hidden='true'>
                {columns.map(column => (
                  <td key={`${rowIndex}-${column.id}`}>
                    <Skeleton variant='rounded' height={24} animation='wave' />
                  </td>
                ))}
              </tr>
            ))
          ) : tanstackRows.length === 0 ? (
            <TableEmptyStateRow {...emptyState} colSpan={columns.length} />
          ) : (
            tanstackRows.map(row => (
              <tr key={row.id} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className={
                      getDesktopCellClassName?.(cell) || (cell.column.id === actionsColumnId ? 'text-end' : undefined)
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <div className='hidden lg:block print:block'>{desktopContent}</div>

      <div className='block lg:hidden print:hidden'>
        {loading ? (
          <CardSkeletonRows rows={loadingRows} />
        ) : cardRows.length === 0 ? (
          <div className='p-4'>
            <MobileEmptyState {...emptyState} />
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4'>
            {cardRows.map((row, rowIndex) => {
              const cells = table ? row.getVisibleCells() : []
              const primaryCell = cells.find(cell => cell.column.id === primaryColumnId)
              const statusCell = cells.find(cell => cell.column.id === statusColumnId)
              const actionsCell = cells.find(cell => cell.column.id === actionsColumnId)

              const metadataCells = table
                ? cells.filter(cell => ![primaryColumnId, statusColumnId, actionsColumnId].includes(cell.column.id))
                : mobileMetadata

              const rowKey = table ? row.id : getMobileRowId?.(row, rowIndex) || row.id || rowIndex

              const primaryContent = table
                ? primaryCell && flexRender(primaryCell.column.columnDef.cell, primaryCell.getContext())
                : renderMobilePrimary?.(row, rowIndex)

              const statusContent = table
                ? statusCell && flexRender(statusCell.column.columnDef.cell, statusCell.getContext())
                : renderMobileStatus?.(row, rowIndex)

              const actionsContent = table
                ? actionsCell && flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())
                : renderMobileActions?.(row, rowIndex)

              return (
                <Card key={rowKey} variant='outlined' onClick={onRowClick ? () => onRowClick(row) : undefined}>
                  <CardContent className='flex flex-col gap-2 p-3 sm:gap-3 sm:p-4'>
                    <div className='flex items-end justify-between gap-3'>
                      <div className='min-is-0 flex-1'>{primaryContent}</div>
                      <div className='flex shrink-0 items-center gap-2'>
                        {statusContent}
                        {actionsContent && <div onClick={event => event.stopPropagation()}>{actionsContent}</div>}
                      </div>
                    </div>
                    {metadataCells.length > 0 && <div className='border-be border-divider' />}
                    {metadataCells.length > 0 && (
                      <div className='flex flex-col gap-1.5 text-xs sm:gap-2'>
                        {metadataCells.map((cell, cellIndex) => {
                          const header = table ? headersByColumnId.get(cell.column.id) : null
                          const cellKey = table ? cell.id : cell.id || cellIndex

                          const label = table
                            ? header
                              ? flexRender(header.column.columnDef.header, header.getContext())
                              : cell.column.id
                            : cell.label

                          const value = table
                            ? flexRender(cell.column.columnDef.cell, cell.getContext())
                            : cell.render?.(row, rowIndex)

                          const isLast = cellIndex === metadataCells.length - 1

                          return (
                            <div
                              key={cellKey}
                              className={`flex items-center justify-between gap-3 py-1.5 ${
                                !isLast ? 'border-b border-divider/40 dark:border-divider/20' : ''
                              }`}
                            >
                              <Typography variant='caption' color='text.secondary' className='text-xs sm:text-sm shrink-0 font-medium'>
                                {label}
                              </Typography>

                              {/* Value on Right */}
                              <div className='min-is-0 text-end text-xs font-semibold text-textPrimary break-words sm:text-sm'>
                                {value}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

export default ResponsiveDataTable
