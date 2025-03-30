import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { useSanityAuth } from '../app/hooks/useSanityAuth';
import { getSanityClient } from '@/tunnel-ad-main/services/postService';
import { eventEmitter } from '../app/utils/eventEmitter';

const { width } = Dimensions.get('window');

export default function FloatingChatButton() {
  const router = useRouter();
  const { user: currentUser } = useSanityAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pulseAnim = new Animated.Value(1);

  // Start pulsing animation when there are unread messages
  useEffect(() => {
    if (unreadCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [unreadCount]);

  // Check for unread messages
  useEffect(() => {
    fetchUnreadCount();

    // Set up interval to check for new messages every 30 seconds
    const intervalId = setInterval(fetchUnreadCount, 30000);
    
    // Listen for real-time message events
    const messageSubscription = eventEmitter.addListener('message-sent', (update) => {
      // If the message is sent to the current user, update the unread count
      if (update && update.result && update.result.recipient && 
          update.result.recipient._id === currentUser?._id && 
          update.result.sender._id !== currentUser?._id) {
        // Increment unread count
        setUnreadCount(prev => prev + 1);
      }
    });
    
    // Listen for message seen events
    const messageSeenSubscription = eventEmitter.addListener('messages-seen', () => {
      // When messages are marked as seen, immediately reset the badge
      // This provides immediate visual feedback without waiting for the fetch
      setUnreadCount(0);
      
      // Then refetch the count to ensure accuracy
      fetchUnreadCount();
    });
    
    return () => {
      clearInterval(intervalId);
      messageSubscription.remove();
      messageSeenSubscription.remove();
    };
  }, [currentUser]);

  const fetchUnreadCount = async () => {
    if (!currentUser?._id) return;
    
    try {
      setIsLoading(true);
      const client = getSanityClient();
      if (!client) return;
      
      // Fetch unread message count
      const count = await client.fetch(`
        count(*[_type == "message" && recipient._ref == $userId && !seen])
      `, { userId: currentUser._id });
      
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = () => {
    router.push("/conversations" as any);
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ scale: pulseAnim }]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <MessageSquare color="#FFFFFF" size={24} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 120, // Position above the tab bar
    zIndex: 999,
    elevation: 5,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
}); 