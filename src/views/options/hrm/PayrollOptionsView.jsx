'use client'

import { useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
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
import ConfirmationDeleteModal from '@/components/dialogs/ConfirmationDeleteModal'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'

import tableStyles from '@core/styles/table.module.css'

const SECTIONS = [
  { category: 'PAYROLL_PAYMENT_METHOD', key: 'paymentMethods', icon: 'tabler-credit-card' }
]

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) =>
  new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value))

const PayrollOptionsView = ({ initialData, canWrite, canDelete, locale, dictionary, managementDictionary }) => {
  const [data, setData] = useState(initialData)
  const [formCategory, setFormCategory] = useState(null)
  const [editingOption, setEditingOption] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const refreshCategory = async category => {
    const result = await getOptionsListPaginated({ category, page: 1, limit: 100, locale })

    if (!result.success) {
      toast.error(result.error)

      return
    }

    setData(current => ({ ...current, [category]: result.data.options }))
  }

  const resetForm = () => {
    setFormCategory(null)
    setEditingOption(null)
    setName('')
    setDescription('')
    setIsActive(true)
    setNameError('')
  }

  const closeForm = () => {
    if (!loading) resetForm()
  }

  const openCreate = category => {
    setFormCategory(category)
    setEditingOption(null)
    setName('')
    setDescription('')
    setIsActive(true)
    setNameError('')
  }

  const openEdit = option => {
    setFormCategory(option.category)
    setEditingOption(option)
    setName(option.name || '')
    setDescription(option.description || '')
    setIsActive(option.is_active ?? true)
    setNameError('')
  }

  const submit = async () => {
    if (!name.trim()) {
      setNameError(managementDictionary.validation.required)

      return
    }

    setLoading(true)

    try {
      const payload = {
        name,
        description,
        category: formCategory,
        is_active: isActive,
        locale
      }

      const result = editingOption ? await updateOption(editingOption.id, payload) : await createOption(payload)

      if (!result.success) {
        toast.error(result.error)

        return
      }

      toast.success(result.message)
      await refreshCategory(formCategory)
      resetForm()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setLoading(false)
    }
  }

  const toggle = async option => {
    setBusyId(option.id)

    try {
      const result = await toggleOptionStatus(option.id, !option.is_active, { locale })

      if (!result.success) {
        toast.error(result.error)

        return
      }

      toast.success(result.message)
      await refreshCategory(option.category)
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

      if (!result.success) {
        toast.error(result.error)

        return
      }

      toast.success(result.message)
      await refreshCategory(deleteTarget.category)
      setDeleteTarget(null)
    } catch {
      toast.error(managementDictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  const renderActions = option => (
    <EntityActionsMenu
      actions={[
        canWrite && { label: managementDictionary.common.edit, icon: 'tabler-edit', disabled: busyId === option.id, onClick: () => openEdit(option) },
        canWrite && { label: option.is_active ? dictionary.common.deactivate : dictionary.common.activate, icon: option.is_active ? 'tabler-toggle-right' : 'tabler-toggle-left', disabled: busyId === option.id, onClick: () => toggle(option) },
        canDelete && { label: managementDictionary.common.delete, icon: 'tabler-trash', color: 'error', disabled: busyId === option.id, onClick: () => setDeleteTarget(option) }
      ]}
      moreActionsLabel={dictionary.common.actions}
    />
  )

  return (
    <div className='grid grid-cols-1 gap-6'>
      {SECTIONS.map(section => (
        <Card key={section.category}>
          <div className='flex items-center justify-between gap-4 p-5'>
            <div className='flex items-center gap-3'>
              <span className='flex size-10 items-center justify-center rounded bg-primaryLighter text-primary'>
                <i className={`${section.icon} text-2xl`} />
              </span>
              <Typography variant='h6'>{dictionary[section.key].title}</Typography>
            </div>
            {canWrite && (
              <Button
                variant='contained'
                size='small'
                startIcon={<i className='tabler-plus' />}
                onClick={() => openCreate(section.category)}
              >
                {dictionary.common.create}
              </Button>
            )}
          </div>
          <ResponsiveDataTable
            mobileRows={data[section.category]}
            getMobileRowId={option => option.id}
            renderMobilePrimary={option => (
              <div className='min-is-0'>
                <Typography className='truncate font-medium' color='text.primary'>{option.name}</Typography>
                <Typography variant='body2' color='text.secondary' className='line-clamp-2'>{option.description || '-'}</Typography>
              </div>
            )}
            renderMobileStatus={option => (
              <Chip size='small' variant='tonal' color={option.is_active ? 'success' : 'secondary'} label={option.is_active ? dictionary.common.active : dictionary.common.inactive} />
            )}
            renderMobileActions={renderActions}
            mobileMetadata={[
              {
                id: 'created',
                label: managementDictionary.common.createdDate,
                render: option => formatDate(option.created_at, locale)
              }
            ]}
            emptyState={{ icon: section.icon, title: dictionary.common.empty, actionLabel: canWrite ? dictionary.common.create : undefined, onAction: canWrite ? () => openCreate(section.category) : undefined }}
          >
            <div className='overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>{dictionary.common.name}</th>
                  <th>{dictionary.common.description}</th>
                  <th>{dictionary.common.status}</th>
                  <th title={managementDictionary.common.createdDate}>{managementDictionary.common.createdDate}</th>
                  <th className='text-end'>{dictionary.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {data[section.category].length === 0 ? (
                  <TableEmptyStateRow
                    colSpan={5}
                    icon={section.icon}
                    title={dictionary.common.empty}
                    actionLabel={canWrite ? dictionary.common.create : null}
                    onAction={canWrite ? () => openCreate(section.category) : null}
                  />
                ) : (
                  data[section.category].map(option => (
                    <tr key={option.id}>
                      <td>
                        <Typography className='font-medium' color='text.primary'>
                          {option.name}
                        </Typography>
                      </td>
                      <td>
                        <Tooltip title={option.description || managementDictionary.common.noDescription}>
                          <Typography color='text.secondary' className='max-is-[440px] truncate'>
                            {option.description || managementDictionary.common.noDescription}
                          </Typography>
                        </Tooltip>
                      </td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={option.is_active ? 'success' : 'secondary'}
                          label={option.is_active ? dictionary.common.active : dictionary.common.inactive}
                        />
                      </td>
                      <td>{formatDate(option.created_at, locale)}</td>
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
        </Card>
      ))}

      <Dialog open={Boolean(formCategory)} onClose={closeForm} fullWidth maxWidth='sm'>
        <DialogTitle>{editingOption ? managementDictionary.common.edit : dictionary.common.add}</DialogTitle>
        <DialogContent dividers className='flex flex-col gap-4'>
          <CustomTextField
            fullWidth
            label={dictionary.common.name}
            value={name}
            onChange={event => {
              setName(event.target.value)
              if (event.target.value.trim()) setNameError('')
            }}
            error={Boolean(nameError)}
            helperText={nameError}
            disabled={loading}
          />
          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label={dictionary.common.description}
            value={description}
            onChange={event => setDescription(event.target.value)}
            disabled={loading}
          />
          <FormControlLabel
            control={
              <Switch
                color={isActive ? 'primary' : 'secondary'}
                checked={isActive}
                onChange={event => setIsActive(event.target.checked)}
              />
            }
            label={isActive ? dictionary.common.active : dictionary.common.inactive}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions className='mt-3 p-5'>
          <Button variant='tonal' color='secondary' disabled={loading} onClick={closeForm}>
            {dictionary.common.cancel}
          </Button>
          <Button variant='contained' disabled={loading} onClick={submit}>
            <LoadingButtonContent loading={loading} loadingLabel={managementDictionary.common.saving}>
              {editingOption ? managementDictionary.common.saveChanges : dictionary.common.create}
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmationDeleteModal
        open={Boolean(deleteTarget)}
        title={managementDictionary.common.delete}
        description={managementDictionary.contractPolicies.deleteDescription}
        itemName={deleteTarget?.name}
        confirmText={managementDictionary.common.delete}
        cancelText={managementDictionary.common.cancel}
        loading={busyId === deleteTarget?.id}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default PayrollOptionsView
