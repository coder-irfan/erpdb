'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createStaff, updateStaff } from '@/actions/hrm/staff'
import { getOptionsByCategory } from '@/actions/options'
import { createStaffSchema, STAFF_STATUSES } from '@/schemas/hrm/staff'

const DEFAULT_VALUES = {
  first_name: '',
  last_name: '',
  father_name: '',
  email: '',
  phone: '',
  address: '',
  tazkira_no: '',
  position: '',
  salary: '',
  salary_currency: 'AFN',
  join_date: '',
  contract_period: '',
  user_id: '',
  status: 'ACTIVE',
  guarantor_name: '',
  guarantor_phone: '',
  guarantor_license: '',
  educations: ''
}

const getFormValues = (staff, baseCurrency) => {
  if (!staff) return { ...DEFAULT_VALUES, salary_currency: baseCurrency }

  return {
    first_name: staff.first_name || '',
    last_name: staff.last_name || '',
    father_name: staff.father_name || '',
    email: staff.email || '',
    phone: staff.phone || '',
    address: staff.address || '',
    tazkira_no: staff.tazkira_no || '',
    position: staff.position || '',
    salary: staff.salary || '',
    salary_currency: staff.salary_currency || baseCurrency,
    join_date: staff.join_date?.slice(0, 10) || '',
    contract_period: staff.contract_period || '',
    user_id: staff.user_id || '',
    status: staff.status || 'ACTIVE',
    guarantor_name: staff.guarantor_name || '',
    guarantor_phone: staff.guarantor_phone || '',
    guarantor_license: staff.guarantor_license || '',
    educations: staff.educations || ''
  }
}

const SectionTitle = ({ children }) => (
  <div className='flex flex-col gap-2'>
    <Typography variant='h6'>{children}</Typography>
    <Divider />
  </div>
)

