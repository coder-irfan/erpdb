'use client'

import { useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import {
  createOption,
  deleteOption,
  getOptionsListPaginated,
  toggleOptionStatus,
  updateOption
} from '@/actions/options'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'

import tableStyles from '@core/styles/table.module.css'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const SingleCategoryOptionsView = ({
  category,
  initialOptions,
  canWrite,
  canDelete,
  locale,
  dictionary,
  managementDictionary,
  icon
}) => {
  const [options, setOptions] = useState(initialOptions)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingOption, setEditingOption] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const visibleOptions = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return options

    return options.filter(option =>
      [option.name, option.value, option.description].some(value => value?.toLowerCase().includes(term))
    )
  }, [options, search])

  const refresh = async () => {
    const result = await getOptionsListPaginated({ category, page: 1, limit: 100, locale })

    if (!result.success) return toast.error(result.error)
    setOptions(result.data.options)
  }

  const openForm = option => {
    setEditingOption(option || null)
    setName(option?.name || '')
    setDescription(option?.description || '')
    setNameError('')
    setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return
    setFormOpen(false)
    setEditingOption(null)
  }

  const submit = async () => {
    if (!name.trim()) return setNameError(managementDictionary.validation.required)
    setSaving(true)

    try {
      const payload = {
        category,
        name,
        description,
        is_active: editingOption?.is_active ?? true,
        locale
      }

      const result = editingOption ? await updateOption(editingOption.id, payload) : await createOption(payload)

      if (!result.success) return toast.error(result.error)
      toast.success(result.message)
      setFormOpen(false)
      setEditingOption(null)
      await refresh()
    } catch {
      toast.error(managementDictionary.messages.operationFailed)
    } finally {
      setSaving(false)
    }
  }

  const toggle = async option => {
    setBusyId(option.id)

    try {
      const result = await toggleOptionStatus(option.id, !option.is_active, { locale })

      if (!result.success) return toast.error(result.error)
      toast.success(result.message)
      await refresh()
    } catch {
      toast.error(managementDictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)

    try {
      const result = await deleteOption(deleteTarget.id, { locale })

      if (!result.success) return toast.error(result.error)
      toast.success(result.message)
      setDeleteTarget(null)
      await refresh()
    } catch {
      toast.error(managementDictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  const formatDate = value =>
    new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value))

  const renderActions = option => (
    <EntityActionsMenu
      actions={[
        canWrite && { label: managementDictionary.common.edit, icon: 'tabler-edit', disabled: busyId === option.id, onClick: () => openForm(option) },
        canWrite && {
          label: option.is_active ? managementDictionary.common.deactivate : managementDictionary.common.activate,
          icon: option.is_active ? 'tabler-toggle-right' : 'tabler-toggle-left',
          disabled: busyId === option.id,
          onClick: () => toggle(option)
        },
        canDelete && { label: managementDictionary.common.delete, icon: 'tabler-trash', color: 'error', disabled: busyId === option.id, onClick: () => setDeleteTarget(option) }
      ]}
      moreActionsLabel={managementDictionary.common.actions}
    />
  )

  return (
    <Card>
      <CardContent className='flex is-full flex-wrap items-center gap-3 sm:is-auto justify-between border-be border-divider'>
        <CustomTextField
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder={dictionary.searchPlaceholder}
          className='is-full sm:is-[350px]'
          slotProps={{ input: { startAdornment: <i className='tabler-search text-textSecondary' /> } }}
        />
        {canWrite && (
          <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => openForm(null)}>
            {dictionary.add}
          </Button>
        )}
      </CardContent>

      <ResponsiveDataTable
        mobileRows={visibleOptions}
        getMobileRowId={option => option.id}
        renderMobilePrimary={option => (
          <div className='min-is-0'>
            <Typography className='truncate font-medium' color='text.primary'>{option.name}</Typography>
            <Typography variant='body2' color='text.secondary' className='line-clamp-2'>
              {option.description || managementDictionary.common.noDescription}
            </Typography>
          </div>
        )}
        renderMobileStatus={option => (
          <Chip size='small' variant='tonal' color={option.is_active ? 'success' : 'secondary'} label={option.is_active ? managementDictionary.common.active : managementDictionary.common.inactive} />
        )}
        renderMobileActions={renderActions}
        mobileMetadata={[
          { id: 'created', label: managementDictionary.common.createdDate, render: option => formatDate(option.created_at) }
        ]}
        emptyState={{ icon, title: dictionary.emptyTitle, description: dictionary.emptyDescription, actionLabel: canWrite ? dictionary.add : undefined, onAction: canWrite ? () => openForm(null) : undefined }}
      >
        <div className='no-scrollbar overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>{dictionary.fields.name}</th>
              <th>{dictionary.fields.description}</th>
              <th>{managementDictionary.common.status}</th>
              <th>{managementDictionary.common.createdDate}</th>
              <th className='text-end'>{managementDictionary.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {visibleOptions.length === 0 ? (
              <TableEmptyStateRow
                colSpan={5}
                icon={icon}
                title={dictionary.emptyTitle}
                description={dictionary.emptyDescription}
                actionLabel={canWrite ? dictionary.add : null}
                onAction={canWrite ? () => openForm(null) : null}
              />
            ) : (
              visibleOptions.map(option => (
                <tr key={option.id}>
                  <td>
                    <Typography className='font-medium' color='text.primary'>
                      {option.name}
                    </Typography>
                  </td>
                  <td>
                    <Typography variant='body2' color='text.secondary' className='max-is-[360px]'>
                      {option.description || managementDictionary.common.noDescription}
                    </Typography>
                  </td>
                  <td>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={option.is_active ? 'success' : 'secondary'}
                      label={
                        option.is_active ? managementDictionary.common.active : managementDictionary.common.inactive
                      }
                    />
                  </td>
                  <td className='whitespace-nowrap'>{formatDate(option.created_at)}</td>
                  <td className='text-end'>
                    {renderActions(option)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </ResponsiveDataTable>

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth='sm'>
        <DialogTitle>{editingOption ? dictionary.editTitle : dictionary.addTitle}</DialogTitle>
        <DialogContent dividers className='flex flex-col gap-4'>
          <CustomTextField
            autoFocus
            fullWidth
            label={dictionary.fields.name}
            value={name}
            onChange={event => {
              setName(event.target.value)
              if (event.target.value.trim()) setNameError('')
            }}
            error={Boolean(nameError)}
            helperText={nameError}
            disabled={saving}
          />
          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label={dictionary.fields.description}
            value={description}
            onChange={event => setDescription(event.target.value)}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions className='gap-2 p-5'>
          <Button variant='tonal' color='secondary' disabled={saving} onClick={closeForm}>
            {managementDictionary.common.cancel}
          </Button>
          <Button variant='contained' disabled={saving} onClick={submit}>
            <LoadingButtonContent loading={saving} loadingLabel={managementDictionary.common.saving}>
              {editingOption ? managementDictionary.common.saveChanges : managementDictionary.common.create}
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.deleteTitle}
        description={dictionary.deleteDescription}
        itemName={deleteTarget?.name}
        confirmText={managementDictionary.common.delete}
        cancelText={managementDictionary.common.cancel}
        loading={busyId === deleteTarget?.id}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </Card>
  )
}

export default SingleCategoryOptionsView
