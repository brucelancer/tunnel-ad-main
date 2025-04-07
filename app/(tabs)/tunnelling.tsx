import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import VideoTunnelling from '../components/video-tunnelling';

export default function TunnellingScreen() {
  const router = useRouter();
  
  const handleSubmit = (data: any) => {
    // Handle the submission
    router.back();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      <VideoTunnelling onSubmit={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    margin: 0,
    padding: 0,
  },
}); 