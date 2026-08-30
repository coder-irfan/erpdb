'use client'

import { useMemo, useState } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'

import { useNotifications } from '@/contexts/NotificationProvider'
import { formatAfghanDateTime } from '@/utils/afghanDate'
import { getLocalizedUrl } from '@/utils/i18n'

const PRIORITY = {
  CRITICAL: { icon: 'tabler-alert-octagon', className: 'border-error/40 bg-errorLight text-error' },
  URGENT: { icon: 'tabler-alert-triangle', className: 'border-error/35 bg-errorLight text-error' },
  WARNING: { icon: 'tabler-alert-circle', className: 'border-warning/40 bg-warningLight text-warning' },
  INFO: { icon: 'tabler-info-circle', className: 'border-info/40 bg-infoLight text-info' }
}

const CATEGORY_ICONS = {
  CONTRACT: 'tabler-file-time',
  HRM: 'tabler-users',
  TASK: 'tabler-list-check',
  PROJECT: 'tabler-briefcase',
  FINANCE: 'tabler-cash-banknote',
  PAYROLL: 'tabler-receipt',
  INVENTORY: 'tabler-package'
}

const TEXT = {
  en: { view: 'View details', dismissAll: 'Dismiss all', more: '{count} more alerts', next: 'Show next', priorities: { CRITICAL: 'Critical', URGENT: 'Urgent', WARNING: 'Warning', INFO: 'Info' } },
  fa: { view: 'مشاهده جزئیات', dismissAll: 'بستن همه', more: '{count} اعلان دیگر', next: 'نمایش بعدی', priorities: { CRITICAL: 'بحرانی', URGENT: 'عاجل', WARNING: 'هشدار', INFO: 'اطلاعات' } },
  ps: { view: 'جزیات کتل', dismissAll: 'ټول بندول', more: '{count} نور خبرتیاوې', next: 'راتلونکي ښودل', priorities: { CRITICAL: 'بحراني', URGENT: 'بېړنی', WARNING: 'خبرتیا', INFO: 'معلومات' } }
}

export const RoleNotificationCard = ({ notification, locale, onAction, onDismiss }) => {
  const appearance = PRIORITY[notification.priority] || PRIORITY.INFO
  const labels = TEXT[locale] || TEXT.en

  return (
    <article
      dir={locale === 'fa' || locale === 'ps' ? 'rtl' : 'ltr'}
      className='pointer-events-auto w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-divider bg-backgroundPaper shadow-[0_16px_48px_rgba(0,0,0,0.18)]'
    >
      <div className='flex items-center gap-2 border-b border-divider px-4 py-3'>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${appearance.className}`}>
          <i className={`${appearance.icon} text-sm`} aria-hidden='true' />
          {labels.priorities[notification.priority] || notification.priority}
        </span>
        <span className='ms-auto flex size-8 items-center justify-center rounded-lg bg-actionHover text-textSecondary'>
          <i className={`${CATEGORY_ICONS[notification.category] || 'tabler-bell'} text-lg`} aria-hidden='true' />
        </span>
        <IconButton size='small' aria-label={labels.dismissAll} onClick={() => onDismiss(notification.id)}>
          <i className='tabler-x text-lg' />
        </IconButton>
      </div>
      <div className='px-4 py-4'>
        <h3 className='text-[15px] font-bold leading-6 text-textPrimary'>{notification.title}</h3>
        <p className='mt-1.5 text-sm leading-6 text-textSecondary'>{notification.description}</p>
        <time className='mt-3 flex items-center gap-1.5 text-xs text-textDisabled' dateTime={notification.timestamp}>
          <i className='tabler-clock text-sm' aria-hidden='true' />
          {formatAfghanDateTime(notification.timestamp, locale, { dateStyle: 'medium' })}
        </time>
      </div>
      {notification.actionUrl && (
        <div className='border-t border-divider px-4 py-3'>
          <Button fullWidth size='small' variant='tonal' onClick={() => onAction(notification)} endIcon={<i className={locale === 'en' ? 'tabler-arrow-right' : 'tabler-arrow-left'} />}>
            {labels.view}
          </Button>
        </div>
      )}
    </article>
  )
}

const RoleNotificationStack = () => {
  const { lang: locale = 'en' } = useParams()
  const router = useRouter()
  const { notifications, markRead, dismiss, dismissAll } = useNotifications()
  const [page, setPage] = useState(0)
  const labels = TEXT[locale] || TEXT.en

  const queued = useMemo(
    () => notifications.filter(item => item.unread && ['CRITICAL', 'URGENT', 'WARNING'].includes(item.priority)),
    [notifications]
  )

  const pageCount = Math.max(1, Math.ceil(queued.length / 3))
  const safePage = Math.min(page, pageCount - 1)
  const visible = queued.slice(safePage * 3, safePage * 3 + 3)
  const hiddenCount = Math.max(0, queued.length - visible.length)

  if (!visible.length) return null

  const act = async notification => {
    await markRead(notification.id)
    router.push(getLocalizedUrl(notification.actionUrl, locale))
  }

  return (
    <aside
      className={`pointer-events-none fixed bottom-6 z-[1300] flex max-h-[calc(100vh-3rem)] flex-col gap-5 overflow-y-auto ${locale === 'fa' || locale === 'ps' ? 'left-4 sm:left-6' : 'right-4 sm:right-6'}`}
      aria-label='Priority notifications'
    >
      <div className='pointer-events-auto flex items-center justify-end gap-2 rounded-xl border border-divider bg-backgroundPaper/95 px-3 py-2 shadow-lg backdrop-blur'>
        {queued.length > 3 && (
          <Button size='small' variant='text' onClick={() => setPage(current => (current + 1) % pageCount)}>
            {labels.more.replace('{count}', hiddenCount)} · {labels.next}
          </Button>
        )}
        <Button size='small' color='error' variant='text' onClick={dismissAll}>{labels.dismissAll}</Button>
      </div>
      {visible.map(notification => (
        <RoleNotificationCard key={notification.id} notification={notification} locale={locale} onAction={act} onDismiss={dismiss} />
      ))}
    </aside>
  )
}

export default RoleNotificationStack
