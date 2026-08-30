'use client'

import { useEffect, useRef, useState } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Badge from '@mui/material/Badge'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Divider from '@mui/material/Divider'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import classnames from 'classnames'
import PerfectScrollbar from 'react-perfect-scrollbar'

import CustomAvatar from '@core/components/mui/Avatar'
import { useSettings } from '@core/hooks/useSettings'
import themeConfig from '@configs/themeConfig'
import { useNotifications } from '@/contexts/NotificationProvider'
import { getAppLocale } from '@/utils/afghanDate'
import { getLocalizedUrl } from '@/utils/i18n'

const DEFAULT_DICTIONARY = {
  title: 'Notifications',
  newCount: '{count} new',
  markAllRead: 'Mark all as read',
  clearAll: 'Dismiss all',
  emptyTitle: 'No new notifications',
  emptyDescription: 'Actionable alerts relevant to your role will appear here.',
  viewAll: 'Mark all as read'
}

const CATEGORY = {
  CONTRACT: { icon: 'tabler-file-time', color: 'primary' },
  HRM: { icon: 'tabler-users', color: 'success' },
  TASK: { icon: 'tabler-list-check', color: 'info' },
  PROJECT: { icon: 'tabler-briefcase', color: 'info' },
  FINANCE: { icon: 'tabler-cash-banknote', color: 'warning' },
  PAYROLL: { icon: 'tabler-receipt', color: 'warning' },
  INVENTORY: { icon: 'tabler-package', color: 'error' }
}

const PRIORITY_COLORS = { CRITICAL: 'error', URGENT: 'error', WARNING: 'warning', INFO: 'info' }

const PRIORITY_LABELS = {
  en: { CRITICAL: 'Critical', URGENT: 'Urgent', WARNING: 'Warning', INFO: 'Info' },
  fa: { CRITICAL: 'بحرانی', URGENT: 'عاجل', WARNING: 'هشدار', INFO: 'اطلاعات' },
  ps: { CRITICAL: 'بحراني', URGENT: 'بېړنی', WARNING: 'خبرتیا', INFO: 'معلومات' }
}

const ScrollWrapper = ({ children, hidden }) => hidden
  ? <div className='overflow-x-hidden bs-full'>{children}</div>
  : <PerfectScrollbar className='bs-full' options={{ wheelPropagation: false, suppressScrollX: true }}>{children}</PerfectScrollbar>

