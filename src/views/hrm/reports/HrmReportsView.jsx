'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import { formatCurrency } from '@/utils/formatCurrency'

import ReportStatsCards from './ReportStatsCards'
import ReportTrendChart from './ReportTrendChart'

import tableStyles from '@core/styles/table.module.css'

const REPORT_TYPES = ['payroll', 'attendance', 'leaves', 'contracts']
const PAYROLL_STATUS_COLORS = { PAID: 'success', PENDING: 'warning', DRAFT: 'secondary' }
const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }
const EMPTY_REPORT = { summary: {}, trend: [], rows: [], staff: [] }

const toInputDate = date => date.toISOString().slice(0, 10)

const getPresetRange = preset => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()

  if (preset === 'last_quarter') {
    return {
      start: toInputDate(new Date(Date.UTC(year, month - 3, 1))),
      end: toInputDate(new Date(Date.UTC(year, month, 0)))
    }
  }

  if (preset === 'year_to_date') {
    return { start: `${year}-01-01`, end: toInputDate(now) }
  }

  return {
    start: toInputDate(new Date(Date.UTC(year, month, 1))),
    end: toInputDate(new Date(Date.UTC(year, month + 1, 0)))
  }
}

const escapeCsv = value => `"${String(value ?? '').replaceAll('"', '""')}"`

const getInitials = name =>
  name
    .split(/\s+/)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

