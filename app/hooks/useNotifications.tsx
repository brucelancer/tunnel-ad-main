import { useState, useEffect, useRef } from 'react';
import { useSanityAuth } from './useSanityAuth';
import { DeviceEventEmitter } from 'react-native';
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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Keep track of the current user ID
  const userIdRef = useRef<string | null>(user?._id || null);

  // Update user ID ref when user changes
  useEffect(() => {
    userIdRef.current = user?._id || null;
  }, [user]);

  /**
   * Fetch notifications for the current user
   */
  const fetchNotifications = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the latest user ID from the ref
      const userId = userIdRef.current;
      
      if (!userId) {
        console.log('useNotifications: No user ID, clearing notifications');
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      console.log(`useNotifications: Fetching notifications for user ${userId}`);
      const fetchedNotifications = await fetchUserNotifications(userId);
      
      if (fetchedNotifications) {
        console.log(`useNotifications: Found ${fetchedNotifications.length} notifications, unread: ${fetchedNotifications.filter(n => !n.read).length}`);
        setNotifications(fetchedNotifications);
        setUnreadCount(fetchedNotifications.filter(n => !n.read).length);
      } else {
        console.log('useNotifications: No notifications found or error occurred');
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
      // Get the latest user ID from the ref
      const userId = userIdRef.current;
      
      if (!userId) {
        console.warn('useNotifications: No user ID, cannot mark all as read');
        return false;
      }
      
      const success = await markAllNotificationsAsRead(userId);
      
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

  // Listen for auth state changes to reload notifications
  useEffect(() => {
    const authSubscription = DeviceEventEmitter.addListener(
      'AUTH_STATE_CHANGED',
      (event) => {
        const newUserId = event.userData?._id || null;
        const previousUserId = userIdRef.current;
        
        // Update the user ID ref
        userIdRef.current = newUserId;
        
        // If user changed, reset notifications
        if (newUserId !== previousUserId) {
          if (!newUserId) {
            // User logged out, clear notifications
            setNotifications([]);
            setUnreadCount(0);
          }
          // We don't need to fetch here since the notifications component will do that
        }
      }
    );
    
    return () => {
      authSubscription.remove();
    };
  }, []);

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    // Only fetch if user is authenticated
    if (user?._id) {
      console.log('useNotifications: User authenticated, fetching notifications');
      fetchNotifications();
      
      // Set up a refresh interval (every 5 minutes)
      const intervalId = setInterval(() => {
        if (userIdRef.current) {
          // Only refresh if still authenticated
          fetchNotifications();
        }
      }, 5 * 60 * 1000);
      
      return () => {
        clearInterval(intervalId);
      };
    } else {
      // Clear notifications if not authenticated
      setNotifications([]);
      setUnreadCount(0);
    }
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