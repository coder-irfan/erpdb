'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'

const STOCK_OUT_REASONS = [
  'ASSIGNED_TO_STAFF',
  'CLIENT_PROJECT',
  'INTERNAL_OFFICE_USE',
  'DAMAGED_LOST_WRITTEN_OFF'
]

const interpolate = (message, values) =>
  Object.entries(values).reduce((result, [key, value]) => result.replace(`{${key}}`, String(value)), message)

const InventoryAdjustmentDialog = ({ open, item, options, locale, dictionary, onClose, onSaved }) => {
  const [direction, setDirection] = useState('IN')
  const [quantity, setQuantity] = useState('1')
  const [sourceVendor, setSourceVendor] = useState('')
  const [reason, setReason] = useState('ASSIGNED_TO_STAFF')
  const [assignedStaffId, setAssignedStaffId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setDirection('IN')
    setQuantity('1')
    setSourceVendor('')
    setReason('ASSIGNED_TO_STAFF')
    setAssignedStaffId('')
    setProjectId('')
    setProjects([])
    setNotes('')
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open || direction !== 'OUT' || reason !== 'CLIENT_PROJECT' || projects.length) return

    const controller = new AbortController()

    const loadProjects = async () => {
      setLoadingProjects(true)

      try {
        const response = await fetch(`/api/finance/inventory/client-project-options?locale=${locale}`, {
          cache: 'no-store',
          signal: controller.signal
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          setError({ field: 'project', message: result.error || dictionary.adjust.projectLoadFailed })

          return
        }

        setProjects(result.data.projects || [])
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError({ field: 'project', message: dictionary.adjust.projectLoadFailed })
        }
      } finally {
        if (!controller.signal.aborted) setLoadingProjects(false)
      }
    }

    loadProjects()

    return () => controller.abort()
  }, [dictionary.adjust.projectLoadFailed, direction, locale, open, projects.length, reason])

  const submit = async () => {
    const numericQuantity = Number(quantity)
    const currentStock = Number(item?.quantity_in_stock || 0)

    if (!/^[1-9]\d*$/.test(quantity) || !Number.isSafeInteger(numericQuantity)) {
      return setError({ field: 'quantity', message: dictionary.validation.adjustmentInvalid })
    }

    if (direction === 'OUT' && numericQuantity > currentStock) {
      return setError({
        field: 'quantity',
        message: interpolate(dictionary.messages.insufficientStock, { quantity: numericQuantity, currentStock })
      })
    }

    if (direction === 'OUT' && reason === 'ASSIGNED_TO_STAFF' && !assignedStaffId) {
      return setError({ field: 'staff', message: dictionary.adjust.staffRequired })
    }

    if (direction === 'OUT' && reason === 'CLIENT_PROJECT' && !projectId) {
      return setError({ field: 'project', message: dictionary.adjust.projectRequired })
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/finance/inventory/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          quantity_delta: numericQuantity,
          source_vendor: direction === 'IN' ? sourceVendor : '',
          reason: direction === 'OUT' ? reason : '',
          assigned_staff_id: direction === 'OUT' && reason === 'ASSIGNED_TO_STAFF' ? assignedStaffId : '',
          project_id: direction === 'OUT' && reason === 'CLIENT_PROJECT' ? projectId : '',
          notes,
          locale
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

      toast.success(result.message)
      onClose()
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth='sm'>
      <DialogTitle>{dictionary.adjust.title}</DialogTitle>
      <DialogContent dividers className='flex flex-col gap-4'>
        <Typography color='text.secondary'>
          {interpolate(dictionary.adjust.description, { item: item?.name || '' })}
        </Typography>
        <div className='grid grid-cols-2 gap-3 rounded bg-actionHover p-3'>
          <div>
            <Typography variant='caption' color='text.secondary'>{dictionary.fields.currentStock}</Typography>
            <Typography variant='h6'>{item?.quantity_in_stock || 0}</Typography>
          </div>
          <div>
            <Typography variant='caption' color='text.secondary'>{dictionary.adjust.resultingStock}</Typography>
            <Typography variant='h6'>
              {Math.max(0, Number(item?.quantity_in_stock || 0) + (direction === 'OUT' ? -1 : 1) * (Number(quantity) || 0))}
            </Typography>
          </div>
        </div>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={direction}
          onChange={(_, value) => {
            if (value) {
              setDirection(value)
              setError(null)
            }
          }}
        >
          <ToggleButton value='IN'><i className='tabler-package-import mie-2' />{dictionary.adjust.stockIn}</ToggleButton>
          <ToggleButton value='OUT'><i className='tabler-package-export mie-2' />{dictionary.adjust.stockOut}</ToggleButton>
        </ToggleButtonGroup>
        <CustomTextField
          autoFocus
          type='text'
          label={dictionary.adjust.quantity}
          value={quantity}
          onChange={event => {
            if (event.target.value === '' || /^\d+$/.test(event.target.value)) {
              setQuantity(event.target.value)
              setError(null)
            }
          }}
          error={error?.field === 'quantity'}
          helperText={error?.field === 'quantity' ? error.message : ''}
          inputProps={{ inputMode: 'numeric', pattern: '[1-9][0-9]*' }}
        />
        {direction === 'IN' ? (
          <CustomTextField label={dictionary.adjust.vendor} value={sourceVendor} onChange={event => setSourceVendor(event.target.value)} />
        ) : (
          <>
            <CustomTextField
              select
              label={dictionary.adjust.reason}
              value={reason}
              onChange={event => {
                setReason(event.target.value)
                setAssignedStaffId('')
                setProjectId('')
                setError(null)
              }}
            >
              {STOCK_OUT_REASONS.map(value => <MenuItem key={value} value={value}>{dictionary.adjust.reasons[value]}</MenuItem>)}
            </CustomTextField>
            {reason === 'ASSIGNED_TO_STAFF' && (
              <CustomTextField
                select
                label={dictionary.adjust.assignedStaff}
                value={assignedStaffId}
                onChange={event => {
                  setAssignedStaffId(event.target.value)
                  setError(null)
                }}
                error={error?.field === 'staff'}
                helperText={error?.field === 'staff' ? error.message : ''}
              >
                {(options.staff || []).map(staff => (
                  <MenuItem key={staff.id} value={staff.id}>{staff.full_name} · {staff.position || dictionary.adjust.staff}</MenuItem>
                ))}
              </CustomTextField>
            )}
            {reason === 'CLIENT_PROJECT' && (
              <CustomTextField
                select
                label={dictionary.adjust.clientProject}
                value={projectId}
                onChange={event => {
                  setProjectId(event.target.value)
                  setError(null)
                }}
                disabled={loadingProjects}
                error={error?.field === 'project'}
                helperText={error?.field === 'project' ? error.message : ''}
              >
                {loadingProjects && <MenuItem value='' disabled>{dictionary.adjust.loadingProjects}</MenuItem>}
                {!loadingProjects && !projects.length && <MenuItem value='' disabled>{dictionary.adjust.noProjects}</MenuItem>}
                {projects.map(project => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.client.company_name} · {project.project_code} · {project.title}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </>
        )}
        <CustomTextField
          multiline
          minRows={3}
          label={direction === 'IN' ? dictionary.adjust.notesReference : dictionary.adjust.notes}
          value={notes}
          onChange={event => setNotes(event.target.value)}
        />
      </DialogContent>
      <DialogActions className='gap-2 p-5'>
        <Button variant='tonal' color='secondary' disabled={saving} onClick={onClose}>{dictionary.actions.cancel}</Button>
        <Button variant='contained' disabled={saving} onClick={submit}>
          <LoadingButtonContent loading={saving} loadingLabel={dictionary.actions.saving}>{dictionary.adjust.record}</LoadingButtonContent>
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default InventoryAdjustmentDialog