const HrmReportsView = ({ locale, dictionary, setup, generatedAt }) => {
  const initialRange = getPresetRange('this_month')
  const [reportType, setReportType] = useState('payroll')
  const [datePreset, setDatePreset] = useState('this_month')
  const [startDate, setStartDate] = useState(initialRange.start)
  const [endDate, setEndDate] = useState(initialRange.end)
  const [staffId, setStaffId] = useState('')
  const [data, setData] = useState(EMPTY_REPORT)
  const [staffOptions, setStaffOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [dataVersion, setDataVersion] = useState(0)
  const requestIdRef = useRef(0)

  const formatDate = useCallback(
    value =>
      value
        ? new Intl.DateTimeFormat(localeMap[locale] || localeMap.en, {
            dateStyle: 'medium',
            timeZone: 'UTC'
          }).format(new Date(value))
        : '—',
    [locale]
  )

  const formatMonth = useCallback(
    period =>
      new Intl.DateTimeFormat(localeMap[locale] || localeMap.en, {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(new Date(`${period}-01T00:00:00.000Z`)),
    [locale]
  )

  const formatDateTime = useCallback(
    value =>
      new Intl.DateTimeFormat(localeMap[locale] || localeMap.en, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value)),
    [locale]
  )

  const currency = useCallback(
    value => formatCurrency(value, locale, setup.currency_code || 'AFN'),
    [locale, setup.currency_code]
  )

  const loadReport = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) {
      toast.error(dictionary.messages.invalidDates)

      return
    }

    const requestId = requestIdRef.current + 1

    requestIdRef.current = requestId
    setLoading(true)
    setData(EMPTY_REPORT)

    try {
      const params = new URLSearchParams({
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        locale
      })

      if (staffId) params.set('staff_id', staffId)

      const response = await fetch(`/api/hrm/reports?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()

      if (requestId !== requestIdRef.current) return

      if (!response.ok || !result.success) {
        toast.error(result.error || dictionary.messages.loadFailed)

        return
      }

      setData(result.data)
      setStaffOptions(result.data.staff)
      setDataVersion(version => version + 1)
    } catch {
      if (requestId === requestIdRef.current) toast.error(dictionary.messages.loadFailed)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [dictionary.messages.invalidDates, dictionary.messages.loadFailed, endDate, locale, reportType, staffId, startDate])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const changePreset = value => {
    setDatePreset(value)
    setPage(0)

    if (value !== 'custom') {
      const range = getPresetRange(value)

      setStartDate(range.start)
      setEndDate(range.end)
    }
  }

  const rows = data.rows || []
  const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  const selectedStaff = staffOptions.find(staff => staff.id === staffId)
  const activeReport = dictionary.tabs[reportType]

  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= rows.length) setPage(0)
  }, [page, rows.length, rowsPerPage])

  const stats = useMemo(() => {
    const summary = data.summary || {}

    if (reportType === 'payroll') {
      return [
        { label: dictionary.kpis.baseSalary, value: currency(summary.total_base_salary), icon: 'tabler-wallet' },
        { label: dictionary.kpis.allowances, value: currency(summary.total_allowances), icon: 'tabler-circle-plus' },
        { label: dictionary.kpis.deductions, value: currency(summary.total_deductions), icon: 'tabler-circle-minus' },
        { label: dictionary.kpis.netPayout, value: currency(summary.total_net_payout), icon: 'tabler-cash-banknote' }
      ]
    }

    if (reportType === 'attendance') {
      return [
        { label: dictionary.kpis.workingDays, value: summary.total_working_days || 0, icon: 'tabler-calendar-stats' },
        { label: dictionary.kpis.presenceRate, value: `${summary.presence_rate || 0}%`, icon: 'tabler-chart-donut' },
        { label: dictionary.kpis.hoursLogged, value: Number(summary.total_hours_logged || 0).toLocaleString(), icon: 'tabler-clock-hour-4' },
        { label: dictionary.kpis.absences, value: summary.total_absences || 0, icon: 'tabler-user-off' }
      ]
    }

    if (reportType === 'leaves') {
      return [
        { label: dictionary.kpis.approvedLeaveDays, value: summary.total_leaves_taken || 0, icon: 'tabler-calendar-check' },
        { label: dictionary.kpis.pendingRequests, value: summary.pending_requests_count || 0, icon: 'tabler-hourglass' },
        { label: dictionary.kpis.leaveTypesUsed, value: summary.leave_types_used || 0, icon: 'tabler-category' }
      ]
    }

    return [
      { label: dictionary.kpis.activeContracts, value: summary.active_contracts_count || 0, icon: 'tabler-file-check' },
      { label: dictionary.kpis.expiring30, value: summary.expiring_30_days || 0, icon: 'tabler-calendar-exclamation' },
      { label: dictionary.kpis.expiring90, value: summary.expiring_60_90_days || 0, icon: 'tabler-calendar-time' },
      { label: dictionary.kpis.expiredInRange, value: summary.expired_in_range || 0, icon: 'tabler-file-off' }
    ]
  }, [currency, data.summary, dictionary.kpis, reportType])

  const chart = useMemo(() => {
    if (reportType === 'payroll') {
      return {
        type: 'line',
        categories: data.trend.map(item => formatMonth(item.period)),
        series: [
          { name: dictionary.chart.netPayout, data: data.trend.map(item => item.net_payout) },
          { name: dictionary.chart.deductions, data: data.trend.map(item => item.deductions) }
        ],
        formatter: currency
      }
    }

    if (reportType === 'attendance') {
      return {
        type: 'bar',
        categories: data.trend.map(item => formatMonth(item.period)),
        series: [
          { name: dictionary.status.PRESENT, data: data.trend.map(item => item.present) },
          { name: dictionary.status.ABSENT, data: data.trend.map(item => item.absent) },
          { name: dictionary.status.LEAVE, data: data.trend.map(item => item.leave) }
        ]
      }
    }

    if (reportType === 'leaves') {
      return {
        type: 'bar',
        categories: data.trend.map(item => item.name),
        series: [{ name: dictionary.chart.approvedDays, data: data.trend.map(item => item.value) }]
      }
    }

    return {
      type: 'bar',
      categories: data.trend.map(item => formatMonth(item.period)),
      series: [
        { name: dictionary.chart.expirations, data: data.trend.map(item => item.expirations) },
        { name: dictionary.chart.contractStarts, data: data.trend.map(item => item.starts) }
      ]
    }
  }, [currency, data.trend, dictionary.chart, dictionary.status, formatMonth, reportType])

  const csvDefinition = useMemo(() => {
    if (reportType === 'payroll') {
      return {
        headers: [dictionary.table.period, dictionary.table.staff, dictionary.table.position, dictionary.table.baseSalary, dictionary.table.allowances, dictionary.table.deductions, dictionary.table.netPayout, dictionary.table.status, dictionary.table.paymentMethod],
        values: row => [formatMonth(row.period), row.staff_name, row.position, row.base_salary, row.allowances, row.deductions, row.net_payout, dictionary.status[row.status] || row.status_label, row.payment_method || '']
      }
    }

    if (reportType === 'attendance') {
      return {
        headers: [dictionary.table.staff, dictionary.table.position, dictionary.table.present, dictionary.table.absent, dictionary.table.leave, dictionary.table.hours, dictionary.table.presenceRate],
        values: row => [row.staff_name, row.position, row.present, row.absent, row.leave, row.total_hours, `${row.presence_rate}%`]
      }
    }

    if (reportType === 'leaves') {
      return {
        headers: [dictionary.table.staff, dictionary.table.position, dictionary.table.approvedDays, dictionary.table.pending, dictionary.table.leaveBreakdown, dictionary.table.allowance, dictionary.table.remaining],
        values: row => [row.staff_name, row.position, row.approved_days, row.pending_requests, row.leave_types.map(item => `${item.name}: ${item.days}`).join('; '), dictionary.common.notConfigured, dictionary.common.notConfigured]
      }
    }

    return {
      headers: [dictionary.table.contractNumber, dictionary.table.staff, dictionary.table.position, dictionary.table.contractType, dictionary.table.endDate, dictionary.table.daysRemaining, dictionary.table.renewalStatus],
      values: row => [row.contract_number, row.staff_name, row.position, row.contract_type, formatDate(row.end_date), row.days_remaining, dictionary.status[row.renewal_status]]
    }
  }, [dictionary, formatDate, formatMonth, reportType])

  const exportCsv = () => {
    const content = [
      csvDefinition.headers.map(escapeCsv).join(','),
      ...rows.map(row => csvDefinition.values(row).map(escapeCsv).join(','))
    ].join('\r\n')

    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${reportType}_report_${startDate}_${endDate}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success(dictionary.messages.csvReady)
  }

  const staffCell = row => (
    <div className='flex min-is-[210px] items-center gap-3'>
      <Avatar variant='rounded' className='bg-primaryLighter text-primary'>{getInitials(row.staff_name)}</Avatar>
      <div>
        <Typography className='font-medium' color='text.primary'>{row.staff_name}</Typography>
        <Typography variant='body2' color='text.secondary'>{row.position}</Typography>
      </div>
    </div>
  )

  const renderTable = () => {
    if (reportType === 'payroll') {
      return (
        <table className={tableStyles.table}>
          <thead><tr><th>{dictionary.table.period}</th><th>{dictionary.table.staff}</th><th className='text-right'>{dictionary.table.baseSalary}</th><th className='text-right'>{dictionary.table.allowances}</th><th className='text-right'>{dictionary.table.deductions}</th><th className='text-right'>{dictionary.table.netPayout}</th><th>{dictionary.table.status}</th></tr></thead>
          <tbody>{loading ? <TableSkeletonRows columns={7} /> : paginatedRows.length === 0 ? <TableEmptyStateRow colSpan={7} icon='tabler-report-money' title={dictionary.empty.title} description={dictionary.empty.description} /> : paginatedRows.map(row => <tr key={row.id}><td>{formatMonth(row.period)}</td><td>{staffCell(row)}</td><td className='text-right'>{currency(row.base_salary)}</td><td className='text-right'>{currency(row.allowances)}</td><td className='text-right text-warning'>{currency(row.deductions)}</td><td className='text-right font-semibold text-success'>{currency(row.net_payout)}</td><td><Chip size='small' variant='tonal' color={PAYROLL_STATUS_COLORS[row.status] || 'default'} label={dictionary.status[row.status] || row.status_label} /></td></tr>)}</tbody>
        </table>
      )
    }

    if (reportType === 'attendance') {
      return (
        <table className={tableStyles.table}>
          <thead><tr><th>{dictionary.table.staff}</th><th className='text-right'>{dictionary.table.present}</th><th className='text-right'>{dictionary.table.absent}</th><th className='text-right'>{dictionary.table.leave}</th><th className='text-right'>{dictionary.table.hours}</th><th className='text-right'>{dictionary.table.presenceRate}</th></tr></thead>
          <tbody>{loading ? <TableSkeletonRows columns={6} /> : paginatedRows.length === 0 ? <TableEmptyStateRow colSpan={6} icon='tabler-calendar-stats' title={dictionary.empty.title} description={dictionary.empty.description} /> : paginatedRows.map(row => <tr key={row.id}><td>{staffCell(row)}</td><td className='text-right text-success'>{row.present}</td><td className='text-right text-error'>{row.absent}</td><td className='text-right text-info'>{row.leave}</td><td className='text-right'>{row.total_hours}</td><td className='text-right'><Chip size='small' variant='tonal' color={row.presence_rate >= 80 ? 'success' : row.presence_rate >= 60 ? 'warning' : 'error'} label={`${row.presence_rate}%`} /></td></tr>)}</tbody>
        </table>
      )
    }

    if (reportType === 'leaves') {
      return (
        <table className={tableStyles.table}>
          <thead><tr><th>{dictionary.table.staff}</th><th className='text-right'>{dictionary.table.approvedDays}</th><th className='text-right'>{dictionary.table.pending}</th><th>{dictionary.table.leaveBreakdown}</th><th className='text-right'>{dictionary.table.allowance}</th><th className='text-right'>{dictionary.table.remaining}</th></tr></thead>
          <tbody>{loading ? <TableSkeletonRows columns={6} /> : paginatedRows.length === 0 ? <TableEmptyStateRow colSpan={6} icon='tabler-calendar-off' title={dictionary.empty.title} description={dictionary.empty.description} /> : paginatedRows.map(row => <tr key={row.id}><td>{staffCell(row)}</td><td className='text-right font-semibold'>{row.approved_days}</td><td className='text-right'>{row.pending_requests}</td><td><div className='flex min-is-[220px] flex-wrap gap-1'>{row.leave_types.length ? row.leave_types.map(item => <Chip key={item.name} size='small' variant='tonal' label={`${item.name}: ${item.days}`} />) : '—'}</div></td><td className='text-right text-textSecondary'>{dictionary.common.notConfigured}</td><td className='text-right text-textSecondary'>{dictionary.common.notConfigured}</td></tr>)}</tbody>
        </table>
      )
    }

    return (
      <table className={tableStyles.table}>
        <thead><tr><th>{dictionary.table.contractNumber}</th><th>{dictionary.table.staff}</th><th>{dictionary.table.contractType}</th><th>{dictionary.table.endDate}</th><th className='text-right'>{dictionary.table.daysRemaining}</th><th>{dictionary.table.renewalStatus}</th></tr></thead>
        <tbody>{loading ? <TableSkeletonRows columns={6} /> : paginatedRows.length === 0 ? <TableEmptyStateRow colSpan={6} icon='tabler-file-time' title={dictionary.empty.title} description={dictionary.empty.description} /> : paginatedRows.map(row => <tr key={row.id}><td><span className='font-mono font-semibold text-primary'>{row.contract_number}</span></td><td>{staffCell(row)}</td><td>{row.contract_type}</td><td>{formatDate(row.end_date)}</td><td className='text-right font-semibold'>{row.days_remaining}</td><td><Chip size='small' variant='tonal' color={row.renewal_status === 'DUE_SOON' ? 'warning' : 'info'} label={dictionary.status[row.renewal_status]} /></td></tr>)}</tbody>
      </table>
    )
  }

  return (
    <div className='hrm-report-print flex flex-col gap-6'>
      <Card className='no-print'>
        <CardContent className='flex flex-col gap-5'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
              <Typography variant='h4'>{dictionary.title}</Typography>
              <Typography color='text.secondary'>{dictionary.description}</Typography>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button variant='tonal' color='secondary' startIcon={<i className='tabler-file-spreadsheet' />} disabled={loading || rows.length === 0} onClick={exportCsv}>{dictionary.actions.exportCsv}</Button>
              <Button variant='contained' startIcon={<i className='tabler-printer' />} disabled={loading} onClick={() => window.print()}>{dictionary.actions.print}</Button>
            </div>
          </div>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
            <div className='ms-auto flex is-full flex-wrap items-center gap-3 sm:is-auto sm:justify-end'>
            <CustomTextField select label={dictionary.filters.dateRange} value={datePreset} onChange={event => changePreset(event.target.value)} className='is-full sm:is-[210px]'>
              <MenuItem value='this_month'>{dictionary.datePresets.thisMonth}</MenuItem>
              <MenuItem value='last_quarter'>{dictionary.datePresets.lastQuarter}</MenuItem>
              <MenuItem value='year_to_date'>{dictionary.datePresets.yearToDate}</MenuItem>
              <MenuItem value='custom'>{dictionary.datePresets.custom}</MenuItem>
            </CustomTextField>
            <CustomTextField type='date' label={dictionary.filters.startDate} value={startDate} onChange={event => { setStartDate(event.target.value); setDatePreset('custom'); setPage(0) }} className='is-full sm:is-[180px]' />
            <CustomTextField type='date' label={dictionary.filters.endDate} value={endDate} onChange={event => { setEndDate(event.target.value); setDatePreset('custom'); setPage(0) }} className='is-full sm:is-[180px]' />
            <CustomTextField select label={dictionary.filters.staff} value={staffId} onChange={event => { setStaffId(event.target.value); setPage(0) }} className='is-full sm:is-[240px]' slotProps={{ select: { displayEmpty: true, renderValue: selected => staffOptions.find(staff => staff.id === selected)?.full_name || dictionary.filters.allStaff } }}>
              <MenuItem value=''>{dictionary.filters.allStaff}</MenuItem>
              {staffOptions.map(staff => <MenuItem key={staff.id} value={staff.id}>{staff.full_name}</MenuItem>)}
            </CustomTextField>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='no-print overflow-x-auto'>
        <Tabs value={reportType} variant='scrollable' scrollButtons='auto' onChange={(_, value) => { setLoading(true); setData(EMPTY_REPORT); setReportType(value); setPage(0) }}>
          {REPORT_TYPES.map(type => <Tab key={type} value={type} icon={<i className={dictionary.tabs[type].icon} />} iconPosition='start' label={dictionary.tabs[type].label} />)}
        </Tabs>
      </Card>

      <div className='report-print-header hidden border-b-2 border-black pb-5 text-black'>
        <div className='flex items-start justify-between gap-6'>
          <div>{setup.company_logo ? <img src={setup.company_logo} alt={setup.company_name} className='max-h-16 max-w-44 object-contain' /> : null}</div>
          <div className='text-right'>
            <Typography className='text-xl font-bold text-black'>{setup.company_name}</Typography>
            <Typography className='whitespace-pre-line text-sm text-black'>{setup.company_address}</Typography>
            <Typography className='text-sm text-black'>{[setup.company_phone, setup.company_email].filter(Boolean).join(' · ')}</Typography>
          </div>
        </div>
        <div className='mt-6 text-center'>
          <Typography component='h1' className='text-2xl font-bold text-black'>{activeReport.label}</Typography>
          <Typography className='text-black'>{formatDate(`${startDate}T00:00:00.000Z`)} — {formatDate(`${endDate}T00:00:00.000Z`)}</Typography>
          {selectedStaff && <Typography className='text-sm text-black'>{dictionary.filters.staff}: {selectedStaff.full_name}</Typography>}
          <Typography className='text-xs text-black'>{dictionary.print.generated}: {formatDateTime(generatedAt)}</Typography>
        </div>
      </div>

      <ReportStatsCards items={stats} loading={loading} />
      <ReportTrendChart key={`${reportType}-${dataVersion}`} title={dictionary.chart.title.replace('{report}', activeReport.label)} trend={chart.type} categories={chart.categories} series={chart.series} loading={loading} valueFormatter={chart.formatter} emptyLabel={dictionary.empty.description} />

      <Card className='report-table-card'>
        <CardContent className='flex flex-wrap items-center justify-between gap-2 border-be border-divider'>
          <div>
            <Typography variant='h5'>{activeReport.tableTitle}</Typography>
            <Typography variant='body2' color='text.secondary'>{dictionary.common.records.replace('{count}', String(rows.length))}</Typography>
          </div>
        </CardContent>
        <div className='overflow-x-auto'>{renderTable()}</div>
        <div className='no-print'>
          <DashboardTablePagination count={rows.length} page={page} rowsPerPage={rowsPerPage} rowsPerPageOptions={[10, 25, 50]} rowsPerPageLabel={dictionary.pagination.rowsPerPage} ofLabel={dictionary.pagination.of} onPageChange={(_, nextPage) => setPage(nextPage)} onRowsPerPageChange={event => { setRowsPerPage(Number(event.target.value)); setPage(0) }} />
        </div>
      </Card>
    </div>
  )
}

export default HrmReportsView
