'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import QuickContact from '@/components/common/QuickContact'
import UserAvatar from '@/components/common/UserAvatar'
import ConfirmationDeleteModal from '@/components/dialogs/ConfirmationDeleteModal'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import NativeDateTimeInput from '@/components/inputs/NativeDateTimeInput'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { formatStatusLabel } from '@/utils/formatStatusLabel'
import { EMPTY_TABLE_CELL, formatTableCellValue } from '@/libs/tableCell'

import AttendanceDrawer from './AttendanceDrawer'
import AttendanceStatsCards from './AttendanceStatsCards'
import TimesheetDetailDialog from './TimesheetDetailDialog'
import TimesheetPrintModal from './TimesheetPrintModal'

import tableStyles from '@core/styles/table.module.css'

const EMPTY_DATA = {
  records: [],
  unmarkedStaff: [],
  attendanceStaff: [],
  totalCount: 0,
  page: 1,
  totalPages: 1,
  guard: { blocked: false, isFuture: false, payrollLocked: false },
  summary: { total_present: 0, total_absent: 0, total_leave: 0, unmarked_count: 0 }
}

const STATUS_COLORS = { PRESENT: 'success', ABSENT: 'error', LEAVE: 'info' }
const getStatusBadgeColor = status => (status === 'LEAVE_PAID' ? 'primary' : 'secondary')
const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const shiftDate = (date, offset) => {
  const value = new Date(`${date}T12:00:00.000Z`)

  value.setUTCDate(value.getUTCDate() + offset)

  return value.toISOString().slice(0, 10)
}

const formatDate = (value, locale) =>
  new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00.000Z`)
  )

const escapeCsv = value => `"${String(value ?? '').replaceAll('"', '""')}"`

