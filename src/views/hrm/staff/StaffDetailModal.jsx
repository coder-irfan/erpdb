'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import { getStaffById } from '@/actions/hrm/staff'
import { getInitials } from '@/utils/getInitials'

const STATUS_COLORS = { ACTIVE: 'success', INACTIVE: 'secondary', TERMINATED: 'error' }
const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) => {
  if (!value) return '—'

  return new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value))
}

const formatCurrency = (value, locale) =>
  new Intl.NumberFormat(localeMap[locale] || 'en-US', {
    style: 'currency',
    currency: 'AFN',
    maximumFractionDigits: 2
  }).format(Number(value || 0))

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

  useEffect(() => {
    if (!open || !staffId) return undefined

    let active = true

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
          <div className='flex flex-col gap-6'>
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
                    color={STATUS_COLORS[staff.status] || 'default'}
                    label={dictionary.status[staff.status] || staff.status}
                  />
                  {staff.user && <Chip size='small' variant='tonal' color='info' label={dictionary.details.linkedUser} />}
                </div>
              </div>
            </div>

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
                <DetailItem label={dictionary.fields.salary} value={formatCurrency(staff.salary, locale)} />
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

            <Divider />
            <div>
              <Typography variant='h6' className='mb-4'>
                {dictionary.details.activeContracts}
              </Typography>
              {staff.contracts.length === 0 ? (
                <Typography color='text.secondary'>{dictionary.details.noActiveContracts}</Typography>
              ) : (
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  {staff.contracts.map(contract => (
                    <Card key={contract.id} variant='outlined'>
                      <CardContent className='flex flex-col gap-2'>
                        <div className='flex items-start justify-between gap-3'>
                          <Typography variant='h6'>{contract.contract_number}</Typography>
                          <Chip size='small' color='success' variant='tonal' label={contract.status?.label} />
                        </div>
                        <Typography>{contract.position_title}</Typography>
                        <Typography color='text.secondary'>
                          {`${formatDate(contract.start_date, locale)} — ${formatDate(contract.end_date, locale)}`}
                        </Typography>
                        <Typography className='font-medium'>{formatCurrency(contract.base_salary, locale)}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default StaffDetailModal
