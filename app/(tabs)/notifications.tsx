import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, RefreshControl, DeviceEventEmitter } from 'react-native';
import { Heart, MessageCircle, Bell, AlertCircle, User, Video, Users } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import ScreenContainer from '../components/ScreenContainer';
import { useNotifications } from '../hooks/useNotifications';
import { useSanityAuth } from '../hooks/useSanityAuth';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useSanityAuth();
  const { 
    notifications, 
    loading, 
    error, 
    fetchNotifications, 
    markAsRead,
    markAllAsRead,
    unreadCount
  } = useNotifications();
  
  // Local backup of read notification IDs
  const [localReadIds, setLocalReadIds] = useState<Record<string, boolean>>({});
  const notificationsRef = useRef(notifications);
  
  // Track if a forced refresh is in progress
  const [forcedRefreshing, setForcedRefreshing] = useState(false);
  
  // Track the current user ID to detect changes
  const currentUserIdRef = useRef<string | null>(user?._id || null);
  
  // Update our ref when notifications change
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Listen for authentication state changes
  useEffect(() => {
    console.log('Notifications: Setting up AUTH_STATE_CHANGED listener');
    
    const authSubscription = DeviceEventEmitter.addListener(
      'AUTH_STATE_CHANGED', 
      async (event) => {
        console.log('Notifications: AUTH_STATE_CHANGED event received:', 
          event.userData ? `User ID: ${event.userData._id}` : 'No user data'
        );
        
        const newUserId = event.userData?._id || null;
        const previousUserId = currentUserIdRef.current;
        
        // Update the current user ID reference
        currentUserIdRef.current = newUserId;
        
        // If user ID changed, refresh notifications
        if (newUserId !== previousUserId) {
          console.log('Notifications: User changed, refreshing notifications');
          setLocalReadIds({}); // Reset local read IDs for new user
          
          // Only fetch if authenticated
          if (newUserId) {
            await forceRefreshNotifications();
          }
        }
      }
    );
    
    // Clean up subscription
    return () => {
      authSubscription.remove();
    };
  }, []);
  
  // When this screen comes into focus, refresh notifications
  useFocusEffect(
    React.useCallback(() => {
      console.log('Notifications: Screen focused, refreshing data');
      
      if (user?._id) {
        // Use regular refresh if not forced
        handleRefresh();
      }
      
      return () => {
        // Cleanup (if needed)
      };
    }, [user?._id])
  );

  // Force refresh notifications (for use when user changes)
  const forceRefreshNotifications = async () => {
    try {
      setForcedRefreshing(true);
      await fetchNotifications();
    } catch (error) {
      console.error('Error forcing refresh of notifications:', error);
    } finally {
      setForcedRefreshing(false);
    }
  };
  
  // Mark notifications as read when opened
  const handleNotificationPress = async (notification: any) => {
    try {
      // Mark in local state immediately
      setLocalReadIds(prev => ({
        ...prev,
        [notification.id]: true
      }));
      
      // Mark this notification as read
      await markAsRead(notification.id);
      
      // Navigate based on the notification type
      if (notification.contentId) {
        if (notification.contentType === 'post') {
          // Navigate to the feed post detail screen
          router.push(`/feedpost-detail?id=${notification.contentId}` as any);
        } else if (notification.contentType === 'video') {
          router.push(`/video-detail?id=${notification.contentId}` as any);
        } else if (notification.contentType === 'profile' && notification.senderId) {
          router.push(`/profile/${notification.senderId}` as any);
        }
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };
  
  // Handle refreshing notifications
  const handleRefresh = async () => {
    // Preserve previous read status for notifications that remain
    const oldReadState = {...localReadIds};
    
    // Get current notifications for comparison
    const currentNotifications = notificationsRef.current;
    
    // Fetch the new notifications
    await fetchNotifications();
    
    // After fetch, preserve read status from localReadIds and from previously read notifications
    for (const notification of notificationsRef.current) {
      // If notification was previously read according to our local state, keep it as read
      if (oldReadState[notification.id]) {
        setLocalReadIds(prev => ({
          ...prev,
          [notification.id]: true
        }));
      }
      
      // If notification was already marked as read from server, add it to local read IDs
      if (notification.read) {
        setLocalReadIds(prev => ({
          ...prev,
          [notification.id]: true
        }));
      }
    }
  };

  // Function to render notification icon based on type
  const renderNotificationIcon = (type: string, isVerified?: boolean, isBlueVerified?: boolean) => {
    switch (type) {
      case 'like':
        return (
          <View style={[styles.iconContainer, styles.likeIconContainer]}>
            <Heart size={22} color="#FFF" fill="#FFF" />
          </View>
        );
      case 'comment':
        return (
          <View style={[styles.iconContainer, styles.commentIconContainer]}>
            <MessageCircle size={22} color="#FFF" fill="#FFF" />
          </View>
        );
      case 'follow':
        return (
          <View style={[styles.iconContainer, styles.followIconContainer]}>
            <User size={22} color="#FFF" />
          </View>
        );
      case 'mention':
      case 'tag':
        return (
          <View style={[styles.iconContainer, styles.mentionIconContainer]}>
            <Bell size={22} color="#FFF" />
          </View>
        );
      case 'system':
        return (
          <View style={[styles.iconContainer, styles.systemIconContainer]}>
            <AlertCircle size={22} color="#FFF" />
          </View>
        );
      default:
        return (
          <View style={styles.iconContainer}>
            <Bell size={22} color="#FFF" />
          </View>
        );
    }
  };

  // Render user avatar group (for multiple interactions)
  const renderAvatarGroup = (notification: any) => {
    // Check if this is a group notification (has groupMembers)
    if (notification.groupMembers && notification.groupMembers.length > 0) {
      // Get members for display
      const members = notification.groupMembers;
      const totalMembers = members.length;
      
      return (
        <View style={styles.avatarGroup}>
          {/* For 1 member, just show regular avatar */}
          {totalMembers === 1 && (
            <Image 
              source={{ uri: members[0].avatar }} 
              style={styles.singleAvatar}
              defaultSource={require('../../assets/images/default-user.png')}
            />
          )}
          
          {/* For 2 members, show them side by side slightly overlapping */}
          {totalMembers === 2 && (
            <>
              <Image 
                source={{ uri: members[0].avatar }} 
                style={[styles.doubleAvatar, { left: 0, zIndex: 2 }]}
                defaultSource={require('../../assets/images/default-user.png')}
              />
              <Image 
                source={{ uri: members[1].avatar }} 
                style={[styles.doubleAvatar, { left: 22, zIndex: 1 }]}
                defaultSource={require('../../assets/images/default-user.png')}
              />
            </>
          )}
          
          {/* For 3 or more members, create clustered layout like in the image */}
          {totalMembers >= 3 && (
            <>
              {/* Top avatar */}
              <Image 
                source={{ uri: members[0].avatar }} 
                style={[styles.clusterAvatar, { top: 0, left: 10, zIndex: 3 }]}
                defaultSource={require('../../assets/images/default-user.png')}
              />
              {/* Bottom left avatar */}
              <Image 
                source={{ uri: members[1].avatar }} 
                style={[styles.clusterAvatar, { top: 18, left: 0, zIndex: 2 }]}
                defaultSource={require('../../assets/images/default-user.png')}
              />
              {/* Bottom right avatar */}
              <Image 
                source={{ uri: members[2].avatar }} 
                style={[styles.clusterAvatar, { top: 18, left: 20, zIndex: 1 }]}
                defaultSource={require('../../assets/images/default-user.png')}
              />
              
              {/* Show +X for additional members beyond 3 */}
              {totalMembers > 3 && (
                <View style={styles.moreCountContainer}>
                  <Text style={styles.moreCountText}>+{totalMembers - 3}</Text>
                </View>
              )}
            </>
          )}
        </View>
      );
    }
    
    // Regular single avatar display
    if (notification.avatar && notification.avatar.length > 0) {
      return (
        <Image 
          source={{ uri: notification.avatar }} 
          style={styles.userAvatar} 
          defaultSource={require('../../assets/images/default-user.png')}
        />
      );
    }
    
    // Fallback to icon
    return renderNotificationIcon(notification.type, notification.isVerified, notification.isBlueVerified);
  };

  // Handler for marking all as read
  const handleMarkAllAsRead = async () => {
    // Update local state immediately
    const newLocalReadIds = { ...localReadIds };
    for (const notification of notifications) {
      newLocalReadIds[notification.id] = true;
    }
    setLocalReadIds(newLocalReadIds);
    
    // Call the API to mark all as read
    await markAllAsRead();
  };

  // Render a notification item with detailed user info and content
  const renderNotification = ({ item }: { item: any }) => {
    // Check if read based on Sanity data or local state
    const isRead = item.read || localReadIds[item.id] || false;
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !isRead && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        {/* Render avatar or avatar group */}
        {renderAvatarGroup(item)}
        
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>
            {item.title}
            {(item.isVerified || item.isBlueVerified) && (
              <Text style={styles.verifiedBadge}> ✓</Text>
            )}
          </Text>
          
          <Text style={styles.notificationMessage}>{item.message}</Text>
          
          {/* If it's a video notification, show the video title */}
          {item.contentType === 'video' && item.videoTitle && (
            <View style={styles.contentInfoContainer}>
              <Video size={14} color="#999" style={styles.contentTypeIcon} />
              <Text style={styles.contentInfo} numberOfLines={1} ellipsizeMode="tail">
                {item.videoTitle}
              </Text>
            </View>
          )}
          
          {/* If it's a post notification with a snippet, show part of the post content */}
          {item.contentType === 'post' && item.contentSnippet && (
            <View style={styles.contentInfoContainer}>
              <Text style={styles.contentInfo} numberOfLines={1} ellipsizeMode="tail">
                "{item.contentSnippet}..."
              </Text>
            </View>
          )}
          
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>
        
        {/* Preview thumbnail for videos or posts with images */}
        {item.contentImage && (
          <Image 
            source={{ uri: item.contentImage }} 
            style={styles.contentThumbnail}
          />
        )}
      </TouchableOpacity>
    );
  };

  // Calculate real unread count based on server data and local state
  const realUnreadCount = notifications.filter(n => !n.read && !localReadIds[n.id]).length;

  // Show logged out or loading state if no user
  if (!user) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          <View style={styles.emptyContainer}>
            <Bell size={80} color="#333" />
            <Text style={styles.emptyText}>Please Sign In</Text>
            <Text style={styles.emptySubtext}>
              Sign in to view your notifications
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => router.push('/screens/login' as any)}
            >
              <Text style={styles.retryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          
          {realUnreadCount > 0 && (
            <TouchableOpacity 
              style={styles.markAllReadButton}
              onPress={handleMarkAllAsRead}
            >
              <Text style={styles.markAllReadText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {(loading || forcedRefreshing) && notifications.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0070F3" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={50} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchNotifications}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={80} color="#333" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              When people interact with your content, you'll see notifications here
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.notificationsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading || forcedRefreshing}
                onRefresh={handleRefresh}
                tintColor="#0070F3"
                colors={["#0070F3"]}
              />
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
  },
  markAllReadButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
    borderRadius: 12,
  },
  markAllReadText: {
    color: '#0070F3',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  notificationsList: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderRadius: 12,
    marginBottom: 12,
  },
  unreadNotification: {
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#0070F3',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    marginRight: 16,
  },
  // Avatar Group styles
  avatarGroup: {
    position: 'relative',
    width: 48,
    height: 48,
    marginRight: 16,
  },
  singleAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
  },
  doubleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    position: 'absolute',
  },
  clusterAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    position: 'absolute',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 112, 243, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  likeIconContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  commentIconContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  followIconContainer: {
    backgroundColor: 'rgba(88, 86, 214, 0.2)',
  },
  mentionIconContainer: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
  },
  systemIconContainer: {
    backgroundColor: 'rgba(64, 156, 255, 0.2)',
  },
  notificationContent: {
    flex: 1,
    marginRight: 10,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
    marginBottom: 4,
  },
  verifiedBadge: {
    color: '#0070F3',
    fontSize: 14,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 8,
    lineHeight: 20,
  },
  contentInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  contentTypeIcon: {
    marginRight: 4,
  },
  contentInfo: {
    fontSize: 13,
    color: '#999',
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  contentThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#AAA',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EEE',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  moreCountContainer: {
    position: 'absolute',
    top: 18,
    right: -10,
    backgroundColor: '#1877F2', // Facebook blue
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  moreCountText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: 'bold',
  },
}); 