const StaffDrawer = ({ open, staff, users, locale, dictionary, baseCurrency, onClose, onSaved }) => {
  const [positionOptions, setPositionOptions] = useState([])
  const [positionsLoading, setPositionsLoading] = useState(false)

  const availableUsers = useMemo(() => {
    if (!staff?.user || users.some(user => user.id === staff.user.id)) return users

    return [staff.user, ...users]
  }, [staff, users])

  const availablePositions = useMemo(() => {
    const names = positionOptions.map(option => option.name)

    if (staff?.position && !names.includes(staff.position)) return [staff.position, ...names]

    return names
  }, [positionOptions, staff])

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createStaffSchema(dictionary.validation)),
    defaultValues: DEFAULT_VALUES
  })

  useEffect(() => {
    if (open) reset(getFormValues(staff, baseCurrency))
  }, [baseCurrency, open, reset, staff])

  useEffect(() => {
    if (!open) return undefined

    let active = true

    const loadPositions = async () => {
      setPositionsLoading(true)

      try {
        const result = await getOptionsByCategory('STAFF_POSITION', { locale })

        if (!active) return

        if (result.success) setPositionOptions(result.data)
        else toast.error(result.error)
      } catch {
        if (active) toast.error(dictionary.messages.positionsLoadFailed)
      } finally {
        if (active) setPositionsLoading(false)
      }
    }

    loadPositions()

    return () => {
      active = false
    }
  }, [dictionary.messages.positionsLoadFailed, locale, open])

  const handleClose = () => {
    if (!isSubmitting) onClose()
  }

  const submitForm = async values => {
    try {
      const payload = { ...values, user_id: values.user_id || null, locale }
      const result = staff ? await updateStaff(staff.id, payload) : await createStaff(payload)

      if (!result.success) {
        toast.error(result.error)

        return
      }

      toast.success(result.message)
      onSaved(result.data)
      onClose()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    }
  }

  const fieldProps = name => ({
    error: Boolean(errors[name]),
    helperText: errors[name]?.message,
    disabled: isSubmitting,
    ...register(name)
  })

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      slotProps={{ paper: { className: 'is-full sm:is-[620px]' } }}
    >
      <div className='flex items-start justify-between gap-4 border-be border-divider p-6'>
        <div>
          <Typography variant='h5'>{staff ? dictionary.drawer.editTitle : dictionary.drawer.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.drawer.description}</Typography>
        </div>
        <IconButton onClick={handleClose} disabled={isSubmitting} aria-label={dictionary.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </div>

      <form onSubmit={handleSubmit(submitForm)} noValidate className='flex min-bs-0 flex-1 flex-col'>
        <div className='flex flex-1 flex-col gap-6 overflow-y-auto p-6'>
          <SectionTitle>{dictionary.sections.personal}</SectionTitle>
          <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
            <CustomTextField fullWidth label={dictionary.fields.firstName} {...fieldProps('first_name')} />
            <CustomTextField fullWidth label={dictionary.fields.lastName} {...fieldProps('last_name')} />
            <CustomTextField fullWidth label={dictionary.fields.fatherName} {...fieldProps('father_name')} />
            <CustomTextField fullWidth type='email' label={dictionary.fields.email} {...fieldProps('email')} />
            <CustomTextField fullWidth label={dictionary.fields.phone} {...fieldProps('phone')} />
            <CustomTextField fullWidth label={dictionary.fields.tazkiraNo} {...fieldProps('tazkira_no')} />
            <CustomTextField
              fullWidth
              multiline
              minRows={2}
              className='sm:col-span-2'
              label={dictionary.fields.address}
              {...fieldProps('address')}
            />
          </div>

          <SectionTitle>{dictionary.sections.employment}</SectionTitle>
          <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
            <div>
              <div className='mb-2 flex items-center justify-between gap-2'>
                <Typography variant='body2' color='text.primary'>
                  {dictionary.fields.position}
                </Typography>
                <Button
                  component={Link}
                  href={`/${locale}/options/hrm/positions`}
                  target='_blank'
                  rel='noopener noreferrer'
                  size='small'
                  variant='text'
                  startIcon={<i className='tabler-plus' />}
                  className='min-is-0 p-0'
                >
                  {dictionary.actions.addPosition}
                </Button>
              </div>
              <Controller
                name='position'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    select
                    value={field.value || ''}
                    aria-label={dictionary.fields.position}
                    error={Boolean(errors.position)}
                    helperText={errors.position?.message}
                    disabled={isSubmitting || positionsLoading}
                  >
                    <MenuItem value='' disabled>
                      {positionsLoading
                        ? dictionary.actions.loadingPositions
                        : availablePositions.length === 0
                          ? dictionary.actions.noPositions
                          : dictionary.actions.selectPosition}
                    </MenuItem>
                    {availablePositions.map(position => (
                      <MenuItem key={position} value={position}>
                        {position}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </div>
            <CustomTextField
              fullWidth
              type='number'
              label={dictionary.fields.salary}
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              {...fieldProps('salary')}
            />
            <Controller
              name='salary_currency'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  fullWidth
                  select
                  label={dictionary.fields.currency}
                  value={field.value || baseCurrency}
                  error={Boolean(errors.salary_currency)}
                  helperText={errors.salary_currency?.message}
                  disabled={isSubmitting}
                >
                  <MenuItem value='AFN'>AFN</MenuItem>
                  <MenuItem value='USD'>USD</MenuItem>
                </CustomTextField>
              )}
            />
            <CustomTextField fullWidth type='date' label={dictionary.fields.joinDate} {...fieldProps('join_date')} />
            <CustomTextField fullWidth label={dictionary.fields.contractPeriod} {...fieldProps('contract_period')} />
            <Controller
              name='status'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  fullWidth
                  select
                  label={dictionary.fields.status}
                  value={field.value || 'ACTIVE'}
                  disabled={isSubmitting}
                >
                  {STAFF_STATUSES.map(status => (
                    <MenuItem key={status} value={status}>
                      {dictionary.status[status]}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
            <Controller
              name='user_id'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  fullWidth
                  select
                  label={dictionary.fields.systemUser}
                  value={field.value || ''}
                  disabled={isSubmitting}
                >
                  <MenuItem value=''>{dictionary.fields.noSystemUser}</MenuItem>
                  {availableUsers.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
          </div>

          <SectionTitle>{dictionary.sections.guarantor}</SectionTitle>
          <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
            <CustomTextField fullWidth label={dictionary.fields.guarantorName} {...fieldProps('guarantor_name')} />
            <CustomTextField fullWidth label={dictionary.fields.guarantorPhone} {...fieldProps('guarantor_phone')} />
            <CustomTextField
              fullWidth
              className='sm:col-span-2'
              label={dictionary.fields.guarantorLicense}
              {...fieldProps('guarantor_license')}
            />
          </div>

          <SectionTitle>{dictionary.sections.education}</SectionTitle>
          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label={dictionary.fields.educations}
            {...fieldProps('educations')}
          />
        </div>

        <div className='flex justify-end gap-3 border-bs border-divider p-6'>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={isSubmitting}>
            {dictionary.actions.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {staff ? dictionary.actions.saveChanges : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default StaffDrawer
