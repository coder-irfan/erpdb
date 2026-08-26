'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

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

import { getAuditNotificationFeed } from '@/actions/notifications'
import CustomAvatar from '@core/components/mui/Avatar'
import { useSettings } from '@core/hooks/useSettings'
import themeConfig from '@configs/themeConfig'
import { getLocalizedUrl } from '@/utils/i18n'

const DEFAULT_DICTIONARY = {
  title: 'Notifications',
  newCount: '{count} new',
  markAllRead: 'Mark all as read',
  clearAll: 'Clear all',
  emptyTitle: 'No new notifications',
  emptyDescription: 'Recent activity relevant to your role will appear here.',
  viewAll: 'View All Notifications',
  performedBy: 'Performed by {name}',
  systemActor: 'System',
  entities: {},
  events: {}
}

const ScrollWrapper = ({ children, hidden }) =>
  hidden ? (
    <div className='overflow-x-hidden bs-full'>{children}</div>
  ) : (
    <PerfectScrollbar className='bs-full' options={{ wheelPropagation: false, suppressScrollX: true }}>
      {children}
    </PerfectScrollbar>
  )

const getEntityKey = action =>
  [
    'FINANCE_EXPENSE',
    'FINANCE_INCOME',
    'FINANCE_SALARY',
    'FINANCE_LOAN',
    'INVENTORY_ITEM',
    'HRM_CONTRACT',
    'HRM_STAFF',
    'CRM_VISITOR',
    'CRM_CLIENT',
    'CRM_LEAD',
    'CONTRACT',
    'INVOICE',
    'PROJECT',
    'TASK',
    'LEAVE',
    'OPTION',
    'USER',
    'ROLE'
  ].find(key => action === key || action.startsWith(`${key}_`)) || 'SYSTEM'

const getEventKey = action =>
  [
    'REPAYMENT_RECORDED',
    'PAYMENT_RECORDED',
    'QUANTITY_ADJUSTED',
    'MEMBER_ASSIGNED',
    'MEMBER_REMOVED',
    'ACTIVITY_CREATED',
    'ACTIVITY_ADDED',
    'STATUS_UPDATED',
    'MARKED_PAID',
    'HOURS_LOGGED',
    'CHECKED_OUT',
    'CHECKED_IN',
    'CREATED',
    'UPDATED',
    'DELETED',
    'CONVERTED',
    'PAID'
  ].find(key => action.endsWith(key)) || 'UPDATED'

const notificationTitle = (notification, dictionary) => {
  const entityKey = getEntityKey(notification.action)
  const eventKey = getEventKey(notification.action)

  return `${dictionary.entities?.[entityKey] || entityKey} ${dictionary.events?.[eventKey] || eventKey}`
}

const notificationSubtitle = (notification, dictionary) => {
  const details = notification.details || {}

  const reference = [
    details.contractNumber,
    details.invoiceNumber,
    details.projectCode,
    details.loanNumber,
    details.skuCode,
    details.title,
    details.label,
    details.timesheetMonth,
    details.contractId,
    details.invoiceId,
    details.projectId,
    details.staffId,
    details.clientId,
    details.leadId,
    details.visitorId,
    details.leaveId,
    details.taskId
  ].find(Boolean)

  const actor = dictionary.performedBy.replace('{name}', notification.actor || dictionary.systemActor)

  return reference ? `${reference} · ${actor}` : actor
}

