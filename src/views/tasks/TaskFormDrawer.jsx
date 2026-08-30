'use client'

import { useEffect } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { createTask, updateTask } from '@/actions/tasks'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import FormSectionCards from '@/components/forms/FormSectionCards'
import RichTextEditor from '@/components/forms/RichTextEditor'
import { createTaskSchema } from '@/schemas/tasks'
import { toDateInputValue } from '@/utils/contractDuration'

const defaultOption = options => options.find(option => option.is_default)?.id || options[0]?.id || ''

const emptyValues = (options, defaultProjectId = '') => ({
  title: '',
  project_id: defaultProjectId,
  description: '',
  assignee_ids: [],
  status_id: defaultOption(options.statuses),
  priority_id: defaultOption(options.priorities),
  estimated_hours: '0',
  actual_hours: '0',
  due_date: ''
})

const TaskFormDrawer = ({ open, task, options, defaultProjectId = '', locale, dictionary, onClose, onSaved }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createTaskSchema(dictionary.validation)),
    defaultValues: emptyValues(options, defaultProjectId)
  })

  const today = toDateInputValue(new Date())
  const createdDate = task?.created_at ? toDateInputValue(task.created_at) : today
  const earliestDueDate = createdDate > today ? createdDate : today

  useEffect(() => {
    if (!open) return
    reset(
      task
        ? {
            title: task.title || '',
            project_id: task.project_id || '',
            description: task.description || '',
            assignee_ids: task.assignees.map(assignee => assignee.staff.id),
            status_id: task.status_id || defaultOption(options.statuses),
            priority_id: task.priority_id || defaultOption(options.priorities),
            estimated_hours: String(task.estimated_hours || '0'),
            actual_hours: String(task.actual_hours || '0'),
            due_date: toDateInputValue(task.due_date)
          }
        : emptyValues(options, defaultProjectId)
    )
  }, [defaultProjectId, open, options, reset, task])

  const submit = async values => {
    const result = task ? await updateTask(task.id, { ...values, locale }) : await createTask({ ...values, locale })

    if (!result.success) return toast.error(result.error || dictionary.messages.operationFailed)
    toast.success(result.message)
    onClose()
    await onSaved(result.data?.id)
  }

  const field = (name, label, props = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field: input }) => (
        <CustomTextField
          {...input}
          {...props}
          value={input.value ?? ''}
          label={label}
          error={Boolean(errors[name])}
          helperText={errors[name]?.message || props.helperText}
        />
      )}
    />
  )

  const select = (name, label, items, placeholder) => (
    <Controller
      name={name}
      control={control}
      render={({ field: input }) => (
        <CustomTextField
          {...input}
          select
          value={input.value || ''}
          label={label}
          error={Boolean(errors[name])}
          helperText={errors[name]?.message}
          slotProps={{
            select: {
              displayEmpty: true,
              renderValue: value => items.find(item => item.id === value)?.label || placeholder
            }
          }}
        >
          <MenuItem value='' disabled>
            {placeholder}
          </MenuItem>
          {items.map(item => (
            <MenuItem key={item.id} value={item.id}>
              {item.label}
            </MenuItem>
          ))}
        </CustomTextField>
      )}
    />
  )

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      PaperProps={{ className: 'is-full sm:is-[680px]' }}
    >
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>{task ? dictionary.form.editTitle : dictionary.form.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.form.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <form
        className='form-surface-scroll flex flex-1 flex-col gap-5 px-5 pt-5'
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <FormSectionCards
          labels={[
            dictionary.tabs?.general || 'General information',
            dictionary.tabs?.planning || 'Planning and assignment'
          ]}
        >
          {field('title', dictionary.fields.title)}
          <Controller
            name='project_id'
            control={control}
            render={({ field: input }) => (
              <Autocomplete
                options={options.projects}
                value={options.projects.find(project => project.id === input.value) || null}
                onChange={(_, value) => input.onChange(value?.id || '')}
                getOptionLabel={option => `${option.project_code} · ${option.title}`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={params => (
                  <CustomTextField
                    {...params}
                    label={dictionary.fields.project}
                    placeholder={dictionary.placeholders.project}
                    error={Boolean(errors.project_id)}
                    helperText={errors.project_id?.message}
                  />
                )}
              />
            )}
          />
          <Controller
            name='description'
            control={control}
            render={({ field: input }) => (
              <RichTextEditor
                className='sm:col-span-2'
                compact
                {...input}
                value={input.value || ''}
                label={dictionary.fields.description}
                error={Boolean(errors.description)}
                helperText={errors.description?.message}
              />
            )}
          />
          <Controller
            name='assignee_ids'
            control={control}
            render={({ field: input }) => (
              <Autocomplete
                multiple
                options={options.staff}
                value={options.staff.filter(staff => input.value?.includes(staff.id))}
                onChange={(_, values) => input.onChange(values.map(value => value.id))}
                getOptionLabel={option => option.full_name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderTags={(values, getTagProps) =>
                  values.map((value, index) => {
                    const { key, ...tagProps } = getTagProps({ index })

                    return <Chip key={key || value.id} size='small' label={value.full_name} {...tagProps} />
                  })
                }
                renderInput={params => (
                  <CustomTextField
                    {...params}
                    label={dictionary.fields.assignees}
                    placeholder={dictionary.placeholders.assignees}
                    error={Boolean(errors.assignee_ids)}
                    helperText={errors.assignee_ids?.message}
                  />
                )}
              />
            )}
          />
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {select('status_id', dictionary.fields.status, options.statuses, dictionary.placeholders.status)}
            {select('priority_id', dictionary.fields.priority, options.priorities, dictionary.placeholders.priority)}
            {field('estimated_hours', dictionary.fields.estimatedHours, {
              type: 'number',
              inputProps: { min: 0, step: '0.25' }
            })}
            {task &&
              field('actual_hours', dictionary.fields.actualHours, {
                type: 'number',
                disabled: true,
                helperText: dictionary.form.actualHoursLocked,
                inputProps: { min: 0, step: '0.25' }
              })}
            {field('due_date', dictionary.fields.dueDate, {
              type: 'date',
              inputProps: { min: earliestDueDate },
              slotProps: { inputLabel: { shrink: true } }
            })}
          </div>
        </FormSectionCards>
        <div className='form-surface-actions -mx-5 -mb-5 mt-auto flex justify-end gap-3 px-5 pt-5'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>
            {dictionary.actions.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {task ? dictionary.actions.save : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default TaskFormDrawer
