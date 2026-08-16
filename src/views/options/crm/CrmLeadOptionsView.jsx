'use client'

import { useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
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
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'

import tableStyles from '@core/styles/table.module.css'

const SECTIONS = [
  { category: 'LEAD_STATUS', key: 'statuses', icon: 'tabler-progress-check' },
  { category: 'LEAD_SOURCE', key: 'sources', icon: 'tabler-affiliate' }
]

const CrmLeadOptionsView = ({ initialData, canWrite, canDelete, locale, dictionary, managementDictionary }) => {
  const [data, setData] = useState(initialData)
  const [category, setCategory] = useState(null)
  const [editingOption, setEditingOption] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const refresh = async targetCategory => {
    const result = await getOptionsListPaginated({ category: targetCategory, page: 1, limit: 100, locale })

    if (!result.success) {
      toast.error(result.error)

      return
    }

    setData(current => ({ ...current, [targetCategory]: result.data.options }))
  }

  const closeForm = () => {
    if (loading) return

    setCategory(null)
    setEditingOption(null)
    setName('')
    setDescription('')
    setNameError('')
  }

  const openCreate = targetCategory => {
    setCategory(targetCategory)
    setEditingOption(null)
    setName('')
    setDescription('')
    setNameError('')
  }

  const openEdit = option => {
    setCategory(option.category)
    setEditingOption(option)
    setName(option.name || '')
    setDescription(option.description || '')
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
        category,
        is_active: editingOption?.is_active ?? true,
        locale
      }

      const result = editingOption ? await updateOption(editingOption.id, payload) : await createOption(payload)

      if (!result.success) {
        toast.error(result.error)

        return
      }

      toast.success(result.message)
      await refresh(category)
      setCategory(null)
      setEditingOption(null)
      setName('')
      setDescription('')
      setNameError('')
    } catch {
      toast.error(managementDictionary.messages.operationFailed)
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
      await refresh(option.category)
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
      await refresh(deleteTarget.category)
      setDeleteTarget(null)
    } catch {
      toast.error(managementDictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
      {SECTIONS.map(section => (
        <Card key={section.category}>
          <CardHeader
            title={dictionary[section.key].title}
            subheader={dictionary[section.key].description}
            avatar={
              <span className='flex size-10 items-center justify-center rounded bg-primaryLighter text-primary'>
                <i className={`${section.icon} text-2xl`} />
              </span>
            }
            action={
              canWrite ? (
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<i className='tabler-plus' />}
                  onClick={() => openCreate(section.category)}
                >
                  {dictionary.common.create}
                </Button>
              ) : null
            }
          />
          <div className='overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>{dictionary.common.name}</th>
                  <th>{dictionary.common.status}</th>
                  <th className='text-right'>{dictionary.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {data[section.category].length === 0 ? (
                  <TableEmptyStateRow
                    colSpan={3}
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
                        <Typography variant='body2' color='text.secondary'>
                          {option.description}
                        </Typography>
                      </td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={option.is_active ? 'success' : 'secondary'}
                          label={option.is_active ? dictionary.common.active : dictionary.common.inactive}
                        />
                      </td>
                      <td className='text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          {canWrite && (
                            <>
                              <Tooltip title={managementDictionary.common.edit}>
                                <IconButton disabled={busyId === option.id} onClick={() => openEdit(option)}>
                                  <i className='tabler-edit' />
                                </IconButton>
                              </Tooltip>
                              <Tooltip
                                title={option.is_active ? dictionary.common.deactivate : dictionary.common.activate}
                              >
                                <IconButton
                                  color={option.is_active ? 'primary' : 'secondary'}
                                  disabled={busyId === option.id}
                                  onClick={() => toggle(option)}
                                >
                                  <i className={option.is_active ? 'tabler-toggle-right' : 'tabler-toggle-left'} />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {canDelete && (
                            <Tooltip title={managementDictionary.common.delete}>
                              <IconButton
                                color='error'
                                disabled={busyId === option.id}
                                onClick={() => setDeleteTarget(option)}
                              >
                                <i className='tabler-trash' />
                              </IconButton>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <Dialog open={Boolean(category)} onClose={closeForm} fullWidth maxWidth='sm'>
        <DialogTitle>{editingOption ? managementDictionary.common.edit : dictionary.common.add}</DialogTitle>
        <DialogContent dividers className='flex flex-col gap-4'>
          <CustomTextField
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
            multiline
            minRows={3}
            label={dictionary.common.description}
            value={description}
            onChange={event => setDescription(event.target.value)}
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

      <ConfirmDeleteModal
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

export default CrmLeadOptionsView