const TimesheetsView = ({
  initialDate,
  canWrite,
  canDelete,
  canOverridePayrollLock,
  defaultWorkHours,
  printSetup,
  locale,
  dictionary
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [printData, setPrintData] = useState(null)
  const [printLoadingId, setPrintLoadingId] = useState(null)
  const [printSummaryLoading, setPrintSummaryLoading] = useState(false)
  const [payrollOverrideEnabled, setPayrollOverrideEnabled] = useState(false)

  const changeDate = nextDate => {
    setSelectedDate(nextDate)
    setPage(0)
    setDrawerOpen(false)
    setPayrollOverrideEnabled(false)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        date: selectedDate,
        locale,
        page: String(page + 1),
        limit: String(rowsPerPage)
      })

      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/hrm/timesheets?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || dictionary.messages.loadFailed)

        return
      }

      setData(result.data)
    } catch {
      setError(dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [dictionary.messages.loadFailed, locale, page, rowsPerPage, search, selectedDate, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const openCreate = () => {
    setPage(0)
    setDrawerOpen(true)
  }

  const payrollOverrideActive = Boolean(canOverridePayrollLock && data.guard?.payrollLocked && payrollOverrideEnabled)

  const effectiveGuard = {
    ...data.guard,
    payrollOverride: payrollOverrideActive,
    blocked: Boolean(data.guard?.isFuture || (data.guard?.payrollLocked && !payrollOverrideActive))
  }

  const attendanceBlocked = loading || effectiveGuard.blocked

  const attendanceBlockedMessage = data.guard?.isFuture
    ? dictionary.messages.futureDateBlocked
    : data.guard?.payrollLocked && !canOverridePayrollLock
      ? dictionary.messages.payrollLocked
      : ''

  const confirmDelete = async () => {
    if (!deleteTarget) return

    setDeleteLoading(true)

    try {
      const params = new URLSearchParams({ locale })

      if (payrollOverrideActive) params.set('payroll_override', 'true')

      const response = await fetch(`/api/hrm/timesheets/${deleteTarget.id}?${params.toString()}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok || !result.success) toast.error(result.error || dictionary.messages.operationFailed)
      else {
        toast.success(result.message)
        setDeleteTarget(null)
        await loadData()
      }
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setDeleteLoading(false)
    }
  }

  const exportCsv = () => {
    const rows = [
      dictionary.export.columns,
      ...data.records.map(record => [
        record.staff.full_name,
        record.staff.position,
        dictionary.status[record.status],
        record.check_in_time || '',
        record.check_out_time || '',
        record.hours_worked || '',
        record.notes || ''
      ])
    ]

    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')

    link.href = url
    link.download = `attendance-${selectedDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const printStaffTimecard = async record => {
    const [year, month] = selectedDate.split('-')

    setPrintLoadingId(record.id)

    try {
      const params = new URLSearchParams({
        date: selectedDate,
        month: String(Number(month)),
        year,
        staff_id: record.staff_id,
        locale,
        page: '1',
        limit: '100'
      })

      const response = await fetch(`/api/hrm/timesheets?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || dictionary.messages.loadFailed)

        return
      }

      setPrintData({ staff: record.staff, records: result.data.records, period: `${year}-${month}` })
    } catch {
      toast.error(dictionary.messages.loadFailed)
    } finally {
      setPrintLoadingId(null)
    }
  }

  const printSelectedDateSummary = async () => {
    setPrintSummaryLoading(true)

    try {
      const createParams = pageNumber => {
        const params = new URLSearchParams({
          date: selectedDate,
          locale,
          page: String(pageNumber),
          limit: '100'
        })

        if (search) params.set('search', search)
        if (statusFilter) params.set('status', statusFilter)

        return params
      }

      const response = await fetch(`/api/hrm/timesheets?${createParams(1).toString()}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || dictionary.messages.loadFailed)

        return
      }

      const remainingPages = Array.from(
        { length: Math.max(0, Number(result.data.totalPages || 1) - 1) },
        (_, index) => index + 2
      )

      const remainingResults = await Promise.all(
        remainingPages.map(async pageNumber => {
          const pageResponse = await fetch(`/api/hrm/timesheets?${createParams(pageNumber).toString()}`, {
            cache: 'no-store'
          })

          const pageResult = await pageResponse.json()

          if (!pageResponse.ok || !pageResult.success) throw new Error('TIMESHEET_PAGE_LOAD_FAILED')

          return pageResult.data.records
        })
      )

      setPrintData({ records: [result.data.records, ...remainingResults].flat(), reportDate: selectedDate })
    } catch {
      toast.error(dictionary.messages.loadFailed)
    } finally {
      setPrintSummaryLoading(false)
    }
  }

  const renderRecordActions = record => (
    <EntityActionsMenu
      actions={[
        {
          label: dictionary.actions.view || 'View details',
          icon: 'tabler-eye',
          onClick: () => setViewingRecord(record)
        },
        {
          label: dictionary.actions.print,
          icon: 'tabler-printer',
          disabled: printLoadingId === record.id,
          onClick: () => printStaffTimecard(record)
        },
        canWrite && {
          label: dictionary.actions.edit,
          icon: 'tabler-edit',
          disabled: attendanceBlocked,
          onClick: openCreate
        },
        canDelete && {
          label: dictionary.actions.delete,
          icon: 'tabler-trash',
          color: 'error',
          disabled: attendanceBlocked,
          onClick: () => setDeleteTarget(record)
        }
      ]}
      moreActionsLabel={dictionary.table.actions}
    />
  )

  return (
    <div className='attendance-print-report flex flex-col md:gap-4 gap-2'>
      <AttendanceStatsCards summary={data.summary} dictionary={dictionary} />

      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='no-print flex flex-wrap items-center justify-between gap-4'>
          <CustomTextField
            className='is-full sm:max-is-[300px]'
            label={dictionary.filters.search}
            placeholder={dictionary.filters.searchPlaceholder}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            slotProps={{ input: { startAdornment: <i className='tabler-search text-textSecondary' /> } }}
          />
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:justify-end'>
            <TableFiltersPopover
              activeCount={
                Number(Boolean(searchInput.trim())) +
                Number(Boolean(statusFilter)) +
                Number(selectedDate !== initialDate)
              }
              locale={locale}
              onReset={() => {
                setSearchInput('')
                setSearch('')
                setStatusFilter('')
                changeDate(initialDate)
              }}
            >
              <div className='flex items-end gap-2'>
                <Tooltip title={dictionary.date.previous}>
                  <IconButton
                    aria-label={dictionary.date.previous}
                    onClick={() => changeDate(shiftDate(selectedDate, -1))}
                  >
                    <i className='tabler-chevron-left' />
                  </IconButton>
                </Tooltip>
                <NativeDateTimeInput
                  locale={locale}
                  label={dictionary.date.date}
                  value={selectedDate}
                  className='is-full'
                  slotProps={{ htmlInput: { max: initialDate }, inputLabel: { shrink: true } }}
                  onChange={event => changeDate(event.target.value)}
                />
                <Tooltip title={dictionary.date.next}>
                  <IconButton
                    aria-label={dictionary.date.next}
                    disabled={selectedDate >= initialDate}
                    onClick={() => changeDate(shiftDate(selectedDate, 1))}
                  >
                    <i className='tabler-chevron-right' />
                  </IconButton>
                </Tooltip>
              </div>
              <Button variant='tonal' onClick={() => changeDate(initialDate)}>
                {dictionary.date.today}
              </Button>
              <CustomTextField
                select
                className='is-full'
                label={dictionary.filters.status}
                value={statusFilter}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected => (selected ? dictionary.status[selected] : dictionary.filters.allStatuses)
                  }
                }}
                onChange={event => {
                  setStatusFilter(event.target.value)
                  setPage(0)
                }}
              >
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
                {Object.keys(STATUS_COLORS).map(status => (
                  <MenuItem key={status} value={status}>
                    {dictionary.status[status]}
                  </MenuItem>
                ))}
              </CustomTextField>
            </TableFiltersPopover>
            <Tooltip title={dictionary.actions.export} arrow>
              <Button variant='tonal' startIcon={<i className='tabler-file-download' />} onClick={exportCsv}>
                <span>{dictionary.actions.export}</span>
              </Button>
            </Tooltip>
            <Tooltip title={dictionary.actions.print} arrow>
              <Button
                variant='tonal'
                startIcon={<i className='tabler-printer' />}
                disabled={printSummaryLoading}
                onClick={printSelectedDateSummary}
              >
                <span>{dictionary.actions.print}</span>
              </Button>
            </Tooltip>
            {canWrite && (
              <Tooltip title={dictionary.actions.mark} arrow>
                <Button
                  variant='contained'
                  startIcon={<i className='tabler-users' />}
                  onClick={openCreate}
                  disabled={attendanceBlocked || data.attendanceStaff.length === 0}
                >
                  <span>{dictionary.actions.mark}</span>
                </Button>
              </Tooltip>
            )}
          </div>
        </CardContent>
        {error && <Alert severity='error'>{error}</Alert>}
        {attendanceBlockedMessage && <Alert severity='warning'>{attendanceBlockedMessage}</Alert>}
        {data.guard?.payrollLocked && canOverridePayrollLock && (
          <Alert
            severity={payrollOverrideActive ? 'success' : 'info'}
            icon={<i className={payrollOverrideActive ? 'tabler-lock-open' : 'tabler-lock'} />}
            action={
              <Button
                color='inherit'
                size='small'
                variant='outlined'
                onClick={() => setPayrollOverrideEnabled(current => !current)}
              >
                {payrollOverrideActive
                  ? dictionary.actions.lockAttendance || 'Disable Force Edit'
                  : dictionary.actions.unlockAttendance || 'Unlock Attendance for Edit'}
              </Button>
            }
          >
            {payrollOverrideActive
              ? dictionary.messages.payrollOverrideActive ||
                'Administrative override is active for this payroll period.'
              : dictionary.messages.payrollLockedAdmin ||
                'Payroll for this month has been finalized. Unlock attendance only for an authorized correction.'}
          </Alert>
        )}
        <ResponsiveDataTable
          mobileRows={data.records}
          loading={loading}
          getMobileRowId={record => record.id}
          renderMobilePrimary={record => (
            <div className='flex min-is-0 items-center gap-3'>
              <UserAvatar user={record.staff} size={40} />
              <div className='min-is-0'>
                <Typography color='text.primary' className='truncate font-medium'>
                  {record.staff.full_name}
                </Typography>
                <Typography variant='body2' color='text.secondary' className='truncate'>
                  <QuickContact table email={record.staff.email}>
                    {record.staff.email}
                  </QuickContact>
                </Typography>
              </div>
            </div>
          )}
          renderMobileStatus={record => (
            <Chip
              size='small'
              variant='tonal'
              color={getStatusBadgeColor(record.status)}
              label={formatStatusLabel(record.status, dictionary.status[record.status])}
            />
          )}
          renderMobileActions={renderRecordActions}
          mobileMetadata={[
            { id: 'position', label: dictionary.fields.position, render: record => record.staff.position },
            {
              id: 'check-in',
              label: dictionary.fields.checkIn,
              render: record => formatTableCellValue(record.check_in_time)
            },
            {
              id: 'check-out',
              label: dictionary.fields.checkOut,
              render: record => formatTableCellValue(record.check_out_time)
            },
            {
              id: 'hours',
              label: dictionary.fields.hours,
              render: record =>
                record.hours_worked
                  ? `${Number(record.hours_worked).toFixed(2)} ${dictionary.hoursShort}`
                  : EMPTY_TABLE_CELL
            },
            { id: 'notes', label: dictionary.fields.notes, render: record => formatTableCellValue(record.notes) }
          ]}
          emptyState={{
            icon: 'tabler-calendar-time',
            title: dictionary.table.emptyTitle,
            description: dictionary.table.emptyDescription,
            actionLabel:
              canWrite && !attendanceBlocked && data.attendanceStaff.length > 0 ? dictionary.actions.mark : undefined,
            onAction: canWrite && !attendanceBlocked && data.attendanceStaff.length > 0 ? openCreate : undefined
          }}
          onRowClick={record => setViewingRecord(record)}
        >
          <div className='no-scrollbar overflow-x-auto scroll-smooth'>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>{dictionary.fields.staff}</th>
                  <th>{dictionary.fields.position}</th>
                  <th>{dictionary.fields.status}</th>
                  <th>{dictionary.fields.checkIn}</th>
                  <th>{dictionary.fields.checkOut}</th>
                  <th>{dictionary.fields.hours}</th>
                  <th>{dictionary.fields.notes}</th>
                  <th className='no-print text-end'>{dictionary.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeletonRows columns={8} />
                ) : data.records.length === 0 ? (
                  <TableEmptyStateRow
                    colSpan={8}
                    icon='tabler-calendar-time'
                    title={dictionary.table.emptyTitle}
                    description={dictionary.table.emptyDescription}
                    actionLabel={
                      canWrite && !attendanceBlocked && data.attendanceStaff.length > 0
                        ? dictionary.actions.mark
                        : undefined
                    }
                    onAction={
                      canWrite && !attendanceBlocked && data.attendanceStaff.length > 0 ? openCreate : undefined
                    }
                  />
                ) : (
                  data.records.map(record => (
                    <tr
                      key={record.id}
                      className='cursor-pointer'
                      onClick={event => {
                        if (
                          !event.target.closest(
                            'button, a, input, select, textarea, [role="button"], [data-row-action]'
                          )
                        )
                          setViewingRecord(record)
                      }}
                    >
                      <td>
                        <div className='flex min-is-[250px] items-center gap-3'>
                          <UserAvatar user={record.staff} size={40} />
                          <div className='flex min-is-0 flex-col'>
                            <Typography color='text.primary' className='font-medium'>
                              {record.staff.full_name}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              <QuickContact table email={record.staff.email}>
                                {record.staff.email}
                              </QuickContact>
                            </Typography>
                          </div>
                        </div>
                      </td>
                      <td>{record.staff.position}</td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={getStatusBadgeColor(record.status)}
                          label={formatStatusLabel(record.status, dictionary.status[record.status])}
                        />
                      </td>
                      <td>{formatTableCellValue(record.check_in_time)}</td>
                      <td>{formatTableCellValue(record.check_out_time)}</td>
                      <td>
                        {record.hours_worked
                          ? `${Number(record.hours_worked).toFixed(2)} ${dictionary.hoursShort}`
                          : EMPTY_TABLE_CELL}
                      </td>
                      <td>
                        {record.notes ? (
                          <Tooltip title={record.notes} arrow>
                            <Typography variant='body2' className='max-is-[180px] truncate'>
                              {record.notes}
                            </Typography>
                          </Tooltip>
                        ) : (
                          EMPTY_TABLE_CELL
                        )}
                      </td>
                      <td className='no-print text-end'>{renderRecordActions(record)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ResponsiveDataTable>
        <div className='no-print'>
          <DashboardTablePagination
            count={data.totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            rowsPerPageLabel={dictionary.table.rowsPerPage}
            ofLabel={dictionary.table.of}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={event => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
          />
        </div>
      </Card>

      <AttendanceDrawer
        open={drawerOpen}
        date={selectedDate}
        attendanceStaff={data.attendanceStaff}
        defaultWorkHours={defaultWorkHours}
        guard={effectiveGuard}
        loading={loading}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setDrawerOpen(false)}
        onSaved={loadData}
      />
      <TimesheetDetailDialog
        open={Boolean(viewingRecord)}
        record={viewingRecord}
        dictionary={dictionary}
        onClose={() => setViewingRecord(null)}
      />
      <ConfirmationDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.messages.deleteTitle}
        description={dictionary.messages.deleteDescription}
        itemName={deleteTarget?.staff.full_name}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
      <TimesheetPrintModal
        open={Boolean(printData)}
        {...printData}
        locale={locale}
        dictionary={dictionary}
        setup={printSetup}
        onClose={() => setPrintData(null)}
      />
    </div>
  )
}

export default TimesheetsView
