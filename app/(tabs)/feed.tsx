import React, { useEffect, useState } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import Feed from '@/components/Feed';
import { useRouter } from 'expo-router';

export default function FeedTabScreen() {
  const router = useRouter();
  const [key, setKey] = useState(Date.now()); // Key to force component reload

  // Listen for auth state changes to force reload of Feed
  useEffect(() => {
    const authStateSubscription = DeviceEventEmitter.addListener('AUTH_STATE_CHANGED', (event) => {
      console.log('Feed tab detected auth state change:', event?.isAuthenticated);
      // Force Feed component to remount by changing its key
      setKey(Date.now());
    });

    return () => {
      authStateSubscription.remove();
    };
  }, []);

  // Set up scroll event listeners when component mounts
  useEffect(() => {
    // Function to handle scroll events from Feed component
    const handleScroll = (event: { direction: 'up' | 'down' }) => {
      // Emit event to show/hide the tab bar based on scroll direction
      DeviceEventEmitter.emit('TOGGLE_TAB_BAR', { 
        visible: event.direction === 'up'
      });
    };

    // Add listener for scroll events
    const subscription = DeviceEventEmitter.addListener('FEED_SCROLL', handleScroll);

    // Remove listener when component unmounts
    return () => {
      subscription.remove();
    };
  }, []);
    
  return (
    <View style={styles.container}>
      <Feed key={key} /> {/* Use key to force complete remount of Feed component */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
}); 