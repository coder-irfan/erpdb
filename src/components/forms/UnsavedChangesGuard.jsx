'use client'

import { useEffect, useRef, useState } from 'react'

import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'

const OVERLAY_SELECTOR = '.MuiDialog-root, .MuiDrawer-root'
const CLOSE_LABEL_PATTERN = /^(cancel|close|dismiss|back|لغو|بستن|تړل|شاته)$/i

const getOverlay = target => target instanceof Element ? target.closest(OVERLAY_SELECTOR) : null

const isFormFieldEvent = target => {
  if (!(target instanceof Element)) return false

  return Boolean(target.closest('form') && target.matches('input, textarea, select, [contenteditable="true"]'))
}

const isCloseButton = target => {
  if (!(target instanceof Element)) return false

  const button = target.closest('button, [role="button"]')

  if (!button) return false
  if (button.hasAttribute('data-unsaved-close')) return true
  if (button.querySelector('i.tabler-x, i[class~="tabler-x"]')) return true

  const label = (button.getAttribute('aria-label') || button.textContent || '').trim()

  return CLOSE_LABEL_PATTERN.test(label)
}

const copyKeyboardEvent = event =>
  new KeyboardEvent('keydown', {
    key: event.key,
    code: event.code,
    bubbles: true,
    cancelable: true
  })

const messagesFor = locale => {
  if (locale === 'fa' || locale === 'ps') {
    return {
      title: 'تغییرات ذخیره نشده',
      description: 'شما تغییرات ذخیره‌نشده دارید. آیا از لغو آن مطمئن هستید؟',
      discard: 'لغو',
      keepEditing: 'ادامه ویرایش'
    }
  }

  return {
    title: 'Unsaved Changes',
    description: 'You have unsaved changes. Are you sure you want to discard them?',
    discard: 'Discard',
    keepEditing: 'Keep Editing'
  }
}

/**
 * Application-wide protection for forms rendered inside MUI dialogs/drawers.
 * Native input/change events mark only the containing overlay as dirty, so
 * programmatic form initialization and untouched overlays remain unaffected.
 */
const UnsavedChangesGuard = ({ children }) => {
  const [pendingClose, setPendingClose] = useState(null)
  const dirtyOverlaysRef = useRef(new Set())
  const bypassOverlayRef = useRef(null)
  const confirmationOpenRef = useRef(false)
  const pendingOverlayRef = useRef(null)

  useEffect(() => {
    const dirtyOverlays = dirtyOverlaysRef.current

    const markDirty = event => {
      if (!isFormFieldEvent(event.target)) return

      const overlay = getOverlay(event.target)

      if (overlay && !overlay.hasAttribute('data-unsaved-confirmation')) dirtyOverlays.add(overlay)
    }

    const clearResetForm = event => {
      const overlay = getOverlay(event.target)

      if (overlay) dirtyOverlays.delete(overlay)
    }

    const blockEvent = event => {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation?.()
    }

    const requestClose = (event, overlay, continueClose) => {
      if (bypassOverlayRef.current === overlay) {
        bypassOverlayRef.current = null
        dirtyOverlays.delete(overlay)

        return false
      }

      if (!overlay || !dirtyOverlays.has(overlay)) return false

      blockEvent(event)
      confirmationOpenRef.current = true
      pendingOverlayRef.current = overlay
      setPendingClose({ overlay, continueClose })

      return true
    }

    const interceptClick = event => {
      const overlay = getOverlay(event.target)

      if (!overlay || overlay.hasAttribute('data-unsaved-confirmation')) return

      const isBackdrop = event.target.classList?.contains('MuiBackdrop-root')

      if (!isBackdrop && !isCloseButton(event.target)) return

      requestClose(event, overlay, () => {
        const button = event.target.closest('button, [role="button"]')

        if (button) button.click()
        else event.target.click()
      })
    }

    const interceptEscape = event => {
      if (event.key !== 'Escape') return
      if (confirmationOpenRef.current) return

      const overlays = [...document.querySelectorAll(OVERLAY_SELECTOR)]
      const overlay = overlays.reverse().find(candidate => dirtyOverlays.has(candidate))

      if (!overlay || overlay.hasAttribute('data-unsaved-confirmation')) return

      const target = event.target

      requestClose(event, overlay, () => target.dispatchEvent(copyKeyboardEvent(event)))
    }

    const warnBeforeUnload = event => {
      if (!dirtyOverlays.size) return

      event.preventDefault()
      event.returnValue = ''
    }

    const cleanupClosedOverlays = () => {
      dirtyOverlays.forEach(overlay => {
        const hiddenAndNotConfirming =
          overlay.getAttribute('aria-hidden') === 'true' && overlay !== pendingOverlayRef.current

        if (!overlay.isConnected || hiddenAndNotConfirming) dirtyOverlays.delete(overlay)
      })
    }

    const observer = new MutationObserver(cleanupClosedOverlays)

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-hidden'] })
    document.addEventListener('input', markDirty, true)
    document.addEventListener('change', markDirty, true)
    document.addEventListener('reset', clearResetForm, true)
    document.addEventListener('click', interceptClick, true)
    document.addEventListener('keydown', interceptEscape, true)
    window.addEventListener('beforeunload', warnBeforeUnload)

    return () => {
      observer.disconnect()
      document.removeEventListener('input', markDirty, true)
      document.removeEventListener('change', markDirty, true)
      document.removeEventListener('reset', clearResetForm, true)
      document.removeEventListener('click', interceptClick, true)
      document.removeEventListener('keydown', interceptEscape, true)
      window.removeEventListener('beforeunload', warnBeforeUnload)
    }
  }, [])

  const locale = typeof document === 'undefined' ? 'en' : document.documentElement.lang.split('-')[0]
  const messages = messagesFor(locale)

  const discard = () => {
    const request = pendingClose

    if (!request) return

    bypassOverlayRef.current = request.overlay
    confirmationOpenRef.current = false
    pendingOverlayRef.current = null
    setPendingClose(null)
    window.setTimeout(request.continueClose, 0)
  }

  return (
    <>
      {children}
      <div data-unsaved-confirmation='true'>
        <ConfirmDeleteModal
          open={Boolean(pendingClose)}
          title={messages.title}
          description={messages.description}
          confirmText={messages.discard}
          cancelText={messages.keepEditing}
          onConfirm={discard}
          onClose={() => {
            confirmationOpenRef.current = false
            pendingOverlayRef.current = null
            setPendingClose(null)
          }}
        />
      </div>
    </>
  )
}

export default UnsavedChangesGuard
