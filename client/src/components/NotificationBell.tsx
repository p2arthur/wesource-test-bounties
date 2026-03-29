import { useEffect, useRef, useState } from 'react'
import { FiBell } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { getNotifications, getUnreadNotificationCount, markNotificationAsRead, Notification } from '../services/api'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { Badge } from './ui/badge'
import { useSnackbar } from 'notistack'

export default function NotificationBell() {
  const { activeAddress } = useUnifiedWallet()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const walletAddress = activeAddress

  // Fetch unread count
  useEffect(() => {
    if (!walletAddress) return

    const fetchUnreadCount = async () => {
      try {
        const result = await getUnreadNotificationCount(walletAddress)
        setUnreadCount(result.count)
      } catch (err) {
        console.error('Failed to fetch unread count:', err)
      }
    }

    fetchUnreadCount()
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [walletAddress])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBellClick = async () => {
    if (!walletAddress) {
      enqueueSnackbar('Please connect your wallet', { variant: 'info' })
      return
    }

    if (isOpen) {
      setIsOpen(false)
      return
    }

    setIsOpen(true)
    setIsLoading(true)
    try {
      const result = await getNotifications(walletAddress, 1, 10)
      setNotifications(result.data)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      enqueueSnackbar('Failed to load notifications', { variant: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.relatedBountyId) {
      navigate(`/bounty/${notification.relatedBountyId}`)
    }

    // Mark as read
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        )
        setUnreadCount(Math.max(0, unreadCount - 1))
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    }

    setIsOpen(false)
  }

  if (!walletAddress) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="p-2 hover:bg-bg-hover rounded-md transition-colors relative"
        aria-label="Notifications"
      >
        <FiBell className="w-5 h-5 text-text-primary" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-bg-elevated border border-border-default rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-border-default">
            <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-text-secondary text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-text-secondary text-sm">No notifications yet</div>
            ) : (
              <ul className="divide-y divide-border-default">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left p-4 hover:bg-bg-hover transition-colors ${
                        !notification.isRead ? 'bg-accent/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary break-words">{notification.message}</p>
                          <p className="text-xs text-text-muted mt-1">
                            {new Date(notification.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="flex-shrink-0 w-2 h-2 bg-accent rounded-full mt-1.5"></div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
