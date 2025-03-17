import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenContainer from '../components/ScreenContainer';

type NotificationType = 'points' | 'system' | 'social';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function NotificationsScreen() {
  // Sample notifications data
  const notifications: Notification[] = [
    {
      id: 1,
      type: 'points',
      title: 'You earned 10 points!',
      message: 'You watched a video for more than 30 seconds.',
      time: '2 hours ago',
      read: false,
    },
    {
      id: 2,
      type: 'system',
      title: 'New feature available',
      message: 'Check out our new tunnelling feature to create your own content.',
      time: '1 day ago',
      read: true,
    },
    {
      id: 3,
      type: 'social',
      title: 'Your friend joined Tunnel',
      message: 'John Doe just joined Tunnel. Say hello!',
      time: '2 days ago',
      read: true,
    },
    {
      id: 4,
      type: 'points',
      title: 'Points redeemed',
      message: 'You successfully redeemed 500 points for a $5 gift card.',
      time: '3 days ago',
      read: true,
    },
    {
      id: 5,
      type: 'system',
      title: 'Account verified',
      message: 'Your account has been successfully verified.',
      time: '1 week ago',
      read: true,
    },
  ];

  const renderNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'points':
        return (
          <LinearGradient
            colors={['#00ff00', '#00cc00']}
            style={styles.iconContainer}
          >
            <Text style={styles.iconText}>P</Text>
          </LinearGradient>
        );
      case 'system':
        return (
          <LinearGradient
            colors={['#1877F2', '#0A5DC2']}
            style={styles.iconContainer}
          >
            <Text style={styles.iconText}>S</Text>
          </LinearGradient>
        );
      case 'social':
        return (
          <LinearGradient
            colors={['#FF3366', '#FF0066']}
            style={styles.iconContainer}
          >
            <Text style={styles.iconText}>@</Text>
          </LinearGradient>
        );
      default:
        return (
          <View style={[styles.iconContainer, { backgroundColor: '#555' }]}>
            <Text style={styles.iconText}>N</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} />
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((notification) => (
          <View 
            key={notification.id} 
            style={[
              styles.notificationItem,
              !notification.read && styles.unreadNotification
            ]}
          >
            {renderNotificationIcon(notification.type)}
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.notificationTime}>{notification.time}</Text>
            </View>
            {!notification.read && <View style={styles.unreadDot} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    height: 90,
    justifyContent: 'flex-end',
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  scrollView: {
    flex: 1,
    paddingTop: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  unreadNotification: {
    backgroundColor: '#1A1A1A',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  notificationMessage: {
    color: '#CCC',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  notificationTime: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1877F2',
    alignSelf: 'center',
  },
}); 