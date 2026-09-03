'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import UserAvatar from '@/components/common/UserAvatar'
import ConfirmationDeleteModal from '@/components/dialogs/ConfirmationDeleteModal'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { formatStatusLabel } from '@/utils/formatStatusLabel'

import LeaveStatsCards from './LeaveStatsCards'
import StaffLeaveDrawer from './StaffLeaveDrawer'
import LeaveDetailDialog from './LeaveDetailDialog'

import tableStyles from '@core/styles/table.module.css'

const EMPTY_DATA = {
  leaves: [],
  totalCount: 0,
  page: 1,
  totalPages: 1,
  options: { statuses: [], leaveTypes: [], staff: [], holidays: [] },
  summary: { pending: 0, onLeaveToday: 0, monthlyDays: 0 },
  currentStaffId: null,
  canManage: false
}

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }
const STATUS_COLORS = { APPROVED: 'success', REJECTED: 'error', PENDING: 'warning' }

const formatDate = (value, locale) =>
  new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00.000Z`)
  )

const getInitials = staff =>
  `${staff?.first_name?.charAt(0) || ''}${staff?.last_name?.charAt(0) || ''}`.toUpperCase() || '?'

const StaffLeavesView = ({ locale, dictionary }) => {
  const [data, setData] = useState(EMPTY_DATA)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [staffId, setStaffId] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [statusId, setStatusId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingLeave, setEditingLeave] = useState(null)
  const [viewingLeave, setViewingLeave] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadLeaves = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(rowsPerPage), locale })

      if (search) params.set('search', search)
      if (staffId) params.set('staff_id', staffId)
      if (leaveTypeId) params.set('leave_type_id', leaveTypeId)
      if (statusId) params.set('status_id', statusId)

      const response = await fetch(`/api/hrm/leaves?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || dictionary.messages.loadFailed)

        return
      }

      setData(result.data)
    } catch {
      toast.error(dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [dictionary.messages.loadFailed, leaveTypeId, locale, page, rowsPerPage, search, staffId, statusId])

  useEffect(() => {
    loadLeaves()
  }, [loadLeaves])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const openCreate = () => {
    setPage(0)
    setEditingLeave(null)
    setDrawerOpen(true)
  }

  const openEdit = leave => {
    setEditingLeave(leave)
    setDrawerOpen(true)
  }

  const updateStatus = async (leave, status) => {
    setBusyId(leave.id)

    try {
      const response = await fetch(`/api/hrm/leaves/${leave.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, locale })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || dictionary.messages.operationFailed)

        return
      }

      toast.success(result.message)
      await loadLeaves()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  const deleteLeave = async () => {
    if (!deleteTarget) return

    setBusyId(deleteTarget.id)

    try {
      const response = await fetch(`/api/hrm/leaves/${deleteTarget.id}?locale=${locale}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || dictionary.messages.operationFailed)

        return
      }

      toast.success(result.message)
      setDeleteTarget(null)
      await loadLeaves()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  const canCreate = data.canManage || Boolean(data.currentStaffId)

  const renderLeaveActions = leave => {
    const isPending = leave.status.value === 'PENDING'
    const canEditOwnPending = leave.staff_id === data.currentStaffId && isPending
    const canModify = data.canManage || canEditOwnPending

    return (
      <EntityActionsMenu
        actions={[
          {
            label: dictionary.actions.view || 'View details',
            icon: 'tabler-eye',
            onClick: () => setViewingLeave(leave)
          },
          data.canManage &&
            isPending && {
              label: dictionary.actions.approve,
              icon: 'tabler-check',
              disabled: busyId === leave.id,
              onClick: () => updateStatus(leave, 'APPROVED')
            },
          data.canManage &&
            isPending && {
              label: dictionary.actions.reject,
              icon: 'tabler-x',
              color: 'error',
              disabled: busyId === leave.id,
              onClick: () => updateStatus(leave, 'REJECTED')
            },
          canModify && {
            label: dictionary.actions.edit,
            icon: 'tabler-edit',
            disabled: busyId === leave.id,
            onClick: () => openEdit(leave)
          },
          canModify && {
            label: dictionary.actions.delete,
            icon: 'tabler-trash',
            color: 'error',
            disabled: busyId === leave.id,
            onClick: () => setDeleteTarget(leave)
          }
        ]}
        moreActionsLabel={dictionary.table.actions}
      />
    )
  }

  return (
    <div className='flex flex-col md:gap-4 gap-2'>
      <LeaveStatsCards summary={data.summary} dictionary={dictionary} />

      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <CustomTextField
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            label={dictionary.filters.search}
            placeholder={dictionary.filters.searchPlaceholder}
            className='is-full sm:is-[380px]'
            slotProps={{ input: { startAdornment: <i className='tabler-search text-textSecondary' /> } }}
          />
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
            <TableFiltersPopover
              activeCount={
                Number(Boolean(searchInput.trim())) +
                Number(Boolean(staffId)) +
                Number(Boolean(leaveTypeId)) +
                Number(Boolean(statusId))
              }
              locale={locale}
              onReset={() => {
                setSearchInput('')
                setSearch('')
                setStaffId('')
                setLeaveTypeId('')
                setStatusId('')
                setPage(0)
              }}
            >
              {data.canManage && (
                <CustomTextField
                  select
                  label={dictionary.filters.staff}
                  value={staffId}
                  onChange={event => {
                    setStaffId(event.target.value)
                    setPage(0)
                  }}
                  className='is-full'
                  slotProps={{
                    select: {
                      displayEmpty: true,
                      renderValue: selected =>
                        data.options.staff.find(staff => staff.id === selected)?.full_name ||
                        dictionary.filters.allStaff
                    }
                  }}
                >
                  <MenuItem value=''>{dictionary.filters.allStaff}</MenuItem>
                  {data.options.staff.map(staff => (
                    <MenuItem key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
              <CustomTextField
                select
                label={dictionary.filters.leaveType}
                value={leaveTypeId}
                onChange={event => {
                  setLeaveTypeId(event.target.value)
                  setPage(0)
                }}
                className='is-full'
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected =>
                      data.options.leaveTypes.find(type => type.id === selected)?.label ||
                      dictionary.filters.allLeaveTypes
                  }
                }}
              >
                <MenuItem value=''>{dictionary.filters.allLeaveTypes}</MenuItem>
                {data.options.leaveTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.label}
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
                className='is-full'
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected => {
                      const status = data.options.statuses.find(item => item.id === selected)

                      return status ? dictionary.status[status.value] || status.label : dictionary.filters.allStatuses
                    }
                  }
                }}
              >
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
                {data.options.statuses.map(status => (
                  <MenuItem key={status.id} value={status.id}>
                    {formatStatusLabel(status.value, dictionary.status[status.value] || status.label)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </TableFiltersPopover>
            {canCreate && (
              <Tooltip title={dictionary.actions.requestLeave} arrow>
                <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
                  <span>{dictionary.actions.requestLeave}</span>
                </Button>
              </Tooltip>
            )}
          </div>
        </CardContent>

        <ResponsiveDataTable
          mobileRows={data.leaves}
          loading={loading}
          getMobileRowId={leave => leave.id}
          renderMobilePrimary={leave => (
            <div className='flex min-is-0 items-center gap-3'>
              <UserAvatar user={leave.staff} size={40} />
              <div className='min-is-0'>
                <Typography color='text.primary' className='truncate font-medium'>
                  {leave.staff.full_name}
                </Typography>
                <Typography variant='body2' color='text.secondary' className='truncate'>
                  {leave.staff.position}
                </Typography>
              </div>
            </div>
          )}
          renderMobileStatus={leave => (
            <Chip
              size='small'
              variant='tonal'
              color={STATUS_COLORS[leave.status.value] || 'default'}
              label={formatStatusLabel(leave.status.value, dictionary.status[leave.status.value] || leave.status.label)}
            />
          )}
          renderMobileActions={renderLeaveActions}
          mobileMetadata={[
            { id: 'leave-type', label: dictionary.table.leaveType, render: leave => leave.leave_type.label },
            {
              id: 'duration',
              label: dictionary.table.duration,
              render: leave => `${formatDate(leave.start_date, locale)} â€” ${formatDate(leave.end_date, locale)}`
            },
            {
              id: 'days',
              label: dictionary.table.duration,
              render: leave => dictionary.table.days.replace('{count}', leave.total_days)
            },
            { id: 'reason', label: dictionary.table.reason, render: leave => leave.reason || 'â€”' },
            {
              id: 'approved-by',
              label: dictionary.table.approvedBy,
              render: leave => leave.approved_by?.full_name || 'â€”'
            }
          ]}
          emptyState={{
            icon: 'tabler-calendar-off',
            title: dictionary.empty.title,
            description: dictionary.empty.description,
            actionLabel: canCreate ? dictionary.empty.action : undefined,
            onAction: canCreate ? openCreate : undefined
          }}
          onRowClick={leave => setViewingLeave(leave)}
        >
          <div className='no-scrollbar overflow-x-auto scroll-smooth'>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>{dictionary.table.staff}</th>
                  <th>{dictionary.table.leaveType}</th>
                  <th>{dictionary.table.duration}</th>
                  <th>{dictionary.table.reason}</th>
                  <th>{dictionary.table.status}</th>
                  <th>{dictionary.table.approvedBy}</th>
                  <th className='text-end'>{dictionary.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeletonRows columns={7} rows={5} />
                ) : data.leaves.length === 0 ? (
                  <TableEmptyStateRow
                    colSpan={7}
                    icon='tabler-calendar-off'
                    title={dictionary.empty.title}
                    description={dictionary.empty.description}
                    actionLabel={canCreate ? dictionary.empty.action : null}
                    onAction={canCreate ? openCreate : null}
                  />
                ) : (
                  data.leaves.map(leave => (
                    <tr
                      key={leave.id}
                      className='cursor-pointer'
                      onClick={event => {
                        if (
                          !event.target.closest(
                            'button, a, input, select, textarea, [role="button"], [data-row-action]'
                          )
                        )
                          setViewingLeave(leave)
                      }}
                    >
                      <td>
                        <div className='flex min-is-[220px] items-center gap-3'>
                          <UserAvatar user={leave.staff} size={40} />
                          <div>
                            <Typography color='text.primary' className='font-medium'>
                              {leave.staff.full_name}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {leave.staff.position}
                            </Typography>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Typography color='text.primary'>{leave.leave_type.label}</Typography>
                      </td>
                      <td>
                        <div className='min-is-[190px]'>
                          <Typography color='text.primary'>
                            {formatDate(leave.start_date, locale)} â†’ {formatDate(leave.end_date, locale)}
                          </Typography>
                          <Chip
                            size='small'
                            variant='tonal'
                            label={dictionary.table.days.replace('{count}', leave.total_days)}
                            className='mt-1'
                          />
                        </div>
                      </td>
                      <td>
                        {leave.reason ? (
                          <Tooltip title={leave.reason} arrow>
                            <Typography color='text.secondary' className='max-is-[220px] truncate'>
                              {leave.reason}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography color='text.secondary'>â€”</Typography>
                        )}
                      </td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={STATUS_COLORS[leave.status.value] || 'default'}
                          label={formatStatusLabel(
                            leave.status.value,
                            dictionary.status[leave.status.value] || leave.status.label
                          )}
                        />
                      </td>
                      <td>{leave.approved_by?.full_name || 'â€”'}</td>
                      <td className='text-end'>{renderLeaveActions(leave)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ResponsiveDataTable>

        <DashboardTablePagination
          count={data.totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageLabel={dictionary.pagination.rowsPerPage}
          ofLabel={dictionary.pagination.of}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
        />
      </Card>

      <StaffLeaveDrawer
        open={drawerOpen}
        leave={editingLeave}
        options={data.options}
        currentStaffId={data.currentStaffId}
        canManage={data.canManage}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setDrawerOpen(false)}
        onSaved={loadLeaves}
      />
      <LeaveDetailDialog
        open={Boolean(viewingLeave)}
        leave={viewingLeave}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setViewingLeave(null)}
      />

      <ConfirmationDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.delete.title}
        description={dictionary.delete.description}
        itemName={deleteTarget?.staff?.full_name}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={busyId === deleteTarget?.id}
        onConfirm={deleteLeave}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default StaffLeavesView
