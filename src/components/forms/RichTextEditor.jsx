'use client'

import { useEffect } from 'react'

import Button from '@mui/material/Button'
import FormHelperText from '@mui/material/FormHelperText'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

const ToolButton = ({ label, icon, active, disabled, onClick, compact = false }) => (
  <Tooltip title={label}>
    <span>
      <Button
        type='button'
        size='small'
        color={active ? 'primary' : 'secondary'}
        variant={active ? 'tonal' : 'text'}
        disabled={disabled}
        aria-label={label}
        onClick={onClick}
        className={compact ? 'min-is-0 is-7 bs-7 p-0 sm:is-8 sm:bs-8 sm:p-1' : 'min-is-0 px-2'}
      >
        <i className={`${icon}${compact ? ' text-[0.875rem] sm:text-base' : ''}`} />
      </Button>
    </span>
  </Tooltip>
)

const RichTextEditor = ({ value = '', onChange, onBlur, label, error, helperText, disabled = false, className = '', compact = false }) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true })],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'min-bs-[150px] px-4 py-3 outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pis-6 [&_ol]:pis-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pis-0 [&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:gap-2'
      }
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? '' : current.getHTML()),
    onBlur
  })

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return
    editor.commands.setContent(value || '', { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  const command = callback => event => {
    event.preventDefault()
    callback()
  }

  const setLink = event => {
    event.preventDefault()
    const current = editor?.getAttributes('link').href || ''
    const href = window.prompt('Link URL', current)

    if (href === null) return
    if (!href) editor?.chain().focus().extendMarkRange('link').unsetLink().run()
    else editor?.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }

  return (
    <div className={className}>
      <Typography variant='body2' className={`mb-1 ${error ? 'text-error' : 'text-textSecondary'}`}>
        {label}
      </Typography>
      <div className={`overflow-hidden rounded border ${error ? 'border-error' : 'border-divider'}`}>
        <div className={`flex flex-wrap gap-1 border-be border-divider bg-actionHover p-1${compact ? ' sm:gap-1.5' : ''}`}>
          <ToolButton compact={compact} label='Bold' icon='tabler-bold' active={editor?.isActive('bold')} disabled={disabled} onClick={command(() => editor?.chain().focus().toggleBold().run())} />
          <ToolButton compact={compact} label='Italic' icon='tabler-italic' active={editor?.isActive('italic')} disabled={disabled} onClick={command(() => editor?.chain().focus().toggleItalic().run())} />
          <ToolButton compact={compact} label='Heading' icon='tabler-h-2' active={editor?.isActive('heading', { level: 2 })} disabled={disabled} onClick={command(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())} />
          <ToolButton compact={compact} label='Bulleted list' icon='tabler-list' active={editor?.isActive('bulletList')} disabled={disabled} onClick={command(() => editor?.chain().focus().toggleBulletList().run())} />
          <ToolButton compact={compact} label='Numbered list' icon='tabler-list-numbers' active={editor?.isActive('orderedList')} disabled={disabled} onClick={command(() => editor?.chain().focus().toggleOrderedList().run())} />
          <ToolButton compact={compact} label='Code block' icon='tabler-code' active={editor?.isActive('codeBlock')} disabled={disabled} onClick={command(() => editor?.chain().focus().toggleCodeBlock().run())} />
          <ToolButton compact={compact} label='Task checklist' icon='tabler-list-check' active={editor?.isActive('taskList')} disabled={disabled} onClick={command(() => editor?.chain().focus().toggleTaskList().run())} />
          <ToolButton compact={compact} label='Inline link' icon='tabler-link' active={editor?.isActive('link')} disabled={disabled} onClick={setLink} />
          <ToolButton compact={compact} label='Undo' icon='tabler-arrow-back-up' disabled={disabled || !editor?.can().undo()} onClick={command(() => editor?.chain().focus().undo().run())} />
          <ToolButton compact={compact} label='Redo' icon='tabler-arrow-forward-up' disabled={disabled || !editor?.can().redo()} onClick={command(() => editor?.chain().focus().redo().run())} />
        </div>
        <EditorContent editor={editor} />
      </div>
      {helperText && <FormHelperText error={error}>{helperText}</FormHelperText>}
    </div>
  )
}

export default RichTextEditor
