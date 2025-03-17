import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePointsStore } from '@/store/usePointsStore';
import { ArrowLeft } from 'lucide-react-native';

export default function VideoDetailScreen() {
  const video = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus>();
  const [hasEarnedPoints, setHasEarnedPoints] = useState(false);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { addPoints } = usePointsStore();

  const videoData = {
    id: '1',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Street Dance Performance',
    author: '@streetdancer',
    points: 10,
  };

  useEffect(() => {
    if (!status?.isLoaded) return;
    
    const playbackStatus = status as AVPlaybackStatusSuccess;
    if (playbackStatus.didJustFinish && !hasEarnedPoints) {
      addPoints(videoData.points);
      setHasEarnedPoints(true);
    }
  }, [status?.isLoaded, hasEarnedPoints, addPoints, videoData.points]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="white" size={24} />
        </Pressable>
        <Text style={styles.title}>{videoData.title}</Text>
      </View>

      <Video
        ref={video}
        style={styles.video}
        source={{ uri: videoData.url }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        onPlaybackStatusUpdate={setStatus}
      />

      <View style={styles.info}>
        <Text style={styles.author}>{videoData.author}</Text>
        {hasEarnedPoints && (
          <Text style={styles.earnedPoints}>+{videoData.points} points earned!</Text>
        )}
        {!hasEarnedPoints && status?.isLoaded && (
          <Text style={styles.watchPrompt}>
            Watch the full video to earn {videoData.points} points!
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  info: {
    padding: 20,
  },
  author: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
  },
  earnedPoints: {
    color: '#00ff00',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  watchPrompt: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});