import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Heart, MessageCircle, Bell, AlertCircle, User, Video } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import ScreenContainer from '../components/ScreenContainer';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { 
    notifications, 
    loading, 
    error, 
    fetchNotifications, 
    markAsRead,
    markAllAsRead,
    unreadCount
  } = useNotifications();

  // Mark notifications as read when opened
  const handleNotificationPress = async (notification: any) => {
    try {
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
  const handleRefresh = () => {
    fetchNotifications();
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
            <MessageCircle size={22} color="#FFF" />
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

  // Render a notification item with detailed user info and content
  const renderNotification = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      {/* User avatar if available */}
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
      ) : (
        renderNotificationIcon(item.type, item.isVerified, item.isBlueVerified)
      )}
      
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
        <Image source={{ uri: item.contentImage }} style={styles.contentThumbnail} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          
          {unreadCount > 0 && (
            <TouchableOpacity 
              style={styles.markAllReadButton}
              onPress={markAllAsRead}
            >
              <Text style={styles.markAllReadText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && notifications.length === 0 ? (
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
                refreshing={loading}
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
}); 