const relativeTime = (timestamp, locale) => {
  const seconds = Math.round((new Date(timestamp).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(getAppLocale(locale), { numeric: 'auto' })
  const ranges = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]
  const [unit, divisor] = ranges.find(([, value]) => Math.abs(seconds) >= value) || ['second', 1]

  return formatter.format(Math.round(seconds / divisor), unit)
}

const NotificationDropdown = ({ dictionary: providedDictionary }) => {
  const dictionary = { ...DEFAULT_DICTIONARY, ...(providedDictionary || {}) }
  const { lang: locale = 'en' } = useParams()
  const router = useRouter()
  const { notifications, unreadCount, loading, refresh, markRead, markAllRead, dismissAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const popperRef = useRef(null)
  const hidden = useMediaQuery(theme => theme.breakpoints.down('lg'))
  const isSmallScreen = useMediaQuery(theme => theme.breakpoints.down('sm'))
  const { settings } = useSettings()

  useEffect(() => {
    const adjustHeight = () => {
      if (popperRef.current) popperRef.current.style.height = `${Math.min(window.innerHeight - 100, 550)}px`
    }

    adjustHeight()
    window.addEventListener('resize', adjustHeight)

    return () => window.removeEventListener('resize', adjustHeight)
  }, [open])

  const openNotification = async notification => {
    await markRead(notification.id)
    setOpen(false)
    if (notification.actionUrl) router.push(getLocalizedUrl(notification.actionUrl, locale))
  }

  return (
    <>
      <IconButton
        ref={anchorRef}
        onClick={() => {
          setOpen(value => !value)
          void refresh()
        }}
        className='text-textPrimary'
        aria-label={dictionary.title}
      >
        <Badge color='error' badgeContent={unreadCount} max={99} invisible={unreadCount === 0} overlap='circular'>
          <i className={`tabler-bell ${loading ? 'animate-pulse' : ''}`} />
        </Badge>
      </IconButton>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        ref={popperRef}
        anchorEl={anchorRef.current}
        {...(isSmallScreen
          ? { className: 'is-[calc(100vw-3rem)] max-is-[380px] !mbs-3 z-[1] max-bs-[550px] bs-[550px]', modifiers: [{ name: 'preventOverflow', options: { padding: themeConfig.layoutPadding } }] }
          : { className: 'is-[400px] !mbs-3 z-[1] max-bs-[550px] bs-[550px]' })}
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper className={classnames('topbar-dropdown bs-full', settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg')}>
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <div className='bs-full flex flex-col'>
                  <div className='flex items-center gap-2 pli-4 plb-3.5'>
                    <Typography variant='h6' className='flex-auto'>{dictionary.title}</Typography>
                    {unreadCount > 0 && <Chip size='small' variant='tonal' color='primary' label={dictionary.newCount.replace('{count}', unreadCount)} />}
                    <Tooltip title={dictionary.markAllRead}>
                      <span><IconButton size='small' disabled={unreadCount === 0} onClick={markAllRead}><i className='tabler-mail-opened' /></IconButton></span>
                    </Tooltip>
                    <Tooltip title={dictionary.clearAll}>
                      <span><IconButton size='small' disabled={notifications.length === 0} onClick={dismissAll}><i className='tabler-trash' /></IconButton></span>
                    </Tooltip>
                  </div>
                  <Divider />
                  <ScrollWrapper hidden={hidden}>
                    {notifications.length === 0 ? (
                      <div className='flex flex-col items-center justify-center gap-2 px-6 py-12 text-center'>
                        <CustomAvatar color='primary' skin='light-static' size={56}><i className='tabler-bell-off text-3xl' /></CustomAvatar>
                        <Typography variant='h6'>{dictionary.emptyTitle}</Typography>
                        <Typography variant='body2' color='text.secondary'>{dictionary.emptyDescription}</Typography>
                      </div>
                    ) : notifications.map((notification, index) => {
                      const appearance = CATEGORY[notification.category] || { icon: 'tabler-bell', color: 'primary' }

                      return (
                        <button
                          type='button'
                          key={notification.id}
                          className={classnames('flex w-full cursor-pointer gap-3 pli-4 plb-3 text-start hover:bg-actionHover', {
                            'border-be': index !== notifications.length - 1,
                            'bg-actionHover/50': notification.unread
                          })}
                          onClick={() => openNotification(notification)}
                        >
                          <CustomAvatar color={appearance.color} skin='light-static'><i className={appearance.icon} /></CustomAvatar>
                          <span className='min-is-0 flex-auto'>
                            <span className='flex items-start gap-2'>
                              <Typography component='span' variant='body2' className='flex-auto font-semibold' color='text.primary'>{notification.title}</Typography>
                              <Chip size='small' variant='tonal' color={PRIORITY_COLORS[notification.priority] || 'info'} label={PRIORITY_LABELS[locale]?.[notification.priority] || notification.priority} className='h-5 text-[9px]' />
                            </span>
                            <Typography component='span' variant='caption' color='text.secondary' className='mt-1 line-clamp-2'>{notification.description}</Typography>
                            <Typography component='span' variant='caption' color='text.disabled' className='mt-1 block'>{relativeTime(notification.timestamp, locale)}</Typography>
                          </span>
                          <Badge variant='dot' color={notification.unread ? 'primary' : 'secondary'} className='mt-2' />
                        </button>
                      )
                    })}
                  </ScrollWrapper>
                  {unreadCount > 0 && <><Divider /><div className='p-3'><Button fullWidth size='small' variant='tonal' onClick={markAllRead}>{dictionary.markAllRead}</Button></div></>}
                </div>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default NotificationDropdown
