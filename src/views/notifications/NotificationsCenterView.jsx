'use client'

import { useMemo } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { useNotifications } from '@/contexts/NotificationProvider'
import { formatAfghanDateTime } from '@/utils/afghanDate'
import { getLocalizedUrl } from '@/utils/i18n'

const PRIORITY_COLORS = { CRITICAL: 'error', URGENT: 'error', WARNING: 'warning', INFO: 'info' }

const CATEGORY_ICONS = {
  CONTRACT: 'tabler-file-time',
  CRM: 'tabler-user-search',
  HRM: 'tabler-users',
  TASK: 'tabler-list-check',
  PROJECT: 'tabler-briefcase',
  FINANCE: 'tabler-cash-banknote',
  PAYROLL: 'tabler-receipt',
  INVENTORY: 'tabler-package',
  SYSTEM: 'tabler-settings-exclamation'
}

const NotificationsCenterView = ({ dictionary }) => {
  const { lang: locale = 'en' } = useParams()
  const router = useRouter()
  const { notifications, markRead, markAllRead, dismiss, dismissAll } = useNotifications()
  const orderedNotifications = useMemo(() => [...notifications].sort((left, right) => Number(right.unread) - Number(left.unread) || new Date(right.timestamp) - new Date(left.timestamp)), [notifications])

  const openNotification = async notification => {
    await markRead(notification.id)
    if (notification.actionUrl) router.push(getLocalizedUrl(notification.actionUrl, locale))
  }

  return (
    <div className='flex flex-col gap-4'>
      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <Typography variant='h5'>{dictionary.title}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {dictionary.emptyDescription}
            </Typography>
          </div>
          <div className='flex items-center gap-2'>
            <Button size='small' variant='tonal' disabled={!notifications.some(item => item.unread)} onClick={markAllRead}>
              {dictionary.markAllRead}
            </Button>
            <Button size='small' color='error' variant='tonal' disabled={notifications.length === 0} onClick={dismissAll}>
              {dictionary.clearAll}
            </Button>
          </div>
        </CardContent>
      </Card>

      {orderedNotifications.length === 0 ? (
        <Card variant='outlined'>
          <CardContent className='py-16 text-center'>
            <i className='tabler-bell-off mb-3 block text-4xl text-textDisabled' />
            <Typography variant='h6'>{dictionary.emptyTitle}</Typography>
            <Typography className='mt-1' color='text.secondary'>
              {dictionary.emptyDescription}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <div className='flex flex-col gap-3'>
          {orderedNotifications.map(notification => (
            <Card key={notification.id} variant='outlined' className={notification.unread ? 'border-primary/40 bg-primaryLighter/30' : ''}>
              <CardContent className='flex items-start gap-3 p-4'>
                <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-actionHover text-textPrimary'>
                  <i className={CATEGORY_ICONS[notification.category] || 'tabler-bell'} />
                </span>
                <div className='min-is-0 grow'>
                  <div className='flex flex-wrap items-start gap-2'>
                    <Typography className='grow font-semibold'>{notification.title}</Typography>
                    <Chip size='small' variant='tonal' color={PRIORITY_COLORS[notification.priority] || 'info'} label={notification.priority} />
                  </div>
                  <Typography variant='body2' color='text.secondary' className='mt-1'>
                    {notification.description}
                  </Typography>
                  <Typography variant='caption' color='text.disabled' className='mt-2 block'>
                    {formatAfghanDateTime(notification.timestamp, locale, { dateStyle: 'medium' })}
                  </Typography>
                  {notification.actionUrl && (
                    <Button size='small' className='mt-3' onClick={() => openNotification(notification)}>
                      {dictionary.viewAll}
                    </Button>
                  )}
                </div>
                <IconButton size='small' aria-label={dictionary.clearAll} onClick={() => dismiss(notification.id)}>
                  <i className='tabler-x' />
                </IconButton>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationsCenterView
