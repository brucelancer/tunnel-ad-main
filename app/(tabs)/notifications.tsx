import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Bell, Calendar, Heart, MessageCircle, Video } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import ScreenContainer from '../components/ScreenContainer';

// Notification types
type NotificationType = 'like' | 'comment' | 'mention' | 'follow' | 'system' | 'points';

// Notification interface
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  avatar?: string;
  username?: string;
  contentId?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();

  // Sample notifications data
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'like',
      title: 'New like on your video',
      message: 'John Doe liked your video "My amazing trip"',
      time: '2 minutes ago',
      read: false,
      username: 'john_doe',
      contentId: 'video123',
    },
    {
      id: '2',
      type: 'comment',
      title: 'New comment',
      message: 'Sarah commented: "This is so cool! Where was this taken?"',
      time: '15 minutes ago',
      read: false,
      username: 'sarah_j',
      contentId: 'video123',
    },
    {
      id: '3',
      type: 'follow',
      title: 'New follower',
      message: 'Mike started following you',
      time: '2 hours ago',
      read: true,
      username: 'mike_s',
    },
    {
      id: '4',
      type: 'points',
      title: 'Points earned',
      message: 'You earned 50 points from your latest video',
      time: '1 day ago',
      read: true,
    },
    {
      id: '5',
      type: 'system',
      title: 'New feature available',
      message: 'Check out our new video effects in the upload section',
      time: '3 days ago',
      read: true,
    },
  ];

  // Function to render notification icon based on type
  const renderNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return <Heart size={24} color="#F91880" />;
      case 'comment':
        return <MessageCircle size={24} color="#1D9BF0" />;
      case 'mention':
        return <Bell size={24} color="#7856FF" />;
      case 'follow':
        return <Heart size={24} color="#1877F2" />;
      case 'system':
        return <Bell size={24} color="#FFA500" />;
      case 'points':
        return <Video size={24} color="#00BA7C" />;
      default:
        return <Bell size={24} color="#1877F2" />;
    }
  };

  // Render a notification item
  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => {
        // Navigate based on notification type and contentId
        if (item.contentId) {
          router.push(`/video-detail?id=${item.contentId}`);
        }
      }}
    >
      <View style={styles.iconContainer}>
        {renderNotificationIcon(item.type)}
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={80} color="#333" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              Your notifications will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.notificationsList}
            showsVerticalScrollIndicator={false}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
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
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#1877F2',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#777',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    marginTop: 8,
  },
}); 