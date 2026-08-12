'use client'

import { useEffect } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import { valibotResolver } from '@hookform/resolvers/valibot'
import TextAlign from '@tiptap/extension-text-align'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { createOption, updateOption } from '@/actions/options'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createOptionSchema } from '@/schemas/options'

import '@/libs/styles/tiptapEditor.css'

const DEFAULT_VALUES = { name: '', category: 'CONTRACT_POLICY', description: '', is_active: true }

const EditorButton = ({ active = false, label, icon, onClick, disabled = false }) => (
  <Tooltip title={label}>
    <span>
      <IconButton size='small' color={active ? 'primary' : 'default'} onClick={onClick} disabled={disabled}>
        <i className={icon} />
      </IconButton>
    </span>
  </Tooltip>
)

const ContractPolicyForm = ({ open, option, locale, dictionary, onClose, onSaved }) => {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createOptionSchema(dictionary.validation)),
    defaultValues: DEFAULT_VALUES
  })

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })],
    content: '',
    editorProps: {
      attributes: {
        class: 'min-bs-[180px] text-textPrimary'
      }
    },
    onUpdate: ({ editor: activeEditor }) => {
      setValue('description', activeEditor.isEmpty ? '' : activeEditor.getHTML(), {
        shouldDirty: true,
        shouldValidate: true
      })
    }
  })

  useEffect(() => {
    if (!open) return

    const values = option
      ? {
          name: option.name || '',
          category: 'CONTRACT_POLICY',
          description: option.description || '',
          is_active: option.is_active
        }
      : DEFAULT_VALUES

    reset(values)
    editor?.commands.setContent(values.description, { emitUpdate: false })
  }, [editor, open, option, reset])

  const closeForm = () => {
    if (!isSubmitting) onClose()
  }

  const submitForm = async values => {
    try {
      const payload = { ...values, category: 'CONTRACT_POLICY', locale }
      const result = option ? await updateOption(option.id, payload) : await createOption(payload)

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

  const toolbarButtons = [
    {
      key: 'bold',
      label: dictionary.editor.bold,
      icon: 'tabler-bold',
      active: editor?.isActive('bold'),
      action: () => editor?.chain().focus().toggleBold().run()
    },
    {
      key: 'italic',
      label: dictionary.editor.italic,
      icon: 'tabler-italic',
      active: editor?.isActive('italic'),
      action: () => editor?.chain().focus().toggleItalic().run()
    },
    {
      key: 'heading',
      label: dictionary.editor.heading,
      icon: 'tabler-h-2',
      active: editor?.isActive('heading', { level: 2 }),
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
      key: 'bulletList',
      label: dictionary.editor.bulletList,
      icon: 'tabler-list',
      active: editor?.isActive('bulletList'),
      action: () => editor?.chain().focus().toggleBulletList().run()
    },
    {
      key: 'orderedList',
      label: dictionary.editor.orderedList,
      icon: 'tabler-list-numbers',
      active: editor?.isActive('orderedList'),
      action: () => editor?.chain().focus().toggleOrderedList().run()
    },
    {
      key: 'alignLeft',
      label: dictionary.editor.alignLeft,
      icon: 'tabler-align-left',
      active: editor?.isActive({ textAlign: 'left' }),
      action: () => editor?.chain().focus().setTextAlign('left').run()
    },
    {
      key: 'alignCenter',
      label: dictionary.editor.alignCenter,
      icon: 'tabler-align-center',
      active: editor?.isActive({ textAlign: 'center' }),
      action: () => editor?.chain().focus().setTextAlign('center').run()
    },
    {
      key: 'alignRight',
      label: dictionary.editor.alignRight,
      icon: 'tabler-align-right',
      active: editor?.isActive({ textAlign: 'right' }),
      action: () => editor?.chain().focus().setTextAlign('right').run()
    }
  ]

  return (
    <Dialog open={open} onClose={closeForm} fullWidth maxWidth='md'>
      <form onSubmit={handleSubmit(submitForm)} noValidate>
        <input type='hidden' {...register('category')} />
        <DialogTitle>{option ? dictionary.contractPolicies.editTitle : dictionary.contractPolicies.addTitle}</DialogTitle>
        <DialogContent dividers className='flex flex-col gap-5'>
          <CustomTextField
            fullWidth
            label={dictionary.contractPolicies.fields.name}
            placeholder={dictionary.contractPolicies.fields.namePlaceholder}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            disabled={isSubmitting}
            {...register('name')}
          />

          <div>
            <div className='mb-2 text-sm font-medium text-textPrimary'>
              {dictionary.contractPolicies.fields.description}
            </div>
            <div className='overflow-hidden rounded border border-divider transition-colors focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgb(var(--mui-palette-primary-mainChannel)/0.16)]'>
              <div className='flex flex-wrap gap-1 border-be border-divider bg-actionHover p-2'>
                {toolbarButtons.map(button => (
                  <EditorButton
                    key={button.key}
                    active={button.active}
                    label={button.label}
                    icon={button.icon}
                    onClick={button.action}
                    disabled={isSubmitting || !editor}
                  />
                ))}
              </div>
              <EditorContent editor={editor} />
            </div>
            {errors.description && <p className='mt-1 text-sm text-error'>{errors.description.message}</p>}
          </div>

          <Controller
            name='is_active'
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={event => field.onChange(event.target.checked)} />}
                label={field.value ? dictionary.common.active : dictionary.common.inactive}
                disabled={isSubmitting}
              />
            )}
          />
        </DialogContent>
        <DialogActions className='p-5'>
          <Button variant='tonal' color='secondary' onClick={closeForm} disabled={isSubmitting}>
            {dictionary.common.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.common.saving}>
              {option ? dictionary.common.saveChanges : dictionary.common.create}
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ContractPolicyForm
