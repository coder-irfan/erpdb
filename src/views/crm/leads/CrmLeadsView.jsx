'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'

import LeadActivityDrawer from './LeadActivityDrawer'
import LeadDrawer from './LeadDrawer'
import LeadDetailDialog from './LeadDetailDialog'
import LeadKanbanBoard from './LeadKanbanBoard'
import LeadStatsCards from './LeadStatsCards'
import LeadTableView from './LeadTableView'

const EMPTY = {
  leads: [],
  totalCount: 0,
  summary: { totalActive: 0, pipelineValue: 0, followUpsToday: 0, conversionRate: 0 },
  options: { statuses: [], sources: [], staff: [] }
}

const CrmLeadsView = ({ locale, dictionary, currencyCode, canWrite, canDelete }) => {
  const [view, setView] = useState('table')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusId, setStatusId] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [assignedId, setAssignedId] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [viewingLead, setViewingLead] = useState(null)
  const [activityLeadId, setActivityLeadId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams({ view, page: String(page + 1), limit: String(rowsPerPage), locale })

      if (search) params.set('search', search)
      if (statusId) params.set('status_id', statusId)
      if (sourceId) params.set('source_id', sourceId)
      if (assignedId) params.set('assigned_to_id', assignedId)
      const response = await fetch(`/api/crm/leads?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.loadFailed)
      setData(result.data)
    } catch {
      toast.error(dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [assignedId, dictionary.messages.loadFailed, locale, page, rowsPerPage, search, sourceId, statusId, view])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activityLead = data.leads.find(lead => lead.id === activityLeadId) || null

  const statusChange = async (lead, nextStatusId) => {
    const response = await fetch(`/api/crm/leads/${lead.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_id: nextStatusId, locale })
    })

    const result = await response.json()

    if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)
    toast.success(result.message)
    await loadData()
  }

  const convert = async lead => {
    setBusy(true)

    try {
      const response = await fetch(`/api/crm/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale })
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)
      toast.success(result.message)
      await loadData()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setBusy(true)

    try {
      const response = await fetch(`/api/crm/leads/${deleteTarget.id}?locale=${locale}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)
      toast.success(result.message)
      setDeleteTarget(null)
      await loadData()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='flex flex-col md:gap-4 gap-2'>
      <LeadStatsCards summary={data.summary} locale={locale} currencyCode={currencyCode} dictionary={dictionary} />
      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex is-full flex-wrap items-center gap-3 md:is-auto'>
            <CustomTextField
              label={dictionary.filters.search}
              placeholder={dictionary.filters.searchPlaceholder}
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              className='is-full sm:is-[320px]'
              slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }}
            />
          </div>
          <div className='grid is-full grid-cols-1 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
            <ToggleButtonGroup
              exclusive
              size='small'
              value={view}
              onChange={(_, value) => {
                if (value) {
                  setView(value)
                  setPage(0)
                }
              }}
            >
              <ToggleButton value='table'>
                <i className='tabler-table me-2' />
                {dictionary.views.table}
              </ToggleButton>
              <ToggleButton value='kanban'>
                <i className='tabler-layout-kanban me-2' />
                {dictionary.views.kanban}
              </ToggleButton>
            </ToggleButtonGroup>
            <TableFiltersPopover
              activeCount={Number(Boolean(searchInput.trim())) + Number(Boolean(sourceId)) + Number(Boolean(statusId)) + Number(Boolean(assignedId))}
              locale={locale}
              onReset={() => { setSearchInput(''); setSearch(''); setSourceId(''); setStatusId(''); setAssignedId(''); setPage(0) }}
            >
              <CustomTextField
                select
                label={dictionary.filters.source}
                value={sourceId || ''}
                onChange={event => {
                  setSourceId(event.target.value)
                  setPage(0)
                }}
                className='is-full'
              >
                <MenuItem value=''>{dictionary.filters.allSources}</MenuItem>
                {data.options.sources.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.label}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label={dictionary.filters.status}
                value={statusId || ''}
                onChange={event => {
                  setStatusId(event.target.value)
                  setPage(0)
                }}
                className='is-full'
              >
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
                {data.options.statuses.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.label}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label={dictionary.filters.assigned}
                value={assignedId || ''}
                onChange={event => {
                  setAssignedId(event.target.value)
                  setPage(0)
                }}
                className='is-full'
              >
                <MenuItem value=''>{dictionary.filters.allStaff}</MenuItem>
                {data.options.staff.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.full_name}
                  </MenuItem>
                ))}
              </CustomTextField>
            </TableFiltersPopover>
            {canWrite && (
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                aria-label={dictionary.actions.newLead}
                title={dictionary.actions.newLead}
                onClick={() => {
                  setPage(0)
                  setEditingLead(null)
                  setDrawerOpen(true)
                }}
              >
                <span>{dictionary.actions.newLead}</span>
              </Button>
            )}
          </div>
        </CardContent>
        {view === 'table' ? (
          <LeadTableView
            data={data}
            loading={loading}
            page={page}
            rowsPerPage={rowsPerPage}
            locale={locale}
            currencyCode={currencyCode}
            dictionary={dictionary}
            canWrite={canWrite}
            canDelete={canDelete}
            onPageChange={(_, next) => setPage(next)}
            onRowsPerPageChange={event => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
            onActivity={lead => setActivityLeadId(lead.id)}
            onConvert={convert}
            onEdit={lead => {
              setEditingLead(lead)
              setDrawerOpen(true)
            }}
            onDelete={setDeleteTarget}
            onView={setViewingLead}
            onAdd={() => {
              setPage(0)
              setEditingLead(null)
              setDrawerOpen(true)
            }}
          />
        ) : (
          <CardContent>
            <LeadKanbanBoard
              leads={data.leads}
              statuses={data.options.statuses}
              locale={locale}
              currencyCode={currencyCode}
              dictionary={dictionary}
              loading={loading}
              canWrite={canWrite}
              onStatusChange={statusChange}
              onActivity={lead => setActivityLeadId(lead.id)}
            />
          </CardContent>
        )}
      </Card>
      <LeadDrawer
        open={drawerOpen}
        lead={editingLead}
        options={data.options}
        baseCurrency={currencyCode}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setDrawerOpen(false)}
        onSaved={loadData}
      />
      <LeadDetailDialog
        open={Boolean(viewingLead)}
        lead={viewingLead}
        locale={locale}
        currencyCode={currencyCode}
        dictionary={dictionary}
        onClose={() => setViewingLead(null)}
      />
      <LeadActivityDrawer
        open={Boolean(activityLead)}
        lead={activityLead}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setActivityLeadId(null)}
        onSaved={loadData}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.delete.title}
        description={dictionary.delete.description}
        itemName={deleteTarget?.title}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={busy}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default CrmLeadsView
