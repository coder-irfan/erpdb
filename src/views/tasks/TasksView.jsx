'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { deleteTask, getTaskFormOptions, getTasks, updateTaskStatus } from '@/actions/tasks'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'

import TaskDetailModal from './TaskDetailModal'
import TaskFormDrawer from './TaskFormDrawer'
import TaskHoursDialog from './TaskHoursDialog'
import TaskKanbanView from './TaskKanbanView'
import TaskStatsCards from './TaskStatsCards'
import TaskTableView from './TaskTableView'

const EMPTY_DATA = {
  tasks: [],
  totalCount: 0,
  statuses: [],
  priorities: [],
  scope: 'ASSIGNED',
  currentStaffId: null,
  summary: { total: 0, inProgress: 0, overdue: 0, actualHours: 0, estimatedHours: 0 }
}

const EMPTY_OPTIONS = { projects: [], staff: [], statuses: [], priorities: [] }

const TasksView = ({ locale, dictionary, canManage, canUpdate, canDelete, fixedProjectId = '', embedded = false }) => {
  const [view, setView] = useState('KANBAN')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState(fixedProjectId)
  const [priorityId, setPriorityId] = useState('')
  const [statusId, setStatusId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY_DATA)
  const [options, setOptions] = useState(EMPTY_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [hoursTask, setHoursTask] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const loadData = useCallback(async () => {
    setLoading(true)

    const result = await getTasks({
      view,
      page: page + 1,
      limit: rowsPerPage,
      search,
      projectId,
      priorityId,
      statusId,
      assigneeId,
      locale
    })

    if (result.success) setData(result.data)
    else toast.error(result.error || dictionary.messages.loadFailed)
    setLoading(false)
  }, [
    assigneeId,
    dictionary.messages.loadFailed,
    locale,
    page,
    priorityId,
    projectId,
    rowsPerPage,
    search,
    statusId,
    view
  ])

  const loadOptions = useCallback(async () => {
    const result = await getTaskFormOptions({ locale })

    if (result.success) setOptions(result.data)
    else toast.error(result.error || dictionary.messages.optionsLoadFailed)
  }, [dictionary.messages.optionsLoadFailed, locale])

  useEffect(() => {
    loadData()
  }, [loadData])
  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  const refresh = async () => {
    await Promise.all([loadData(), loadOptions()])
    setRefreshKey(value => value + 1)
  }

  const openCreate = () => {
    setPage(0)
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = task => {
    setEditing(task)
    setFormOpen(true)
  }

  const changeStatus = async (task, nextStatusId) => {
    if (task.status_id === nextStatusId) return
    const nextStatus = data.statuses.find(status => status.id === nextStatusId)

    if (!nextStatus) return false

    setStatusUpdating(task.id)
    setData(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, status_id: nextStatus.id, status: nextStatus } : item) }))
    const result = await updateTaskStatus(task.id, nextStatusId, { locale })

    if (result.success) {
      toast.success(result.message)
      await refresh()
    } else {
      setData(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? task : item) }))
      toast.error(result.error || dictionary.messages.operationFailed)
    }

    setStatusUpdating(null)

    return result.success
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteTask(deleteTarget.id, { locale })

    if (result.success) {
      toast.success(result.message)
      setDeleteTarget(null)
      if (detailId === deleteTarget.id) setDetailId(null)
      await refresh()
    } else toast.error(result.error || dictionary.messages.operationFailed)
    setDeleting(false)
  }

  const activeFilters = [searchInput.trim(), fixedProjectId ? '' : projectId, priorityId, statusId, assigneeId].filter(Boolean).length

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setProjectId(fixedProjectId)
    setPriorityId('')
    setStatusId('')
    setAssigneeId('')
    setPage(0)
  }

  const filterSelect = (label, value, setter, items, emptyLabel, getLabel = item => item.label) => (
    <CustomTextField
      select
      className='is-full'
      label={label}
      value={value}
      onChange={event => {
        setter(event.target.value)
        setPage(0)
      }}
    >
      <MenuItem value=''>{emptyLabel}</MenuItem>
      {items.map(item => (
        <MenuItem key={item.id} value={item.id}>
          {getLabel(item)}
        </MenuItem>
      ))}
    </CustomTextField>
  )

  const sharedViewProps = {
    data,
    locale,
    dictionary,
    canManage,
    canUpdate,
    canDelete,
    statusUpdating,
    onView: task => setDetailId(task.id),
    onEdit: openEdit,
    onLogHours: setHoursTask,
    onDelete: setDeleteTarget,
    onStatusChange: changeStatus
  }

  return (
    <div className='flex flex-col gap-4'>
      {!embedded && <TaskStatsCards summary={data.summary} dictionary={dictionary} />}
      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex is-full flex-wrap items-center gap-3 md:is-auto'>
            <CustomTextField
              label={dictionary.filters.search}
              placeholder={dictionary.filters.searchPlaceholder}
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              className='is-full sm:is-[340px]'
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
              <ToggleButton value='TABLE'>
                <i className='tabler-table mie-2' />
                {dictionary.views.table}
              </ToggleButton>
              <ToggleButton value='KANBAN'>
                <i className='tabler-layout-kanban mie-2' />
                {dictionary.views.kanban}
              </ToggleButton>
            </ToggleButtonGroup>

            <TableFiltersPopover activeCount={activeFilters} locale={locale}>
              {!fixedProjectId && filterSelect(
                dictionary.filters.project,
                projectId,
                setProjectId,
                options.projects,
                dictionary.filters.allProjects,
                item => `${item.project_code} · ${item.title}`
              )}
              {filterSelect(
                dictionary.filters.priority,
                priorityId,
                setPriorityId,
                options.priorities,
                dictionary.filters.allPriorities
              )}
              {filterSelect(
                dictionary.filters.status,
                statusId,
                setStatusId,
                options.statuses,
                dictionary.filters.allStatuses
              )}
              {filterSelect(
                dictionary.filters.assignee,
                assigneeId,
                setAssigneeId,
                options.staff,
                dictionary.filters.allAssignees,
                item => item.full_name
              )}
              {activeFilters > 0 && (
                <Button variant='tonal' color='secondary' onClick={resetFilters}>
                  {dictionary.filters.clear}
                </Button>
              )}
            </TableFiltersPopover>
            {canManage && (
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
                {dictionary.actions.add}
              </Button>
            )}
          </div>
        </CardContent>
        {view === 'KANBAN' ? (
          <CardContent>
            <TaskKanbanView {...sharedViewProps} loading={loading} />
          </CardContent>
        ) : (
          <TaskTableView
            {...sharedViewProps}
            loading={loading}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, value) => setPage(value)}
            onRowsPerPageChange={event => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
            onAdd={openCreate}
          />
        )}
      </Card>
      <TaskFormDrawer
        open={formOpen}
        task={editing}
        options={fixedProjectId ? { ...options, projects: options.projects.filter(project => project.id === fixedProjectId) } : options}
        defaultProjectId={fixedProjectId}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
      />
      <TaskDetailModal
        open={Boolean(detailId)}
        taskId={detailId}
        locale={locale}
        dictionary={dictionary}
        canManage={canManage}
        canUpdate={canUpdate}
        refreshKey={refreshKey}
        onClose={() => setDetailId(null)}
        onEdit={task => {
          setDetailId(null)
          openEdit(task)
        }}
        onLogHours={task => {
          setDetailId(null)
          setHoursTask(task)
        }}
      />
      <TaskHoursDialog
        open={Boolean(hoursTask)}
        task={hoursTask}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setHoursTask(null)}
        onSaved={refresh}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.delete.title}
        description={dictionary.delete.description}
        itemName={deleteTarget?.title}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={deleting}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default TasksView
