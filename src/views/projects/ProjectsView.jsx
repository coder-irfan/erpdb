'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { deleteProject, getProjectFormOptions, getProjects, updateProjectStatus } from '@/actions/projects'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'

import ProjectDetailModal from './ProjectDetailModal'
import ProjectFormDrawer from './ProjectFormDrawer'
import ProjectStatsCards from './ProjectStatsCards'
import ProjectTableView from './ProjectTableView'

const EMPTY_DATA = { projects: [], totalCount: 0, baseCurrency: 'AFN', statuses: [], priorities: [], summary: { activeCount: 0, budget: 0, amountBase: 0, actualHours: 0, estimatedHours: 0, overdueCount: 0 } }
const EMPTY_OPTIONS = { clients: [], staff: [], contracts: [], statuses: [], priorities: [], baseCurrency: 'AFN', exchangeRate: '65.0000' }

const ProjectsView = ({ locale, dictionary, taskDictionary, canWrite, canDelete, canTaskManage, canTaskUpdate, canTaskDelete }) => {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [clientId, setClientId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [statusId, setStatusId] = useState('')
  const [priorityId, setPriorityId] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY_DATA)
  const [options, setOptions] = useState(EMPTY_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [detailTab, setDetailTab] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => { setSearch(searchInput.trim()); setPage(0) }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const result = await getProjects({ page: page + 1, limit: rowsPerPage, search, clientId, managerId, statusId, priorityId, locale })

    if (result.success) setData(result.data)
    else toast.error(result.error || dictionary.messages.loadFailed)
    if (showLoading) setLoading(false)
  }, [clientId, dictionary.messages.loadFailed, locale, managerId, page, priorityId, rowsPerPage, search, statusId])

  const loadOptions = useCallback(async () => {
    const result = await getProjectFormOptions({ locale })

    if (result.success) setOptions(result.data)
    else toast.error(result.error || dictionary.messages.optionsLoadFailed)
  }, [dictionary.messages.optionsLoadFailed, locale])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadOptions() }, [loadOptions])

  const refresh = async () => {
    await Promise.all([loadData(), loadOptions()])
    setRefreshKey(value => value + 1)
  }

  const openCreate = () => { setPage(0); setEditing(null); setFormOpen(true) }
  const openEdit = project => { setEditing(project); setFormOpen(true) }
  const openDetail = (project, tab = 0) => { setDetailTab(tab); setDetailId(project.id) }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteProject(deleteTarget.id, { locale })

    if (result.success) { toast.success(result.message); setDeleteTarget(null); if (detailId === deleteTarget.id) setDetailId(null); await refresh() }
    else toast.error(result.error || dictionary.messages.operationFailed)
    setDeleting(false)
  }

  const changeStatus = async (project, nextStatusId) => {
    if (nextStatusId === project.status_id) return
    const nextStatus = options.statuses.find(option => option.id === nextStatusId)

    if (!nextStatus) return
    setStatusUpdating(project.id)
    setData(current => ({
      ...current,
      projects: current.projects.map(item =>
        item.id === project.id ? { ...item, status_id: nextStatus.id, status: nextStatus } : item
      )
    }))

    try {
      const result = await updateProjectStatus(project.id, nextStatusId, { locale })

      if (!result.success) {
        setData(current => ({
          ...current,
          projects: current.projects.map(item => (item.id === project.id ? project : item))
        }))
        toast.error(result.error || dictionary.messages.operationFailed)

        return
      }

      setData(current => ({
        ...current,
        projects: current.projects.map(item => (item.id === project.id ? result.data : item))
      }))
      toast.success(result.message)
      await loadData(false)
    } catch {
      setData(current => ({
        ...current,
        projects: current.projects.map(item => (item.id === project.id ? project : item))
      }))
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setStatusUpdating(null)
    }
  }

  const activeFilters = [searchInput.trim(), clientId, managerId, statusId, priorityId].filter(Boolean).length
  const resetFilters = () => { setSearchInput(''); setSearch(''); setClientId(''); setManagerId(''); setStatusId(''); setPriorityId(''); setPage(0) }
  const selectFilter = (label, value, setter, items, emptyLabel) => <CustomTextField select label={label} value={value} onChange={event => { setter(event.target.value); setPage(0) }} className='is-full'><MenuItem value=''>{emptyLabel}</MenuItem>{items.map(item => <MenuItem key={item.id} value={item.id}>{item.label || item.full_name || item.company_name}</MenuItem>)}</CustomTextField>

  return (
    <div className='flex flex-col gap-4'>
      <ProjectStatsCards summary={data.summary} locale={locale} currency={data.baseCurrency} dictionary={dictionary} />
      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <CustomTextField label={dictionary.filters.search} placeholder={dictionary.filters.searchPlaceholder} value={searchInput} onChange={event => setSearchInput(event.target.value)} className='is-full sm:is-[360px]' slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }} />
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
            <TableFiltersPopover activeCount={activeFilters} locale={locale}>
              {selectFilter(dictionary.filters.client, clientId, setClientId, options.clients, dictionary.filters.allClients)}
              {selectFilter(dictionary.filters.manager, managerId, setManagerId, options.staff, dictionary.filters.allManagers)}
              {selectFilter(dictionary.filters.status, statusId, setStatusId, options.statuses, dictionary.filters.allStatuses)}
              {selectFilter(dictionary.filters.priority, priorityId, setPriorityId, options.priorities, dictionary.filters.allPriorities)}
              {activeFilters > 0 && <Button variant='tonal' color='secondary' onClick={resetFilters}>{dictionary.filters.clear}</Button>}
            </TableFiltersPopover>
            {canWrite && <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={openCreate}>{dictionary.actions.add}</Button>}
          </div>
        </CardContent>
        <ProjectTableView data={data} loading={loading} statusUpdating={statusUpdating} page={page} rowsPerPage={rowsPerPage} locale={locale} dictionary={dictionary} canWrite={canWrite} canDelete={canDelete} statusOptions={options.statuses} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={event => { setRowsPerPage(Number(event.target.value)); setPage(0) }} onView={project => openDetail(project, 0)} onEdit={openEdit} onMembers={project => openDetail(project, 1)} onDelete={setDeleteTarget} onStatusChange={changeStatus} onAdd={openCreate} />
      </Card>
      <ProjectFormDrawer open={formOpen} project={editing} options={options} locale={locale} dictionary={dictionary} onClose={() => setFormOpen(false)} onSaved={refresh} />
      <ProjectDetailModal open={Boolean(detailId)} projectId={detailId} initialTab={detailTab} locale={locale} baseCurrency={data.baseCurrency} dictionary={dictionary} taskDictionary={taskDictionary} options={options} canWrite={canWrite} canTaskManage={canTaskManage} canTaskUpdate={canTaskUpdate} canTaskDelete={canTaskDelete} refreshKey={refreshKey} onClose={() => setDetailId(null)} onEdit={project => { setDetailId(null); openEdit(project) }} onChanged={refresh} />
      <ConfirmDeleteModal open={Boolean(deleteTarget)} title={dictionary.delete.title} description={dictionary.delete.description} itemName={deleteTarget?.project_code} confirmText={dictionary.actions.delete} cancelText={dictionary.actions.cancel} loading={deleting} onConfirm={remove} onClose={() => setDeleteTarget(null)} />
    </div>
  )
}

export default ProjectsView
