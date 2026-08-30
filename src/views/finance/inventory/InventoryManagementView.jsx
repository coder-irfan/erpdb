'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'

import InventoryAdjustmentDialog from './InventoryAdjustmentDialog'
import InventoryFormDrawer from './InventoryFormDrawer'
import InventoryDetailDialog from './InventoryDetailDialog'
import InventoryStatsCards from './InventoryStatsCards'
import InventoryTable from './InventoryTable'

const EMPTY_DATA = {
  items: [],
  totalCount: 0,
  summary: { totalItems: 0, totalValue: 0, lowStock: 0, outOfStock: 0 },
  options: { categories: [], statuses: [], staff: [], baseCurrency: 'AFN', exchangeRate: '65.0000' }
}

const InventoryManagementView = ({ locale, dictionary, canWrite, canDelete }) => {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [statusId, setStatusId] = useState('')
  const [stockState, setStockState] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [viewingItem, setViewingItem] = useState(null)
  const [adjustTarget, setAdjustTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const loadData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ locale, page: String(page + 1), limit: String(rowsPerPage) })

    if (search) params.set('search', search)
    if (categoryId) params.set('category_id', categoryId)
    if (statusId) params.set('status_id', statusId)
    if (stockState) params.set('stock_state', stockState)

    try {
      const response = await fetch(`/api/finance/inventory?${params}`, { cache: 'no-store' })
      const result = await response.json()

      if (response.ok && result.success) setData(result.data)
      else toast.error(result.error || dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [categoryId, dictionary.messages.loadFailed, locale, page, rowsPerPage, search, statusId, stockState])

  useEffect(() => {
    loadData()
  }, [loadData])

  const remove = async () => {
    if (!deleteTarget) return

    setDeleting(true)

    try {
      const response = await fetch(`/api/finance/inventory/${deleteTarget.id}?locale=${locale}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

      toast.success(result.message)
      setDeleteTarget(null)
      await loadData()
    } finally {
      setDeleting(false)
    }
  }

  const activeFilters = [searchInput.trim(), categoryId, statusId, stockState].filter(Boolean).length

  const openCreate = () => {
    setEditingItem(null)
    setFormOpen(true)
  }

  return (
    <div className='flex flex-col gap-4'>
      <InventoryStatsCards summary={data.summary} locale={locale} dictionary={dictionary} />
      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <CustomTextField
            label={dictionary.filters.search}
            placeholder={dictionary.filters.searchPlaceholder}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            className='is-full sm:is-[360px]'
            slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }}
          />
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
            <TableFiltersPopover activeCount={activeFilters} locale={locale}>
              <CustomTextField
                select
                label={dictionary.filters.category}
                value={categoryId}
                onChange={event => {
                  setCategoryId(event.target.value)
                  setPage(0)
                }}
              >
                <MenuItem value=''>{dictionary.filters.allCategories}</MenuItem>
                {data.options.categories.map(option => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label={dictionary.filters.status}
                value={statusId}
                onChange={event => {
                  setStatusId(event.target.value)
                  setPage(0)
                }}
              >
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
                {data.options.statuses.map(option => (
                  <MenuItem key={option.id} value={option.id}>
                    {dictionary.stockStatus[option.value] || option.label}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label={dictionary.filters.stock}
                value={stockState}
                onChange={event => {
                  setStockState(event.target.value)
                  setPage(0)
                }}
              >
                <MenuItem value=''>{dictionary.filters.allStock}</MenuItem>
                {Object.entries(dictionary.stockStatus).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </CustomTextField>
              {activeFilters > 0 && (
                <Button
                  variant='tonal'
                  color='secondary'
                  onClick={() => {
                    setSearchInput('')
                    setSearch('')
                    setCategoryId('')
                    setStatusId('')
                    setStockState('')
                    setPage(0)
                  }}
                >
                  {dictionary.filters.clear}
                </Button>
              )}
            </TableFiltersPopover>
            {canWrite && (
              <Button
                variant='contained'
                disabled={loading}
                startIcon={<i className='tabler-plus' />}
                onClick={openCreate}
              >
                {dictionary.actions.add}
              </Button>
            )}
          </div>
        </CardContent>
        <InventoryTable
          data={data}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          locale={locale}
          dictionary={dictionary}
          canWrite={canWrite}
          canDelete={canDelete}
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          onView={setViewingItem}
          onEdit={item => {
            setEditingItem(item)
            setFormOpen(true)
          }}
          onAdjust={setAdjustTarget}
          onDelete={setDeleteTarget}
          onCreate={openCreate}
        />
      </Card>
      <InventoryFormDrawer
        open={formOpen}
        item={editingItem}
        options={data.options}
        locale={locale}
        dictionary={dictionary}
        onClose={() => {
          setFormOpen(false)
          setEditingItem(null)
        }}
        onSaved={loadData}
      />
      <InventoryDetailDialog
        open={Boolean(viewingItem)}
        item={viewingItem}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setViewingItem(null)}
      />
      <InventoryAdjustmentDialog
        open={Boolean(adjustTarget)}
        item={adjustTarget}
        options={data.options}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setAdjustTarget(null)}
        onSaved={loadData}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.delete.title}
        description={dictionary.delete.description}
        itemName={deleteTarget?.name}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={deleting}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default InventoryManagementView
