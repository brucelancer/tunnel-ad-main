import { useState, useEffect } from 'react';
import { useSanityAuth } from './useSanityAuth';
import { fetchUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../tunnel-ad-main/services/notificationService';

// Define the notification type
export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'tag' | 'share' | 'post' | 'system';
  title: string;
  message: string;
  contentId?: string;
  contentType?: 'post' | 'video' | 'profile';
  contentImage?: string;
  contentSnippet?: string;
  videoTitle?: string;
  senderId?: string;
  senderName?: string;
  username?: string;
  avatar?: string;
  time: string;
  createdAt: string;
  read: boolean;
  isVerified?: boolean;
  isBlueVerified?: boolean;
}

// Define the return type of the hook
export interface NotificationsHook {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  unreadCount: number;
}

/**
 * Custom hook to manage user notifications
 */
export const useNotifications = (): NotificationsHook => {
  const { user } = useSanityAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch notifications for the current user
   */
  const fetchNotifications = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user || !user._id) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const fetchedNotifications = await fetchUserNotifications(user._id);
      
      if (fetchedNotifications) {
        setNotifications(fetchedNotifications);
        setUnreadCount(fetchedNotifications.filter(n => !n.read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark a notification as read
   * @param notificationId - The ID of the notification to mark as read
   */
  const markAsRead = async (notificationId: string): Promise<boolean> => {
    try {
      const success = await markNotificationAsRead(notificationId);
      
      if (success) {
        // Update local state
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true } 
              : notification
          )
        );
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return success;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  };

  /**
   * Mark all notifications as read for the current user
   */
  const markAllAsRead = async (): Promise<boolean> => {
    try {
      if (!user || !user._id) return false;
      
      const success = await markAllNotificationsAsRead(user._id);
      
      if (success) {
        // Update local state
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => ({ ...notification, read: true }))
        );
        
        // Update unread count
        setUnreadCount(0);
      }
      
      return success;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return false;
    }
  };

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    fetchNotifications();
    
    // Set up a refresh interval (every 5 minutes)
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 5 * 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [user?._id]);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount
  };
}; 