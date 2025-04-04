import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePointsStore } from '@/store/usePointsStore';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react-native';
import * as videoService from '@/tunnel-ad-main/services/videoService';

const { width } = Dimensions.get('window');

// Define VideoItem interface to match the one in VideoFeed.tsx
interface VideoItem {
  id: string;
  url: string;
  title: string;
  author: string;
  description: string;
  points: number;
  type: 'vertical' | 'horizontal';
  aspectRatio?: number;
  thumbnail?: string;
  views?: number;
  likes?: number;
  dislikes?: number;
  comments?: number;
  authorId?: string;
  authorAvatar?: string;
  isVerified?: boolean;
  isBlueVerified?: boolean;
}

export default function VideoDetailScreen() {
  const video = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [hasEarnedPoints, setHasEarnedPoints] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoData, setVideoData] = useState<VideoItem | null>(null);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { points, addPoints } = usePointsStore();
  const [displayPoints, setDisplayPoints] = useState(points); // Local state for display

  // Fetch video data based on the ID parameter
  useEffect(() => {
    const fetchVideoData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        // Query for videos and find the one matching our ID
        const videos = await videoService.fetchVideos(20, null);
        const video = videos.find((v: VideoItem) => v.id === id);
        
        if (video) {
          setVideoData(video);
          // Update video view count
          if (video.id) {
            try {
              // Increment views by 1
              const success = await videoService.updateVideoStats(video.id, { views: 1 });
              if (success) {
                console.log('Successfully updated view count for video:', video.id);
              } else {
                console.warn('Failed to update view count, but continuing playback');
              }
            } catch (error) {
              console.error('Error updating view count:', error);
              // Continue execution even if view count update fails
              // This ensures the video still plays even if stats can't be updated
            }
          }
        } else {
          console.error(`Video with ID ${id} not found`);
        }
      } catch (error) {
        console.error('Error fetching video data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVideoData();
  }, [id]);

  useEffect(() => {
    if (!status || !status.isLoaded || hasEarnedPoints || !videoData) return;

    const isFinished =
      status.didJustFinish ||
      (status.durationMillis && status.positionMillis >= status.durationMillis - 100);

    if (isFinished) {
      console.log('Video completed. Current points:', points);
      const pointsToAdd = videoData.points || 10;
      addPoints(pointsToAdd);
      setHasEarnedPoints(true);
      setDisplayPoints(points + pointsToAdd); // Force local update
      console.log('Points added. New total should be:', points + pointsToAdd);
    }
  }, [status, hasEarnedPoints, addPoints, points, videoData]);

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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#1877F2" />
        <Text style={styles.loadingText}>Loading video...</Text>
      </View>
    );
  }

  if (!videoData) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>Video not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backToFeedButton}>
          <Text style={styles.backToFeedText}>Back to Feed</Text>
        </Pressable>
      </View>
    );
  }

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
        {videoData.description && (
          <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
            {videoData.description}
          </Text>
        )}
        {hasEarnedPoints && (
          <Text style={styles.earnedPoints} numberOfLines={1} ellipsizeMode="tail">
            +{videoData.points} points earned! Total: {displayPoints}
          </Text>
        )}
        {!hasEarnedPoints && status?.isLoaded && (
          <Text style={styles.watchPrompt} numberOfLines={2} ellipsizeMode="tail">
            Watch the full video to earn {videoData.points || 10} points!
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 30,
    textAlign: 'center',
  },
  backToFeedButton: {
    backgroundColor: '#1877F2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  backToFeedText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  description: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    maxWidth: '85%',
  },
});