'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { toast } from 'sonner'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import {
  getAvailableStaffUsers,
  getStaffList,
  getStaffStats,
  updateStaffStatus
} from '@/actions/hrm/staff'
import { getInitials } from '@/utils/getInitials'

import StaffDetailModal from './StaffDetailModal'
import StaffDrawer from './StaffDrawer'
import StaffStatsCards from './StaffStatsCards'

import tableStyles from '@core/styles/table.module.css'

const columnHelper = createColumnHelper()
const STATUS_COLORS = { ACTIVE: 'success', INACTIVE: 'secondary', TERMINATED: 'error' }
const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) =>
  new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value))

const formatCurrency = (value, locale) =>
  new Intl.NumberFormat(localeMap[locale] || 'en-US', {
    style: 'currency',
    currency: 'AFN',
    maximumFractionDigits: 2
  }).format(Number(value || 0))

const StaffListTable = ({
  initialResult,
  initialStats,
  initialUsers,
  initialError,
  canCreate,
  canUpdate,
  locale,
  dictionary
}) => {
  const [staff, setStaff] = useState(initialResult.staff)
  const [stats, setStats] = useState(initialStats)
  const [users, setUsers] = useState(initialUsers)
  const [positions, setPositions] = useState(initialResult.positions || [])
  const [totalCount, setTotalCount] = useState(initialResult.totalCount)
  const [page, setPage] = useState(Math.max(0, initialResult.page - 1))
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyStaffId, setBusyStaffId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [detailStaffId, setDetailStaffId] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    let active = true

    const loadStaff = async () => {
      setLoading(true)

      try {
        const result = await getStaffList({
          page: page + 1,
          limit: rowsPerPage,
          search,
          status,
          position,
          locale
        })

        if (!active) return

        if (!result.success) {
          toast.error(result.error)

          return
        }

        setStaff(result.data.staff)
        setTotalCount(result.data.totalCount)
        setPositions(result.data.positions)
      } catch {
        if (active) toast.error(dictionary.messages.loadFailed)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadStaff()

    return () => {
      active = false
    }
  }, [dictionary.messages.loadFailed, locale, page, position, rowsPerPage, search, status])

  const refreshData = useCallback(async () => {
    setLoading(true)

    try {
      const [listResult, statsResult, usersResult] = await Promise.all([
        getStaffList({ page: page + 1, limit: rowsPerPage, search, status, position, locale }),
        getStaffStats({ locale }),
        canCreate || canUpdate ? getAvailableStaffUsers({ locale }) : Promise.resolve({ success: true, data: users })
      ])

      if (listResult.success) {
        setStaff(listResult.data.staff)
        setTotalCount(listResult.data.totalCount)
        setPositions(listResult.data.positions)
      } else {
        toast.error(listResult.error)
      }

      if (statsResult.success) setStats(statsResult.data)
      if (usersResult.success) setUsers(usersResult.data)
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setLoading(false)
    }
  }, [canCreate, canUpdate, dictionary.messages.operationFailed, locale, page, position, rowsPerPage, search, status, users])

  const openCreateDrawer = () => {
    setEditingStaff(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = useCallback(selectedStaff => {
    setEditingStaff(selectedStaff)
    setDrawerOpen(true)
  }, [])

  const handleStatusChange = useCallback(async (staffId, nextStatus) => {
    setBusyStaffId(staffId)

    try {
      const result = await updateStaffStatus(staffId, nextStatus, { locale })

      if (!result.success) {
        toast.error(result.error)

        return
      }

      toast.success(result.message)
      await refreshData()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyStaffId(null)
    }
  }, [dictionary.messages.operationFailed, locale, refreshData])

  const columns = useMemo(
    () => [
      columnHelper.accessor(row => row.full_name, {
        id: 'staff',
        header: dictionary.table.staff,
        cell: ({ row }) => {
          const employee = row.original

          return (
            <div className='flex min-is-[250px] items-center gap-3'>
              <CustomAvatar src={employee.user?.image || undefined} skin='light' color='primary' size={38}>
                {!employee.user?.image && getInitials(employee.full_name)}
              </CustomAvatar>
              <div className='flex min-is-0 flex-col'>
                <Typography color='text.primary' className='truncate font-medium'>
                  {employee.full_name}
                </Typography>
                <Typography variant='body2' color='text.secondary' className='truncate'>
                  {employee.email}
                </Typography>
              </div>
            </div>
          )
        }
      }),
      columnHelper.accessor('position', { header: dictionary.table.position }),
      columnHelper.accessor('phone', { header: dictionary.table.phone }),
      columnHelper.accessor('join_date', {
        header: dictionary.table.joinDate,
        cell: info => formatDate(info.getValue(), locale)
      }),
      columnHelper.accessor('salary', {
        header: dictionary.table.salary,
        cell: info => formatCurrency(info.getValue(), locale)
      }),
      columnHelper.accessor('status', {
        header: dictionary.table.status,
        cell: info => (
          <Chip
            size='small'
            variant='tonal'
            color={STATUS_COLORS[info.getValue()] || 'default'}
            label={dictionary.status[info.getValue()] || info.getValue()}
          />
        )
      }),
      columnHelper.display({
        id: 'actions',
        header: dictionary.table.actions,
        cell: ({ row }) => {
          const employee = row.original

          return (
            <div className='flex min-is-[220px] items-center gap-1'>
              <Tooltip title={dictionary.actions.view}>
                <IconButton onClick={() => setDetailStaffId(employee.id)}>
                  <i className='tabler-eye' />
                </IconButton>
              </Tooltip>
              {canUpdate && (
                <Tooltip title={dictionary.actions.edit}>
                  <IconButton onClick={() => openEditDrawer(employee)}>
                    <i className='tabler-edit' />
                  </IconButton>
                </Tooltip>
              )}
              <CustomTextField
                select
                value={employee.status}
                onChange={event => handleStatusChange(employee.id, event.target.value)}
                disabled={!canUpdate || busyStaffId === employee.id}
                aria-label={dictionary.actions.changeStatus}
                className='is-[135px]'
              >
                {['ACTIVE', 'INACTIVE', 'TERMINATED'].map(statusValue => (
                  <MenuItem key={statusValue} value={statusValue}>
                    {dictionary.status[statusValue]}
                  </MenuItem>
                ))}
              </CustomTextField>
            </div>
          )
        }
      })
    ],
    [busyStaffId, canUpdate, dictionary, handleStatusChange, locale, openEditDrawer]
  )

  const table = useReactTable({
    data: staff,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(totalCount / rowsPerPage))
  })

  return (
    <div className='flex flex-col gap-6'>
      <StaffStatsCards stats={stats} dictionary={dictionary} />

      {initialError && <Alert severity='error'>{initialError}</Alert>}

      <Card>
        <CardHeader title={dictionary.title} subheader={dictionary.description} />
        <CardContent className='border-bs border-divider'>
          <div className='mt-5 flex flex-wrap items-end gap-2 sm:justify-between'>
            <CustomTextField
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              label={dictionary.filters.search}
              placeholder={dictionary.filters.searchPlaceholder}
              className='is-full sm:is-[260px]'
              slotProps={{ input: { startAdornment: <i className='tabler-search me-2 text-textSecondary' /> } }}
            />
            <CustomTextField
              select
              value={status}
              onChange={event => {
                setStatus(event.target.value)
                setPage(0)
              }}
              label={dictionary.filters.status}
              className='is-full sm:is-[180px]'
            >
              <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
              {['ACTIVE', 'INACTIVE', 'TERMINATED'].map(statusValue => (
                <MenuItem key={statusValue} value={statusValue}>
                  {dictionary.status[statusValue]}
                </MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              select
              value={position}
              onChange={event => {
                setPosition(event.target.value)
                setPage(0)
              }}
              label={dictionary.filters.position}
              className='is-full sm:is-[220px]'
            >
              <MenuItem value=''>{dictionary.filters.allPositions}</MenuItem>
              {positions.map(positionValue => (
                <MenuItem key={positionValue} value={positionValue}>
                  {positionValue}
                </MenuItem>
              ))}
            </CustomTextField>
            {canCreate && (
              <Button
                variant='contained'
                startIcon={<i className='tabler-user-plus' />}
                onClick={openCreateDrawer}
                className='is-full sm:ms-auto sm:is-auto'
              >
                {dictionary.actions.add}
              </Button>
            )}
          </div>
        </CardContent>

        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={columns.length} />
              ) : table.getRowModel().rows.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={columns.length}
                  icon='tabler-users-plus'
                  title={dictionary.table.noResultsTitle}
                  description={dictionary.table.noResultsDescription}
                  actionLabel={canCreate ? dictionary.actions.addFirst : null}
                  onAction={canCreate ? openCreateDrawer : null}
                />
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DashboardTablePagination
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          rowsPerPageLabel={dictionary.table.rowsPerPage}
          ofLabel={dictionary.table.of}
        />
      </Card>

      <StaffDrawer
        open={drawerOpen}
        staff={editingStaff}
        users={users}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setDrawerOpen(false)}
        onSaved={refreshData}
      />

      <StaffDetailModal
        open={Boolean(detailStaffId)}
        staffId={detailStaffId}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setDetailStaffId(null)}
      />
    </div>
  )
}

export default StaffListTable
