'use client'

import { useEffect, useRef, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Extension } from '@tiptap/core'
import Color from '@tiptap/extension-color'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { BackgroundColor, FontFamily, FontSize, LineHeight, TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { createOption, updateOption } from '@/actions/options'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import ColorPickerField from '@/components/inputs/ColorPickerField'
import { createOptionSchema } from '@/schemas/options'
import { CONTRACT_TEMPLATE_TOKEN_GROUPS, contractTemplateToken } from '@/utils/contractTemplateTokens'

import '@/libs/styles/tiptapEditor.css'

const DEFAULT_VALUES = { name: '', category: 'CONTRACT_POLICY', description: '', is_active: true }
const FONT_FAMILIES = ['Public Sans', 'Peyda', 'Vazirmatn', 'Arial', 'Georgia', 'Times New Roman', 'monospace']
const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']
const LINE_HEIGHTS = ['1', '1.25', '1.5', '1.75', '2']

const Indent = Extension.create({
  name: 'indent',
  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => {
              const dataIndent = Number(element.getAttribute('data-indent'))

              if (Number.isFinite(dataIndent) && dataIndent > 0) return dataIndent

              const margin = Number.parseFloat(element.style.marginInlineStart || element.style.marginLeft)

              return Number.isFinite(margin) ? Math.round(margin / 1.5) : 0
            },
            renderHTML: attributes =>
              attributes.indent
                ? {
                    'data-indent': attributes.indent,
                    style: `margin-inline-start: ${attributes.indent * 1.5}rem`
                  }
                : {}
          }
        }
      }
    ]
  }
})

const EditorButton = ({ active = false, label, icon, onClick, disabled = false }) => (
  <Tooltip title={label}>
    <span>
      <IconButton
        type='button'
        size='small'
        color={active ? 'primary' : 'default'}
        onClick={onClick}
        disabled={disabled}
      >
        <i className={icon} />
      </IconButton>
    </span>
  </Tooltip>
)

const ColorControl = ({ label, value, onChange, disabled }) => (
  <Tooltip title={label}>
    <span className='flex size-8 items-center justify-center'>
      <ColorPickerField
        compact
        value={value}
        onChange={onChange}
        disabled={disabled}
        label={label}
      />
    </span>
  </Tooltip>
)

