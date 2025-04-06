import React, { useEffect } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import Feed from '@/components/Feed';
import { useRouter } from 'expo-router';

export default function FeedTabScreen() {
  const router = useRouter();

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
      <Feed />
      </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
}); 