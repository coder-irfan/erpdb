'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

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
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'

import tableStyles from '@core/styles/table.module.css'

const TYPE_QUERY = 'type=INVENTORY_CATEGORY'
const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) => {
  if (!value) return '—'

  return new Intl.DateTimeFormat(localeMap[locale] || 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value))
}

const InventoryCategoriesView = ({ locale, dictionary, canWrite, canDelete }) => {
  const [options, setOptions] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadOptions = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/options?${TYPE_QUERY}&locale=${locale}`, { cache: 'no-store' })
      const result = await response.json()

      if (response.ok && result.success) setOptions(result.data.options)
      else toast.error(result.error || dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [dictionary.messages.loadFailed, locale])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  const visibleOptions = useMemo(() => {
    const term = search.trim().toLowerCase()

    return term
      ? options.filter(option => option.label.toLowerCase().includes(term) || option.value.toLowerCase().includes(term))
      : options
  }, [options, search])

  const openForm = option => {
    setEditing(option || null)
    setName(option?.label || '')
    setDescription(option?.description || '')
    setNameError('')
    setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return

    setFormOpen(false)
    setEditing(null)
  }

  const submit = async () => {
    if (name.trim().length < 2) return setNameError(dictionary.validation.categoryNameInvalid)

    setSaving(true)

    try {
      const query = `${TYPE_QUERY}${editing ? `&id=${editing.id}` : ''}`

      const response = await fetch(`/api/options?${query}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, is_active: editing?.is_active ?? true, locale })
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

      toast.success(result.message)
      setFormOpen(false)
      setEditing(null)
      await loadOptions()
    } finally {
      setSaving(false)
    }
  }

  const toggle = async option => {
    setBusyId(option.id)

    try {
      const response = await fetch(`/api/options?${TYPE_QUERY}&id=${option.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !option.is_active, locale })
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

      toast.success(result.message)
      await loadOptions()
    } finally {
      setBusyId(null)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return

    setBusyId(deleteTarget.id)

    try {
      const response = await fetch(`/api/options?${TYPE_QUERY}&id=${deleteTarget.id}&locale=${locale}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

      toast.success(result.message)
      setDeleteTarget(null)
      await loadOptions()
    } finally {
      setBusyId(null)
    }
  }

  const renderActions = option => (
    <EntityActionsMenu
      actions={[
        canWrite && { label: dictionary.categoryActions.edit, icon: 'tabler-edit', disabled: busyId === option.id, onClick: () => openForm(option) },
        canWrite && { label: option.is_active ? dictionary.categoryActions.deactivate : dictionary.categoryActions.activate, icon: option.is_active ? 'tabler-toggle-right' : 'tabler-toggle-left', disabled: busyId === option.id, onClick: () => toggle(option) },
        canDelete && { label: dictionary.categoryActions.delete, icon: 'tabler-trash', color: 'error', disabled: busyId === option.id, onClick: () => setDeleteTarget(option) }
      ]}
      moreActionsLabel={dictionary.table.actions}
    />
  )

  return (
    <Card>
      <CardContent className='flex flex-wrap items-center justify-between gap-4 border-be border-divider'>
        <CustomTextField
          label={dictionary.filters.searchCategories}
          placeholder={dictionary.filters.searchCategoriesPlaceholder}
          value={search}
          onChange={event => setSearch(event.target.value)}
          className='is-full sm:is-[360px]'
          slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }}
        />
        {canWrite && (
          <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => openForm(null)}>
            {dictionary.categoryActions.add}
          </Button>
        )}
      </CardContent>
      <ResponsiveDataTable
        mobileRows={visibleOptions}
        loading={loading}
        getMobileRowId={option => option.id}
        renderMobilePrimary={option => (
          <div className='min-is-0'>
            <Typography className='truncate font-medium'>{option.label}</Typography>
            <Typography color='text.secondary' className='line-clamp-2'>{option.description || '—'}</Typography>
          </div>
        )}
        renderMobileStatus={option => (
          <Chip size='small' variant='tonal' color={option.is_active ? 'success' : 'secondary'} label={option.is_active ? dictionary.categoryStatus.active : dictionary.categoryStatus.inactive} />
        )}
        renderMobileActions={renderActions}
        mobileMetadata={[{ id: 'created', label: dictionary.table.createdAt, render: option => formatDate(option.created_at, locale) }]}
        emptyState={{ icon: 'tabler-category', title: dictionary.categoryEmpty.title, description: dictionary.categoryEmpty.description, actionLabel: canWrite ? dictionary.categoryActions.add : undefined, onAction: canWrite ? () => openForm(null) : undefined }}
      >
        <div className='no-scrollbar overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>{dictionary.fields.category}</th>
              <th>{dictionary.categoryForm.description}</th>
              <th>{dictionary.fields.status}</th>
              <th>{dictionary.table.createdAt}</th>
              <th className='text-end'>{dictionary.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeletonRows columns={5} />
            ) : visibleOptions.length === 0 ? (
              <TableEmptyStateRow
                colSpan={5}
                icon='tabler-category'
                title={dictionary.categoryEmpty.title}
                description={dictionary.categoryEmpty.description}
                actionLabel={canWrite ? dictionary.categoryActions.add : null}
                onAction={canWrite ? () => openForm(null) : null}
              />
            ) : (
              visibleOptions.map(option => (
                <tr key={option.id}>
                  <td>
                    <Typography className='font-medium'>{option.label}</Typography>
                  </td>
                  <td>
                    <Typography color='text.secondary' className='max-is-[440px] truncate' title={option.description || ''}>
                      {option.description || '—'}
                    </Typography>
                  </td>
                  <td>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={option.is_active ? 'success' : 'secondary'}
                      label={option.is_active ? dictionary.categoryStatus.active : dictionary.categoryStatus.inactive}
                    />
                  </td>
                  <td className='whitespace-nowrap'>{formatDate(option.created_at, locale)}</td>
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
        <DialogTitle>{editing ? dictionary.categoryForm.editTitle : dictionary.categoryForm.addTitle}</DialogTitle>
        <DialogContent dividers className='flex flex-col gap-4'>
          <CustomTextField
            autoFocus
            fullWidth
            label={dictionary.categoryForm.name}
            value={name}
            onChange={event => {
              setName(event.target.value)
              setNameError('')
            }}
            error={Boolean(nameError)}
            helperText={nameError}
            disabled={saving}
          />
          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label={dictionary.categoryForm.description}
            value={description}
            onChange={event => setDescription(event.target.value)}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions className='gap-2 p-5'>
          <Button variant='tonal' color='secondary' disabled={saving} onClick={closeForm}>
            {dictionary.actions.cancel}
          </Button>
          <Button variant='contained' disabled={saving} onClick={submit}>
            <LoadingButtonContent loading={saving} loadingLabel={dictionary.actions.saving}>
              {editing ? dictionary.actions.save : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.categoryDelete.title}
        description={dictionary.categoryDelete.description}
        itemName={deleteTarget?.label}
        confirmText={dictionary.categoryActions.delete}
        cancelText={dictionary.actions.cancel}
        loading={busyId === deleteTarget?.id}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </Card>
  )
}

export default InventoryCategoriesView