const ContractPolicyForm = ({ open, option, locale, dictionary, onClose, onSaved }) => {
  const [sourceMode, setSourceMode] = useState(false)
  const [sourceHtml, setSourceHtml] = useState('')
  const sourceTextareaRef = useRef(null)

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
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      TextStyle,
      Color,
      BackgroundColor,
      FontFamily,
      FontSize,
      LineHeight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: true } }),
      Indent
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'policy-document-editor min-bs-[360px] text-textPrimary'
      }
    },
    onUpdate: ({ editor: activeEditor }) => {
      const html = activeEditor.isEmpty ? '' : activeEditor.getHTML()

      setSourceHtml(html)
      setValue('description', html, { shouldDirty: true, shouldValidate: true })
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
    setSourceHtml(values.description)
    setSourceMode(false)
    editor?.commands.setContent(values.description, { emitUpdate: false })
  }, [editor, open, option, reset])

  const resetForm = () => {
    reset(DEFAULT_VALUES)
    setSourceHtml('')
    setSourceMode(false)
    editor?.commands.setContent('', { emitUpdate: false })
  }

  const closeForm = () => {
    if (isSubmitting) return

    resetForm()
    onClose()
  }

  const submitForm = async values => {
    try {
      const payload = { ...values, description: sourceMode ? sourceHtml : values.description, locale }
      const result = option ? await updateOption(option.id, payload) : await createOption(payload)

      if (!result.success) {
        toast.error(result.error)

        return
      }

      toast.success(result.message)
      onSaved(result.data)
      resetForm()
      onClose()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    }
  }

  const setBlockType = value => {
    if (!editor) return

    if (value === 'paragraph') editor.chain().focus().setParagraph().run()
    else
      editor
        .chain()
        .focus()
        .toggleHeading({ level: Number(value) })
        .run()
  }

  const getBlockType = () => {
    if (!editor) return 'paragraph'

    const activeLevel = [1, 2, 3, 4, 5, 6].find(level => editor.isActive('heading', { level }))

    return activeLevel ? String(activeLevel) : 'paragraph'
  }

  const changeIndent = delta => {
    if (!editor) return

    const nodeType = editor.isActive('heading') ? 'heading' : 'paragraph'
    const currentIndent = Number(editor.getAttributes(nodeType).indent || 0)
    const nextIndent = Math.min(6, Math.max(0, currentIndent + delta))

    editor.chain().focus().updateAttributes(nodeType, { indent: nextIndent }).run()
  }

  const toggleSourceMode = () => {
    if (!editor) return

    if (sourceMode) {
      editor.commands.setContent(sourceHtml || '', { emitUpdate: false })
      setValue('description', sourceHtml, { shouldDirty: true, shouldValidate: true })
    } else {
      setSourceHtml(editor.getHTML())
    }

    setSourceMode(current => !current)
  }

  const insertTemplateToken = key => {
    const token = contractTemplateToken(key)

    if (!sourceMode) {
      editor?.chain().focus().insertContent(token).run()

      return
    }

    const textarea = sourceTextareaRef.current
    const start = textarea?.selectionStart ?? sourceHtml.length
    const end = textarea?.selectionEnd ?? start
    const nextValue = `${sourceHtml.slice(0, start)}${token}${sourceHtml.slice(end)}`

    setSourceHtml(nextValue)
    setValue('description', nextValue, { shouldDirty: true, shouldValidate: true })

    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const editorDisabled = isSubmitting || !editor || sourceMode
  const textColor = editor?.getAttributes('textStyle').color || '#022483'
  const highlightColor = editor?.getAttributes('textStyle').backgroundColor || '#fff3cd'

  return (
    <Dialog open={open} onClose={closeForm} fullWidth maxWidth='xl'>
      <form onSubmit={handleSubmit(submitForm)} noValidate>
        <input type='hidden' {...register('category')} />
        <DialogTitle className='flex items-center justify-between gap-4'>
          <span>{option ? dictionary.contractPolicies.editTitle : dictionary.contractPolicies.addTitle}</span>
          <IconButton
            type='button'
            onClick={closeForm}
            disabled={isSubmitting}
            aria-label={dictionary.common.close}
          >
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>
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
            <div className='mb-2 flex items-center gap-2'>
              <CustomTextField
                select
                value=''
                label='Insert template field'
                disabled={isSubmitting || !editor}
                onChange={event => insertTemplateToken(event.target.value)}
                className='is-full sm:is-[300px]'
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: () => 'Choose a field to insert…'
                  }
                }}
              >
                {CONTRACT_TEMPLATE_TOKEN_GROUPS.flatMap(group => [
                  <ListSubheader key={`${group.id}-heading`}>{group.label}</ListSubheader>,
                  ...group.tokens.map(token => (
                    <MenuItem key={token.key} value={token.key}>
                      <Tooltip title={token.description} placement={locale === 'en' ? 'right' : 'left'} arrow>
                        <span className='flex is-full items-center justify-between gap-4'>
                          <span>{token.label}</span>
                          <span className='font-mono text-xs text-textSecondary'>{contractTemplateToken(token.key)}</span>
                        </span>
                      </Tooltip>
                    </MenuItem>
                  ))
                ])}
              </CustomTextField>
            </div>
            <div className='overflow-hidden rounded border border-divider transition-colors focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgb(var(--mui-palette-primary-mainChannel)/0.16)]'>
              <div className='flex flex-wrap items-center gap-1 border-be border-divider bg-actionHover p-2'>
                <CustomTextField
                  select
                  value={getBlockType()}
                  onChange={event => setBlockType(event.target.value)}
                  disabled={editorDisabled}
                  aria-label={dictionary.editor.heading}
                  className='is-[130px]'
                >
                  <MenuItem value='paragraph'>{dictionary.editor.paragraph}</MenuItem>
                  {[1, 2, 3, 4, 5, 6].map(level => (
                    <MenuItem key={level} value={String(level)}>{`H${level}`}</MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  value={editor?.getAttributes('textStyle').fontFamily || ''}
                  onChange={event => editor?.chain().focus().setFontFamily(event.target.value).run()}
                  disabled={editorDisabled}
                  aria-label={dictionary.editor.fontFamily}
                  className='is-[150px]'
                >
                  <MenuItem value=''>{dictionary.editor.defaultFont}</MenuItem>
                  {FONT_FAMILIES.map(font => (
                    <MenuItem key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  value={editor?.getAttributes('textStyle').fontSize || ''}
                  onChange={event => editor?.chain().focus().setFontSize(event.target.value).run()}
                  disabled={editorDisabled}
                  aria-label={dictionary.editor.fontSize}
                  className='is-[90px]'
                >
                  <MenuItem value=''>{dictionary.editor.defaultSize}</MenuItem>
                  {FONT_SIZES.map(size => (
                    <MenuItem key={size} value={size}>
                      {size}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  value={editor?.getAttributes('paragraph').lineHeight || ''}
                  onChange={event => editor?.chain().focus().setLineHeight(event.target.value).run()}
                  disabled={editorDisabled}
                  aria-label={dictionary.editor.lineHeight}
                  className='is-[80px]'
                >
                  <MenuItem value=''>{dictionary.editor.lineHeight}</MenuItem>
                  {LINE_HEIGHTS.map(height => (
                    <MenuItem key={height} value={height}>
                      {height}
                    </MenuItem>
                  ))}
                </CustomTextField>

                <Divider orientation='vertical' flexItem className='mx-1' />
                <EditorButton
                  label={dictionary.editor.bold}
                  icon='tabler-bold'
                  active={editor?.isActive('bold')}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  disabled={editorDisabled}
                />
                <EditorButton
                  label={dictionary.editor.italic}
                  icon='tabler-italic'
                  active={editor?.isActive('italic')}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  disabled={editorDisabled}
                />
                <EditorButton
                  label={dictionary.editor.strike}
                  icon='tabler-strikethrough'
                  active={editor?.isActive('strike')}
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  disabled={editorDisabled}
                />
                <ColorControl
                  label={dictionary.editor.textColor}
                  value={textColor}
                  onChange={event => editor?.chain().focus().setColor(event.target.value).run()}
                  disabled={editorDisabled}
                />
                <ColorControl
                  label={dictionary.editor.highlightColor}
                  value={highlightColor}
                  onChange={event => editor?.chain().focus().setBackgroundColor(event.target.value).run()}
                  disabled={editorDisabled}
                />

                <Divider orientation='vertical' flexItem className='mx-1' />
                {[
                  ['left', 'tabler-align-left'],
                  ['center', 'tabler-align-center'],
                  ['right', 'tabler-align-right'],
                  ['justify', 'tabler-align-justified']
                ].map(([alignment, icon]) => (
                  <EditorButton
                    key={alignment}
                    label={dictionary.editor[`align${alignment.charAt(0).toUpperCase()}${alignment.slice(1)}`]}
                    icon={icon}
                    active={editor?.isActive({ textAlign: alignment })}
                    onClick={() => editor?.chain().focus().setTextAlign(alignment).run()}
                    disabled={editorDisabled}
                  />
                ))}
                <EditorButton
                  label={dictionary.editor.outdent}
                  icon='tabler-indent-decrease'
                  onClick={() => changeIndent(-1)}
                  disabled={editorDisabled}
                />
                <EditorButton
                  label={dictionary.editor.indent}
                  icon='tabler-indent-increase'
                  onClick={() => changeIndent(1)}
                  disabled={editorDisabled}
                />

                <Divider orientation='vertical' flexItem className='mx-1' />
                <EditorButton
                  label={dictionary.editor.bulletList}
                  icon='tabler-list'
                  active={editor?.isActive('bulletList')}
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  disabled={editorDisabled}
                />
                <EditorButton
                  label={dictionary.editor.orderedList}
                  icon='tabler-list-numbers'
                  active={editor?.isActive('orderedList')}
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  disabled={editorDisabled}
                />
                <EditorButton
                  label={dictionary.editor.blockquote}
                  icon='tabler-blockquote'
                  active={editor?.isActive('blockquote')}
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  disabled={editorDisabled}
                />
                <EditorButton
                  label={dictionary.editor.horizontalRule}
                  icon='tabler-separator-horizontal'
                  onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                  disabled={editorDisabled}
                />
                <EditorButton
                  label={dictionary.editor.codeBlock}
                  icon='tabler-code'
                  active={editor?.isActive('codeBlock')}
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                  disabled={editorDisabled}
                />

                <Divider orientation='vertical' flexItem className='mx-1' />
                <EditorButton
                  label={dictionary.editor.insertTable}
                  icon='tabler-table-plus'
                  onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                  disabled={editorDisabled}
                />
                <EditorButton
                  label={dictionary.editor.addColumn}
                  icon='tabler-column-insert-right'
                  onClick={() => editor?.chain().focus().addColumnAfter().run()}
                  disabled={editorDisabled || !editor?.isActive('table')}
                />
                <EditorButton
                  label={dictionary.editor.deleteColumn}
                  icon='tabler-column-remove'
                  onClick={() => editor?.chain().focus().deleteColumn().run()}
                  disabled={editorDisabled || !editor?.isActive('table')}
                />
                <EditorButton
                  label={dictionary.editor.addRow}
                  icon='tabler-row-insert-bottom'
                  onClick={() => editor?.chain().focus().addRowAfter().run()}
                  disabled={editorDisabled || !editor?.isActive('table')}
                />
                <EditorButton
                  label={dictionary.editor.deleteRow}
                  icon='tabler-row-remove'
                  onClick={() => editor?.chain().focus().deleteRow().run()}
                  disabled={editorDisabled || !editor?.isActive('table')}
                />
                <EditorButton
                  label={dictionary.editor.deleteTable}
                  icon='tabler-table-off'
                  onClick={() => editor?.chain().focus().deleteTable().run()}
                  disabled={editorDisabled || !editor?.isActive('table')}
                />

                <Divider orientation='vertical' flexItem className='mx-1' />
                <EditorButton
                  label={dictionary.editor.undo}
                  icon='tabler-arrow-back-up'
                  onClick={() => editor?.chain().focus().undo().run()}
                  disabled={editorDisabled || !editor?.can().chain().focus().undo().run()}
                />
                <EditorButton
                  label={dictionary.editor.redo}
                  icon='tabler-arrow-forward-up'
                  onClick={() => editor?.chain().focus().redo().run()}
                  disabled={editorDisabled || !editor?.can().chain().focus().redo().run()}
                />
                <EditorButton
                  label={dictionary.editor.sourceCode}
                  icon='tabler-file-code'
                  active={sourceMode}
                  onClick={toggleSourceMode}
                  disabled={isSubmitting || !editor}
                />
              </div>

              {sourceMode ? (
                <textarea
                  ref={sourceTextareaRef}
                  value={sourceHtml}
                  onChange={event => {
                    setSourceHtml(event.target.value)
                    setValue('description', event.target.value, { shouldDirty: true, shouldValidate: true })
                  }}
                  aria-label={dictionary.editor.sourceCode}
                  spellCheck={false}
                  className='min-bs-[420px] w-full resize-y bg-backgroundPaper p-5 font-mono text-sm leading-6 text-textPrimary outline-none'
                />
              ) : (
                <EditorContent editor={editor} />
              )}
            </div>
            {errors.description && <p className='mt-1 text-sm text-error'>{errors.description.message}</p>}
          </div>

          <Controller
            name='is_active'
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    color={field.value ? 'primary' : 'secondary'}
                    checked={field.value}
                    onChange={event => field.onChange(event.target.checked)}
                  />
                }
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
