import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePointsStore } from '@/store/usePointsStore';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function VideoDetailScreen() {
  const video = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [hasEarnedPoints, setHasEarnedPoints] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { points, addPoints } = usePointsStore();
  const [displayPoints, setDisplayPoints] = useState(points); // Local state for display

  const videoData = {
    id: '1',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Street Dance Performance',
    author: '@streetdancer',
    points: 10,
  };

  useEffect(() => {
    if (!status || !status.isLoaded || hasEarnedPoints) return;

    const isFinished =
      status.didJustFinish ||
      (status.durationMillis && status.positionMillis >= status.durationMillis - 100);

    if (isFinished) {
      console.log('Video completed. Current points:', points);
      addPoints(videoData.points);
      setHasEarnedPoints(true);
      setDisplayPoints(points + videoData.points); // Force local update
      console.log('Points added. New total should be:', points + videoData.points);
    }
  }, [status, hasEarnedPoints, addPoints, points, videoData.points]);

  const handlePlaybackStatusUpdate = (newStatus: AVPlaybackStatus) => {
    setStatus(newStatus);
    if (newStatus.isLoaded) {
      console.log(
        `Position: ${newStatus.positionMillis}/${newStatus.durationMillis}, Finished: ${newStatus.didJustFinish}`
      );
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    video.current?.setIsMutedAsync(!isMuted);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="white" size={24} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {videoData.title}
        </Text>
      </View>

      <Video
        ref={video}
        style={styles.video}
        source={{ uri: videoData.url }}
        useNativeControls={false}
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        isMuted={isMuted}
        shouldPlay
      />

      <View style={styles.controls}>
        <Pressable onPress={toggleMute} style={styles.muteButton}>
          {isMuted ? <VolumeX color="white" size={24} /> : <Volume2 color="white" size={24} />}
        </Pressable>
      </View>

      <View style={styles.info}>
        <Text style={styles.author} numberOfLines={1} ellipsizeMode="tail">
          {videoData.author}
        </Text>
        {hasEarnedPoints && (
          <Text style={styles.earnedPoints} numberOfLines={1} ellipsizeMode="tail">
            +{videoData.points} points earned! Total: {displayPoints}
          </Text>
        )}
        {!hasEarnedPoints && status?.isLoaded && (
          <Text style={styles.watchPrompt} numberOfLines={2} ellipsizeMode="tail">
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    maxWidth: width * 0.7,
  },
  video: {
    width: '100%',
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  muteButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 50,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  info: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    width: '100%',
  },
  author: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
    maxWidth: '85%',
  },
  earnedPoints: {
    color: '#00ff00',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    maxWidth: '85%',
  },
  watchPrompt: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    maxWidth: '85%',
  },
});