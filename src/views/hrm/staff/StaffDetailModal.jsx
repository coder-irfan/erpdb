'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import { getStaffById } from '@/actions/hrm/staff'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import { formatCurrency } from '@/utils/formatCurrency'
import { getInitials } from '@/utils/getInitials'

import StaffAttendanceHistory from './StaffAttendanceHistory'

import tableStyles from '@core/styles/table.module.css'

const STAFF_STATUS_COLORS = { ACTIVE: 'success', INACTIVE: 'secondary', TERMINATED: 'error' }
const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) => {
  if (!value) return '—'

  return new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value))
}

const DetailItem = ({ label, value }) => (
  <div>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography color='text.primary' className='mt-1 break-words'>
      {value || '—'}
    </Typography>
  </div>
)

const StaffDetailModal = ({ open, staffId, locale, dictionary, onClose }) => {
  const [staff, setStaff] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (!open || !staffId) return undefined

    let active = true

    setActiveTab(0)

    const loadStaff = async () => {
      setLoading(true)
      setError('')

      try {
        const result = await getStaffById(staffId, { locale })

        if (!active) return

        if (result.success) setStaff(result.data)
        else setError(result.error)
      } catch {
        if (active) setError(dictionary.messages.loadFailed)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadStaff()

    return () => {
      active = false
    }
  }, [dictionary.messages.loadFailed, locale, open, staffId])

  const closeModal = () => {
    if (!loading) onClose()
  }

  return (
    <Dialog open={open} onClose={closeModal} fullWidth maxWidth='md'>
      <DialogTitle className='flex items-start justify-between gap-4'>
        <div>
          <Typography variant='h5'>{dictionary.details.title}</Typography>
          <Typography color='text.secondary'>{dictionary.details.description}</Typography>
        </div>
        <IconButton onClick={closeModal} disabled={loading} aria-label={dictionary.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <div className='flex min-bs-[320px] items-center justify-center'>
            <CircularProgress />
          </div>
        ) : error ? (
          <Alert severity='error'>{error}</Alert>
        ) : staff ? (
          <div className='flex flex-col md:gap-4 gap-2'>
            <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
              <CustomAvatar src={staff.user?.image || undefined} skin='light' color='primary' size={72}>
                {!staff.user?.image && getInitials(staff.full_name)}
              </CustomAvatar>
              <div className='flex-1'>
                <Typography variant='h4'>{staff.full_name}</Typography>
                <Typography color='text.secondary'>{staff.position}</Typography>
                <div className='mt-2 flex flex-wrap gap-2'>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={STAFF_STATUS_COLORS[staff.status] || 'default'}
                    label={dictionary.status[staff.status] || staff.status}
                  />
                  {staff.user && (
                    <Chip size='small' variant='tonal' color='info' label={dictionary.details.linkedUser} />
                  )}
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant='scrollable'>
              <Tab icon={<i className='tabler-user' />} iconPosition='start' label={dictionary.details.profileTab} />
              <Tab
                icon={<i className='tabler-file-certificate' />}
                iconPosition='start'
                label={`${dictionary.details.contracts} (${staff.contracts.length})`}
              />
              <Tab
                icon={<i className='tabler-calendar-time' />}
                iconPosition='start'
                label={dictionary.details.attendanceTab}
              />
            </Tabs>

            {activeTab === 0 ? (
              <div className='flex flex-col md:gap-4 gap-2'>
                <Divider />
                <div>
                  <Typography variant='h6' className='mb-4'>
                    {dictionary.sections.personal}
                  </Typography>
                  <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                    <DetailItem label={dictionary.fields.fatherName} value={staff.father_name} />
                    <DetailItem label={dictionary.fields.email} value={staff.email} />
                    <DetailItem label={dictionary.fields.phone} value={staff.phone} />
                    <DetailItem label={dictionary.fields.tazkiraNo} value={staff.tazkira_no} />
                    <DetailItem label={dictionary.fields.address} value={staff.address} />
                    <DetailItem label={dictionary.fields.educations} value={staff.educations} />
                  </div>
                </div>
                <Divider />
                <div>
                  <Typography variant='h6' className='mb-4'>
                    {dictionary.sections.employment}
                  </Typography>
                  <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                    <DetailItem label={dictionary.fields.position} value={staff.position} />
                    <DetailItem
                      label={dictionary.fields.salary}
                      value={formatCurrency(staff.salary, locale, staff.salary_currency)}
                    />
                    <DetailItem label={dictionary.fields.joinDate} value={formatDate(staff.join_date, locale)} />
                    <DetailItem label={dictionary.fields.contractPeriod} value={staff.contract_period} />
                    <DetailItem label={dictionary.fields.systemUser} value={staff.user?.name || staff.user?.email} />
                    <DetailItem label={dictionary.details.createdAt} value={formatDate(staff.created_at, locale)} />
                  </div>
                </div>
                <Divider />
                <div>
                  <Typography variant='h6' className='mb-4'>
                    {dictionary.sections.guarantor}
                  </Typography>
                  <div className='grid grid-cols-1 gap-5 sm:grid-cols-3'>
                    <DetailItem label={dictionary.fields.guarantorName} value={staff.guarantor_name} />
                    <DetailItem label={dictionary.fields.guarantorPhone} value={staff.guarantor_phone} />
                    <DetailItem label={dictionary.fields.guarantorLicense} value={staff.guarantor_license} />
                  </div>
                </div>
              </div>
            ) : activeTab === 1 && staff.contracts.length === 0 ? (
              <div className='overflow-hidden rounded border border-divider'>
                <table className={tableStyles.table}>
                  <tbody>
                    <TableEmptyStateRow
                      colSpan={1}
                      icon='tabler-file-certificate'
                      title={dictionary.details.noContractsTitle}
                      description={dictionary.details.noContracts}
                    />
                  </tbody>
                </table>
              </div>
            ) : activeTab === 1 ? (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                {staff.contracts.map(contract => (
                  <Card key={contract.id} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <div className='flex items-start justify-between gap-3'>
                        <Typography variant='h6'>{contract.contract_number}</Typography>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={STAFF_STATUS_COLORS[contract.status?.value] || 'default'}
                          label={contract.status?.label}
                        />
                      </div>
                      <Typography>{contract.position_title}</Typography>
                      <Typography color='text.secondary'>
                        {`${formatDate(contract.start_date, locale)} — ${formatDate(contract.end_date, locale)}`}
                      </Typography>
                      <Typography className='font-medium'>
                        {formatCurrency(contract.base_salary, locale, contract.currency)}
                      </Typography>
                      <Link
                        href={`/${locale}/hrm/contracts/${contract.id}/print`}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        <Button
                          component='span'
                          variant='tonal'
                          size='small'
                          startIcon={<i className='tabler-printer' />}
                        >
                          {dictionary.details.printContract}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <StaffAttendanceHistory
                active={activeTab === 2}
                staffId={staff.id}
                locale={locale}
                dictionary={{ attendance: dictionary.details.attendance, messages: dictionary.messages }}
              />
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default StaffDetailModal