const relativeTime = (timestamp, locale) => {
  const seconds = Math.round((new Date(timestamp).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  const ranges = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ]

  const [unit, divisor] = ranges.find(([, value]) => Math.abs(seconds) >= value) || ['second', 1]

  return formatter.format(Math.round(seconds / divisor), unit)
}

const NotificationDropdown = ({ dictionary: providedDictionary }) => {
  const dictionary = providedDictionary || DEFAULT_DICTIONARY
  const { lang: locale = 'en' } = useParams()
  const [open, setOpen] = useState(false)
  const [feed, setFeed] = useState([])
  const [userId, setUserId] = useState('anonymous')
  const [readIds, setReadIds] = useState(new Set())
  const [dismissedIds, setDismissedIds] = useState(new Set())
  const anchorRef = useRef(null)
  const popperRef = useRef(null)
  const hidden = useMediaQuery(theme => theme.breakpoints.down('lg'))
  const isSmallScreen = useMediaQuery(theme => theme.breakpoints.down('sm'))
  const { settings } = useSettings()

  const visibleFeed = feed.filter(notification => !dismissedIds.has(notification.id))
  const unreadCount = visibleFeed.filter(notification => !readIds.has(notification.id)).length

  const persistState = useCallback(
    (nextRead, nextDismissed, owner = userId) => {
      if (!owner || owner === 'anonymous') return
      try {
        localStorage.setItem(
          `audit-notifications:${owner}`,
          JSON.stringify({ read: [...nextRead], dismissed: [...nextDismissed] })
        )
      } catch {
        // Storage may be blocked (private browsing/security settings); feed state remains usable in memory.
      }
    },
    [userId]
  )

  const loadFeed = useCallback(async () => {
    const result = await getAuditNotificationFeed({ limit: 30 })

    if (!result.success) return
    const owner = result.data.userId
    let saved = {}

    try {
      saved = JSON.parse(localStorage.getItem(`audit-notifications:${owner}`) || '{}')
    } catch {
      saved = {}
      try {
        localStorage.removeItem(`audit-notifications:${owner}`)
      } catch {
        // Ignore unavailable localStorage APIs (for example Firefox private windows).
      }
    }

    setUserId(owner)
    setReadIds(new Set(saved.read || []))
    setDismissedIds(new Set(saved.dismissed || []))
    setFeed(result.data.notifications)
  }, [])

  useEffect(() => {
    void loadFeed()
    const interval = window.setInterval(loadFeed, 30000)

    return () => window.clearInterval(interval)
  }, [loadFeed])

  useEffect(() => {
    const adjustHeight = () => {
      if (popperRef.current) popperRef.current.style.height = `${Math.min(window.innerHeight - 100, 550)}px`
    }

    adjustHeight()
    window.addEventListener('resize', adjustHeight)

    return () => window.removeEventListener('resize', adjustHeight)
  }, [open])

  const markRead = id => {
    const next = new Set(readIds)

    next.add(id)
    setReadIds(next)
    persistState(next, dismissedIds)
  }

  const markAllRead = () => {
    const next = new Set([...readIds, ...visibleFeed.map(notification => notification.id)])

    setReadIds(next)
    persistState(next, dismissedIds)
  }

  const clearAll = () => {
    const next = new Set([...dismissedIds, ...visibleFeed.map(notification => notification.id)])

    setDismissedIds(next)
    persistState(readIds, next)
  }

  return (
    <>
      <IconButton
        ref={anchorRef}
        onClick={() => {
          setOpen(value => !value)
          void loadFeed()
        }}
        className='text-textPrimary'
        aria-label={dictionary.title}
      >
        <Badge
          color='error'
          badgeContent={unreadCount}
          max={99}
          invisible={unreadCount === 0}
          overlap='circular'
          sx={{
            '& .MuiBadge-badge': {
              minWidth: 16,
              height: 16,
              padding: '0 3px',
              fontSize: '0.625rem',
              lineHeight: 1,
              top: 3,
              right: 2
            }
          }}
        >
          <i className='tabler-bell' />
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
          ? {
              className: 'is-[calc(100vw-3rem)] max-is-[340px] !mbs-3 z-[1] max-bs-[550px] bs-[550px]',
              modifiers: [{ name: 'preventOverflow', options: { padding: themeConfig.layoutPadding } }]
            }
          : { className: 'is-[380px] !mbs-3 z-[1] max-bs-[550px] bs-[550px]' })}
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper className={classnames('bs-full', settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg')}>
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <div className='bs-full flex flex-col'>
                  <div className='flex items-center gap-2 pli-4 plb-3.5'>
                    <Typography variant='h6' className='flex-auto'>
                      {dictionary.title}
                    </Typography>
                    {unreadCount > 0 && (
                      <Chip
                        size='small'
                        variant='tonal'
                        color='primary'
                        label={dictionary.newCount.replace('{count}', unreadCount)}
                      />
                    )}
                    <Tooltip title={dictionary.markAllRead}>
                      <span>
                        <IconButton size='small' disabled={unreadCount === 0} onClick={markAllRead}>
                          <i className='tabler-mail-opened' />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={dictionary.clearAll}>
                      <span>
                        <IconButton size='small' disabled={visibleFeed.length === 0} onClick={clearAll}>
                          <i className='tabler-trash' />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </div>
                  <Divider />
                  <ScrollWrapper hidden={hidden}>
                    {visibleFeed.length === 0 ? (
                      <div className='flex flex-col items-center justify-center gap-2 px-6 py-12 text-center'>
                        <CustomAvatar color='primary' skin='light-static' size={56}>
                          <i className='tabler-bell-off text-3xl' />
                        </CustomAvatar>
                        <Typography variant='h6'>{dictionary.emptyTitle}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {dictionary.emptyDescription}
                        </Typography>
                      </div>
                    ) : (
                      visibleFeed.map((notification, index) => {
                        const unread = !readIds.has(notification.id)

                        return (
                          <div
                            key={notification.id}
                            className={classnames('group flex cursor-pointer gap-3 pli-4 plb-3 hover:bg-actionHover', {
                              'border-be': index !== visibleFeed.length - 1,
                              'bg-actionHover/50': unread
                            })}
                            onClick={() => markRead(notification.id)}
                          >
                            <CustomAvatar color={notification.avatarColor} skin='light-static'>
                              <i className={notification.avatarIcon} />
                            </CustomAvatar>
                            <div className='min-is-0 flex-auto'>
                              <Typography variant='body2' className='font-medium' color='text.primary'>
                                {notificationTitle(notification, dictionary)}
                              </Typography>
                              <Typography variant='caption' color='text.secondary' className='mt-1 block'>
                                {notificationSubtitle(notification, dictionary)}
                              </Typography>
                              <Typography variant='caption' color='text.disabled'>
                                {relativeTime(notification.timestamp, locale)}
                              </Typography>
                            </div>
                            <Badge variant='dot' color={unread ? 'primary' : 'secondary'} className='mt-2' />
                          </div>
                        )
                      })
                    )}
                  </ScrollWrapper>
                  <Divider />
                  <div className='p-4'>
                    <Button
                      component={Link}
                      href={getLocalizedUrl('/options/audit-logs', locale)}
                      onClick={() => setOpen(false)}
                      fullWidth
                      variant='contained'
                      size='small'
                    >
                      {dictionary.viewAll}
                    </Button>
                  </div>
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
