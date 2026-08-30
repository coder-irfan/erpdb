'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { useParams } from 'next/navigation'

import { useSession } from 'next-auth/react'

import {
  dismissAllNotifications,
  dismissNotification,
  getNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead
} from '@/actions/notifications'

const NotificationContext = createContext(null)

export const NotificationProvider = ({ children }) => {
  const { status } = useSession()
  const { lang = 'en' } = useParams()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (status !== 'authenticated') return
    setLoading(true)

    try {
      const result = await getNotificationFeed({ locale: lang, limit: 50 })

      if (result.success) setNotifications(result.data.notifications)
    } finally {
      setLoading(false)
    }
  }, [lang, status])

  useEffect(() => {
    if (status !== 'authenticated') {
      setNotifications([])

      return undefined
    }

    void refresh()
    const interval = window.setInterval(refresh, 20000)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh, status])

  const markRead = useCallback(async id => {
    setNotifications(current => current.map(item => item.id === id ? { ...item, unread: false } : item))
    const result = await markNotificationRead(id)

    if (!result.success) await refresh()
  }, [refresh])

  const dismiss = useCallback(async id => {
    setNotifications(current => current.filter(item => item.id !== id))
    const result = await dismissNotification(id)

    if (!result.success) await refresh()
  }, [refresh])

  const markAllRead = useCallback(async () => {
    setNotifications(current => current.map(item => ({ ...item, unread: false })))
    const result = await markAllNotificationsRead()

    if (!result.success) await refresh()
  }, [refresh])

  const dismissAll = useCallback(async () => {
    setNotifications([])
    const result = await dismissAllNotifications()

    if (!result.success) await refresh()
  }, [refresh])

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter(item => item.unread).length,
    loading,
    refresh,
    markRead,
    dismiss,
    markAllRead,
    dismissAll
  }), [dismiss, dismissAll, loading, markAllRead, markRead, notifications, refresh])

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)

  if (!context) throw new Error('useNotifications must be used inside NotificationProvider.')

  return context
}
