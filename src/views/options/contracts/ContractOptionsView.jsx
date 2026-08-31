'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
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

const ClauseEditorButton = ({ label, icon, active = false, disabled = false, onClick }) => (
  <Tooltip title={label}>
    <span>
      <IconButton
        type='button'
        size='small'
        color={active ? 'primary' : 'default'}
        disabled={disabled}
        aria-label={label}
        onClick={onClick}
      >
        <i className={icon} />
      </IconButton>
    </span>
  </Tooltip>
)

const LegalClauseEditor = ({ value, disabled, onChange }) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false })],
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          'min-bs-[180px] px-4 py-3 text-textPrimary outline-none [&_p]:my-2 [&_blockquote]:my-3 [&_blockquote]:border-is-4 [&_blockquote]:border-divider [&_blockquote]:pis-3 [&_ol]:list-decimal [&_ol]:pis-6 [&_ul]:list-disc [&_ul]:pis-6'
      }
    },
    onUpdate: ({ editor: activeEditor }) => onChange(activeEditor.isEmpty ? '' : activeEditor.getHTML())
  })

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor) return

    const currentValue = editor.isEmpty ? '' : editor.getHTML()

    if (currentValue !== (value || '')) editor.commands.setContent(value || '', { emitUpdate: false })
  }, [editor, value])

  const editorDisabled = disabled || !editor

  return (
    <div className='overflow-hidden rounded border border-divider transition-colors focus-within:border-primary'>
      <div className='flex items-center gap-1 border-be border-divider bg-actionHover p-2'>
        <ClauseEditorButton label='Bold' icon='tabler-bold' active={editor?.isActive('bold')} disabled={editorDisabled} onClick={() => editor?.chain().focus().toggleBold().run()} />
        <ClauseEditorButton label='Italic' icon='tabler-italic' active={editor?.isActive('italic')} disabled={editorDisabled} onClick={() => editor?.chain().focus().toggleItalic().run()} />
        <ClauseEditorButton label='Bulleted list' icon='tabler-list' active={editor?.isActive('bulletList')} disabled={editorDisabled} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
        <ClauseEditorButton label='Numbered list' icon='tabler-list-numbers' active={editor?.isActive('orderedList')} disabled={editorDisabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
        <ClauseEditorButton label='Quoted clause' icon='tabler-blockquote' active={editor?.isActive('blockquote')} disabled={editorDisabled} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
        <ClauseEditorButton label='Undo' icon='tabler-arrow-back-up' disabled={editorDisabled || !editor?.can().chain().focus().undo().run()} onClick={() => editor?.chain().focus().undo().run()} />
        <ClauseEditorButton label='Redo' icon='tabler-arrow-forward-up' disabled={editorDisabled || !editor?.can().chain().focus().redo().run()} onClick={() => editor?.chain().focus().redo().run()} />
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

const OptionDescription = ({ option, mobile = false }) => {
  if (!option.description) return <span>—</span>
  if (option.category !== 'CONTRACT_CLAUSE') return <span>{option.description}</span>

  return (
    <div
      className={`${mobile ? 'line-clamp-2' : 'max-is-[420px] line-clamp-2'} text-sm text-textSecondary [&_ol]:list-decimal [&_ol]:pis-5 [&_ul]:list-disc [&_ul]:pis-5`}
      dangerouslySetInnerHTML={{ __html: option.description }}
    />
  )
}

export const CONTRACT_OPTION_SECTIONS = [
  { category: 'CONTRACT_DURATION', key: 'durations', icon: 'tabler-calendar-time' },
  { category: 'CONTRACT_CLAUSE', key: 'clauses', icon: 'tabler-file-text' }
]

export const INVOICE_OPTION_SECTIONS = [
  { category: 'PAYMENT_METHOD', key: 'paymentMethods', icon: 'tabler-credit-card' }
]

const ContractOptionsView = ({
  initialData,
  canWrite,
  canDelete,
  locale,
  dictionary,
  managementDictionary,
  sections = CONTRACT_OPTION_SECTIONS
}) => {
  const [data, setData] = useState(initialData)
  const [formCategory, setFormCategory] = useState(null)
  const [editingOption, setEditingOption] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const refreshCategory = async category => {
    const result = await getOptionsListPaginated({ category, page: 1, limit: 100, locale })

    if (!result.success) return toast.error(result.error)
    setData(current => ({ ...current, [category]: result.data.options }))
  }

  const resetForm = () => {
    setFormCategory(null)
    setEditingOption(null)
    setName('')
    setDescription('')
    setNameError('')
  }

  const openCreate = category => {
    resetForm()
    setFormCategory(category)
  }

  const openEdit = option => {
    setFormCategory(option.category)
    setEditingOption(option)
    setName(option.name || '')
    setDescription(option.description || '')
    setNameError('')
  }

  const submit = async () => {
    if (!name.trim()) return setNameError(managementDictionary.validation.required)
    setLoading(true)

    try {
      const payload = { name, description, category: formCategory, is_active: editingOption?.is_active ?? true, locale }
      const result = editingOption ? await updateOption(editingOption.id, payload) : await createOption(payload)

      if (!result.success) return toast.error(result.error)
      toast.success(result.message)
      await refreshCategory(formCategory)
      resetForm()
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

      if (!result.success) return toast.error(result.error)
      toast.success(result.message)
      await refreshCategory(option.category)
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
      await refreshCategory(deleteTarget.category)
      setDeleteTarget(null)
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
    <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
      {sections.map(section => (
        <Card key={section.category}>
          <div className='flex items-center justify-between gap-4 p-5'>
            <div className='flex items-center gap-3'>
              <span className='flex size-10 items-center justify-center rounded bg-primaryLighter text-primary'>
                <i className={`${section.icon} text-2xl`} />
              </span>
              <div>
                <Typography variant='h6'>{dictionary[section.key].title}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {dictionary[section.key].description}
                </Typography>
              </div>
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
                <OptionDescription option={option} mobile />
              </div>
            )}
            renderMobileStatus={option => (
              <Chip size='small' variant='tonal' color={option.is_active ? 'success' : 'secondary'} label={option.is_active ? dictionary.common.active : dictionary.common.inactive} />
            )}
            renderMobileActions={renderActions}
            emptyState={{ icon: section.icon, title: dictionary.common.empty, actionLabel: canWrite ? dictionary.common.create : undefined, onAction: canWrite ? () => openCreate(section.category) : undefined }}
          >
            <div className='no-scrollbar overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>{dictionary.common.name}</th>
                  <th>{dictionary.common.status}</th>
                  <th className='text-end'>{dictionary.common.actions}</th>
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
                        <OptionDescription option={option} />
                      </td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={option.is_active ? 'success' : 'secondary'}
                          label={option.is_active ? dictionary.common.active : dictionary.common.inactive}
                        />
                      </td>
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

      <Dialog open={Boolean(formCategory)} onClose={loading ? undefined : resetForm} fullWidth maxWidth='sm'>
        <DialogTitle className='flex items-center justify-between gap-4'>
          <span>{editingOption ? dictionary.common.edit : dictionary.common.add}</span>
          <IconButton
            onClick={resetForm}
            disabled={loading}
            aria-label={managementDictionary.common.close || 'Close'}
          >
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>
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
          {formCategory === 'CONTRACT_CLAUSE' ? (
            <div>
              <Typography variant='body2' className='mb-2 font-medium'>
                {dictionary.common.description}
              </Typography>
              <LegalClauseEditor value={description} disabled={loading} onChange={setDescription} />
            </div>
          ) : (
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label={dictionary.common.description}
              value={description}
              onChange={event => setDescription(event.target.value)}
              disabled={loading}
              helperText={formCategory === 'CONTRACT_DURATION' ? dictionary.durationHint : undefined}
            />
          )}
        </DialogContent>
        <DialogActions className='p-5'>
          <Button variant='tonal' color='secondary' disabled={loading} onClick={resetForm}>
            {dictionary.common.cancel}
          </Button>
          <Button variant='contained' disabled={loading} onClick={submit}>
            <LoadingButtonContent loading={loading} loadingLabel={dictionary.common.saving}>
              {editingOption ? dictionary.common.save : dictionary.common.create}
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={managementDictionary.common.delete}
        description={dictionary.deleteDescription}
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

export default ContractOptionsView
