'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import QuickContact from '@/components/common/QuickContact'
import UserAvatar from '@/components/common/UserAvatar'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatStatusLabel } from '@/utils/formatStatusLabel'
import { getAvailableStaffUsers, getStaffList, getStaffStats, updateStaffStatus } from '@/actions/hrm/staff'

import StaffDetailModal from './StaffDetailModal'
import StaffDrawer from './StaffDrawer'
import StaffStatsCards from './StaffStatsCards'

const columnHelper = createColumnHelper()
const STATUS_COLORS = { ACTIVE: 'success', INACTIVE: 'secondary', TERMINATED: 'error' }
const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) =>
  new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value))

const StaffListTable = ({
  initialResult,
  initialStats,
  initialUsers,
  initialError,
  canCreate,
  canUpdate,
  baseCurrency,
  locale,
  dictionary,
  contractDictionary
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
  }, [
    canCreate,
    canUpdate,
    dictionary.messages.operationFailed,
    locale,
    page,
    position,
    rowsPerPage,
    search,
    status,
    users
  ])

  const openCreateDrawer = () => {
    setPage(0)
    setEditingStaff(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = useCallback(selectedStaff => {
    setEditingStaff(selectedStaff)
    setDrawerOpen(true)
  }, [])

  const handleStatusChange = useCallback(
    async (staffId, nextStatus) => {
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
    },
    [dictionary.messages.operationFailed, locale, refreshData]
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor(row => row.full_name, {
        id: 'staff',
        header: dictionary.table.staff,
        cell: ({ row }) => {
          const employee = row.original

          return (
            <div className='flex min-is-0 items-center gap-3'>
              <UserAvatar user={{ ...employee, image: employee.user?.image }} size={40} />
              <div className='flex min-is-0 flex-col'>
                <Typography color='text.primary' className='truncate font-medium'>
                  {employee.full_name}
                </Typography>
                <Typography variant='body2' color='text.secondary' className='truncate'>
                  <QuickContact table email={employee.email}>
                    {employee.email}
                  </QuickContact>
                </Typography>
              </div>
            </div>
          )
        }
      }),
      columnHelper.accessor('position', { header: dictionary.table.position }),
      columnHelper.accessor('phone', {
        header: dictionary.table.phone,
        cell: info => (
          <QuickContact table phone={info.getValue()}>
            {info.getValue()}
          </QuickContact>
        )
      }),
      columnHelper.accessor('join_date', {
        header: dictionary.table.joinDate,
        cell: info => formatDate(info.getValue(), locale)
      }),
      columnHelper.accessor('salary', {
        header: dictionary.table.salary,
        cell: info => (
          <DualCurrencyAmount
            amount={info.getValue()}
            amountBase={info.row.original.amount_base}
            currency={info.row.original.salary_currency || baseCurrency}
            exchangeRate={info.row.original.salary_exchange_rate}
            locale={locale}
          />
        )
      }),
      columnHelper.accessor('status', {
        header: dictionary.table.status,
        cell: info => (
          <Chip
            size='small'
            variant='tonal'
            color={STATUS_COLORS[info.getValue()] || 'default'}
            label={formatStatusLabel(info.getValue(), dictionary.status[info.getValue()])}
          />
        )
      }),
      columnHelper.display({
        id: 'actions',
        header: dictionary.table.actions,
        cell: ({ row }) => {
          const employee = row.original

          return (
            <EntityActionsMenu
              locale={locale}
              actions={[
                { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => setDetailStaffId(employee.id) },
                canUpdate && {
                  label: dictionary.actions.edit,
                  icon: 'tabler-edit',
                  onClick: () => openEditDrawer(employee)
                }
              ]}
              statusOptions={
                canUpdate
                  ? ['ACTIVE', 'INACTIVE', 'TERMINATED'].map(statusValue => ({
                      id: statusValue,
                      label: dictionary.status[statusValue]
                    }))
                  : []
              }
              currentStatus={employee.status}
              statusDisabled={busyStaffId === employee.id}
              changeStatusLabel={dictionary.actions.changeStatus}
              moreActionsLabel={dictionary.table.actions}
              onStatusChange={statusValue => handleStatusChange(employee.id, statusValue)}
            />
          )
        }
      })
    ],
    [baseCurrency, busyStaffId, canUpdate, dictionary, handleStatusChange, locale, openEditDrawer]
  )

  const table = useReactTable({
    data: staff,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(totalCount / rowsPerPage))
  })

  return (
    <div className='flex flex-col md:gap-4 gap-2'>
      <StaffStatsCards stats={stats} dictionary={dictionary} />

      {initialError && <Alert severity='error'>{initialError}</Alert>}

      <Card className='border border-divider/70 shadow-sm'>
        <CardContent>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <CustomTextField
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              label={dictionary.filters.search}
              placeholder={dictionary.filters.searchPlaceholder}
              className='is-full sm:is-[300px]'
              slotProps={{ input: { startAdornment: <i className='tabler-search text-textSecondary' /> } }}
            />
            <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
              <TableFiltersPopover
                activeCount={Number(Boolean(searchInput.trim())) + Number(Boolean(status)) + Number(Boolean(position))}
                locale={locale}
                onReset={() => {
                  setSearchInput('')
                  setSearch('')
                  setStatus('')
                  setPosition('')
                  setPage(0)
                }}
              >
                <CustomTextField
                  select
                  value={status}
                  onChange={event => {
                    setStatus(event.target.value)
                    setPage(0)
                  }}
                  label={dictionary.filters.status}
                  className='is-full'
                  slotProps={{
                    select: {
                      displayEmpty: true,
                      renderValue: selected => (selected ? dictionary.status[selected] : dictionary.filters.allStatuses)
                    }
                  }}
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
                  className='is-full'
                  slotProps={{
                    select: {
                      displayEmpty: true,
                      renderValue: selected => selected || dictionary.filters.allPositions
                    }
                  }}
                >
                  <MenuItem value=''>{dictionary.filters.allPositions}</MenuItem>
                  {positions.map(positionValue => (
                    <MenuItem key={positionValue} value={positionValue}>
                      {positionValue}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </TableFiltersPopover>
              {canCreate && (
                <Button
                  variant='contained'
                  startIcon={<i className='tabler-user-plus' />}
                  onClick={openCreateDrawer}
                  className='is-full sm:is-auto'
                >
                  {dictionary.actions.add}
                </Button>
              )}
            </div>
          </div>
        </CardContent>

        <ResponsiveDataTable
          table={table}
          loading={loading}
          onRowClick={employee => setDetailStaffId(employee.id)}
          primaryColumnId='staff'
          statusColumnId='status'
          actionsColumnId='actions'
          emptyState={{
            icon: 'tabler-users-plus',
            title: dictionary.table.noResultsTitle,
            description: dictionary.table.noResultsDescription,
            actionLabel: canCreate ? dictionary.actions.addFirst : null,
            onAction: canCreate ? openCreateDrawer : null
          }}
        />

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
        baseCurrency={baseCurrency}
        onClose={() => setDrawerOpen(false)}
        onSaved={refreshData}
      />

      <StaffDetailModal
        open={Boolean(detailStaffId)}
        staffId={detailStaffId}
        locale={locale}
        dictionary={dictionary}
        contractDictionary={contractDictionary}
        onClose={() => setDetailStaffId(null)}
      />
    </div>
  )
}

export default StaffListTable
