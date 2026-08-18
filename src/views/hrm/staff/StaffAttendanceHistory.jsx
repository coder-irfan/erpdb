'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'

import tableStyles from '@core/styles/table.module.css'

const STATUS_COLORS = { PRESENT: 'success', ABSENT: 'error', LEAVE: 'info' }
const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }
const LOAD_ERROR_FALLBACK = 'Failed to load attendance history.'

const StaffAttendanceHistory = ({ active, staffId, locale, dictionary }) => {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const attendanceDictionary = dictionary?.attendance || {}
  const loadFailedMessage = dictionary?.messages?.loadFailed || LOAD_ERROR_FALLBACK

  const loadHistory = useCallback(async () => {
    if (!active || !staffId) return

    setLoading(true)
    setError('')

    try {
      const [year, monthNumber] = month.split('-').map(Number)

      const response = await fetch(
        `/api/hrm/timesheets?date=${month}-01&month=${monthNumber}&year=${year}&staff_id=${staffId}&locale=${locale}`,
        { cache: 'no-store' }
      )

      const result = await response.json()

      if (!response.ok || !result.success) setError(result.error || loadFailedMessage)
      else setRecords(result.data.records)
    } catch {
      setError(loadFailedMessage)
    } finally {
      setLoading(false)
    }
  }, [active, loadFailedMessage, locale, month, staffId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const summary = useMemo(
    () => ({
      PRESENT: records.filter(record => record.status === 'PRESENT').length,
      ABSENT: records.filter(record => record.status === 'ABSENT').length,
      LEAVE: records.filter(record => record.status === 'LEAVE').length,
      hours: records.reduce((total, record) => total + Number(record.hours_worked || 0), 0).toFixed(2)
    }),
    [records]
  )

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex justify-end'>
        <CustomTextField type='month' label={attendanceDictionary.month} value={month} slotProps={{ inputLabel: { shrink: true } }} onChange={event => setMonth(event.target.value)} />
      </div>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {['PRESENT', 'ABSENT', 'LEAVE'].map(status => (
          <Card key={status} variant='outlined'><CardContent><Typography variant='body2' color='text.secondary'>{attendanceDictionary.status?.[status] || status}</Typography><Typography variant='h5'>{summary[status]}</Typography></CardContent></Card>
        ))}
        <Card variant='outlined'><CardContent><Typography variant='body2' color='text.secondary'>{attendanceDictionary.totalHours}</Typography><Typography variant='h5'>{summary.hours}</Typography></CardContent></Card>
      </div>
      {loading ? (
        <div className='flex min-h-40 items-center justify-center'><CircularProgress /></div>
      ) : error ? <Alert severity='error'>{error}</Alert> : (
        <div className='no-scrollbar overflow-x-auto scroll-smooth rounded border border-divider'>
          <table className={tableStyles.table}>
            <thead><tr><th>{attendanceDictionary.date}</th><th>{attendanceDictionary.statusLabel}</th><th>{attendanceDictionary.checkIn}</th><th>{attendanceDictionary.checkOut}</th><th>{attendanceDictionary.hours}</th></tr></thead>
            <tbody>
              {records.length === 0 ? (
                <TableEmptyStateRow colSpan={5} icon='tabler-calendar-time' title={attendanceDictionary.emptyTitle} description={attendanceDictionary.emptyDescription} />
              ) : records.map(record => (
                <tr key={record.id}>
                  <td>{new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${record.date}T00:00:00.000Z`))}</td>
                  <td><Chip size='small' variant='tonal' color={STATUS_COLORS[record.status]} label={attendanceDictionary.status?.[record.status] || record.status} /></td>
                  <td>{record.check_in_time || '—'}</td><td>{record.check_out_time || '—'}</td><td>{record.hours_worked ? Number(record.hours_worked).toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default StaffAttendanceHistory
