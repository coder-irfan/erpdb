'use client'

import { useCallback, useEffect, useState } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import LocalizedDateTimePicker from '@/components/inputs/LocalizedDateTimePicker'
import { createActivitySchema } from '@/schemas/crm/leads'

const TYPES = ['CALL', 'MEETING', 'EMAIL', 'NOTE', 'FOLLOW_UP']

const ICONS = {
  CALL: 'tabler-phone',
  MEETING: 'tabler-users',
  EMAIL: 'tabler-mail',
  NOTE: 'tabler-note',
  FOLLOW_UP: 'tabler-calendar-time'
}

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }
const EMPTY = { activity_type: 'CALL', title: '', description: '', due_date: '', is_completed: false }

const ClientActivityDialog = ({ open, client, locale, dictionary, onClose, onSaved }) => {
  const [detail, setDetail] = useState(null)
  const [loadingTimeline, setLoadingTimeline] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: valibotResolver(createActivitySchema(dictionary.validation)), defaultValues: EMPTY })

  const loadClient = useCallback(async () => {
    if (!client?.id) return
    setLoadingTimeline(true)

    try {
      const response = await fetch(`/api/crm/clients/${client.id}?locale=${locale}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.loadFailed)
      setDetail(result.data)
    } catch {
      toast.error(dictionary.messages.loadFailed)
    } finally {
      setLoadingTimeline(false)
    }
  }, [client?.id, dictionary.messages.loadFailed, locale])

  useEffect(() => {
    if (open) {
      reset(EMPTY)
      loadClient()
    } else setDetail(null)
  }, [loadClient, open, reset])

  if (!client) return null

  const submit = async values => {
    try {
      const response = await fetch(`/api/crm/clients/${client.id}/activities?locale=${locale}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)
      toast.success(result.message)
      reset(EMPTY)
      await Promise.all([onSaved(), loadClient()])
    } catch {
      toast.error(dictionary.messages.operationFailed)
    }
  }

  const formatDate = value =>
    new Intl.DateTimeFormat(localeMap[locale] || localeMap.en, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value)
    )

  const activities = detail?.activities || []

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      PaperProps={{ className: 'is-full sm:is-[520px]' }}
    >
      <div className='flex items-center justify-between border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>{dictionary.activity.addTitle}</Typography>
          <Typography color='text.secondary'>{detail?.company_name || client.company_name}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <div className='overflow-y-auto px-5 py-6'>
        <form
          onSubmit={handleSubmit(submit)}
          className='mb-8 flex flex-col gap-4 rounded border border-divider bg-actionHover px-4 py-5'
          noValidate
        >
          <Controller
            name='activity_type'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                select
                value={field.value || 'CALL'}
                label={dictionary.activity.type}
                error={Boolean(errors.activity_type)}
                helperText={errors.activity_type?.message}
              >
                {TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {dictionary.activity.types[type]}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='title'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                value={field.value || ''}
                label={dictionary.activity.subject}
                error={Boolean(errors.title)}
                helperText={errors.title?.message}
              />
            )}
          />
          <Controller
            name='description'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                value={field.value || ''}
                multiline
                minRows={3}
                label={dictionary.activity.description}
                error={Boolean(errors.description)}
                helperText={errors.description?.message}
              />
            )}
          />
          <Controller
            name='due_date'
            control={control}
            render={({ field }) => (
              <LocalizedDateTimePicker
                {...field}
                value={field.value || ''}
                mode='datetime'
                locale={locale}
                label={dictionary.activity.dueDate}
                error={Boolean(errors.due_date)}
                helperText={errors.due_date?.message}
              />
            )}
          />
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {dictionary.activity.add}
            </LoadingButtonContent>
          </Button>
        </form>
        <div className='py-4'>
          <Typography variant='h6' className='mb-5'>
            Activity Timeline
          </Typography>
          {loadingTimeline ? (
            <div className='flex justify-center p-8'>
              <CircularProgress size={28} />
            </div>
          ) : (
            <div className='flex flex-col md:gap-4 gap-2'>
              {activities.length === 0 ? (
                <div className='rounded border border-dashed border-divider p-8 text-center text-textSecondary'>
                  <i className='tabler-history text-4xl' />
                  <Typography className='mt-2'>{dictionary.empty.activities}</Typography>
                </div>
              ) : (
                activities.map(activity => (
                  <div key={activity.id} className='relative flex gap-3 border-bs-2 border-primary/20 ps-5 pt-4'>
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primaryLighter text-primary'>
                      <i className={ICONS[activity.activity_type] || 'tabler-activity'} />
                    </span>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <Typography className='font-medium' color='text.primary'>
                          {activity.title}
                        </Typography>
                        <Chip
                          size='small'
                          variant='tonal'
                          color='primary'
                          label={dictionary.activity.types[activity.activity_type] || activity.activity_type}
                        />
                      </div>
                      <Typography variant='body2' color='text.secondary'>
                        {activity.staff?.full_name || '—'} · {formatDate(activity.activity_date)}
                      </Typography>
                      {activity.description && (
                        <Typography className='mt-2 whitespace-pre-line'>{activity.description}</Typography>
                      )}
                      {activity.due_date && (
                        <Typography variant='body2' className='mt-2 text-warning'>
                          {dictionary.activity.dueDate}: {formatDate(activity.due_date)}
                        </Typography>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}

export default ClientActivityDialog
