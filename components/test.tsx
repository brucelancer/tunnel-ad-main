import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  Share,
  ViewToken,
  Animated,
  DeviceEventEmitter,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { useRouter, useFocusEffect } from 'expo-router';
import { Play, Share2, CheckCircle, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { usePoints } from '../hooks/usePoints';
import { useReactions } from '../hooks/useReactions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Adjusted heights based on navigation structure
const HEADER_HEIGHT = 140; // Combined header + tabs height
const BOTTOM_NAV_HEIGHT = 0;
const AVAILABLE_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - BOTTOM_NAV_HEIGHT;

type VideoType = 'vertical' | 'horizontal';

interface VideoItem {
  id: string;
  url: string;
  title: string;
  author: string;
  description: string;
  points: number;
  type: VideoType;
  aspectRatio?: number;
}

const VIDEOS: VideoItem[] = [
  {
    id: '1',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Street Dance Performance',
    author: '@streetdancer',
    description: 'Amazing street dance performance! 🔥 #dance #street',
    points: 10,
    type: 'horizontal',
    aspectRatio: 16/9,
  },
  {
    id: '2',
    url: 'https://media.istockphoto.com/id/2185373575/th/%E0%B8%A7%E0%B8%B4%E0%B8%94%E0%B8%B5%E0%B9%82%E0%B8%AD/%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99%E0%B8%8A%E0%B8%B2%E0%B8%A2%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%88%E0%B8%94%E0%B8%88%E0%B9%88%E0%B8%AD%E0%B8%9F%E0%B8%B1%E0%B8%87%E0%B8%AD%E0%B8%A2%E0%B9%88%E0%B8%B2%E0%B8%87%E0%B8%95%E0%B8%B1%E0%B9%89%E0%B8%87%E0%B9%83%E0%B8%88%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%88%E0%B8%94%E0%B8%9A%E0%B8%B1%E0%B8%99%E0%B8%97%E0%B8%B6%E0%B8%81%E0%B9%83%E0%B8%99%E0%B8%8A%E0%B8%B1%E0%B9%89%E0%B8%99%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99%E0%B9%82%E0%B8%94%E0%B8%A2%E0%B8%A1%E0%B8%B5%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99%E0%B8%AB%E0%B8%8D%E0%B8%B4%E0%B8%87%E0%B9%80%E0%B8%9A%E0%B8%A5%E0%B8%AD%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%9E%E0%B8%B7%E0%B9%89%E0%B8%99%E0%B8%AB.mp4?s=mp4-640x640-is&k=20&c=IT9YrpEspdX8iipnjdLK-irPRU_zexRUUyOlCTQF4cw=',
    title: 'Urban Dance Battle',
    author: '@urbandancer',
    description: 'Epic dance battle in the city! 💫 #battle #urban',
    points: 10,
    type: 'vertical',
    aspectRatio: 9/16,
  },
  {
    id: '3',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Contemporary Dance',
    author: '@contemporary',
    description: 'Beautiful contemporary dance piece ✨ #contemporary #art',
    points: 10,
    type: 'horizontal',
    aspectRatio: 16/9,
  },
  {
    id: '4',
    url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    title: 'Contemporary Dance',
    author: '@contemporary',
    description: 'Beautiful contemporary dance piece ✨ #contemporary #art',
    points: 10,
    type: 'horizontal',
    aspectRatio: 16/9,
  },
  {
    id: '5',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Contemporary Dance',
    author: '@contemporary',
    description: 'Beautiful contemporary dance piece ✨ #contemporary #art',
    points: 10,
    type: 'horizontal',
    aspectRatio: 16/9,
  },
  {
    id: '6',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Contemporary Dance',
    author: '@contemporary',
    description: 'Beautiful contemporary dance piece ✨ #contemporary #art',
    points: 10,
    type: 'horizontal',
    aspectRatio: 16/9,
  },
];

interface VideoItemProps {
  item: VideoItem;
  isCurrentVideo: boolean;
  onVideoRef: (id: string, ref: any) => void;
}

const VideoItemComponent = React.memo(({ item, isCurrentVideo, onVideoRef }: VideoItemProps): JSX.Element => {
  const router = useRouter();
  const { addPoints, hasWatchedVideo } = usePoints();
  const { getVideoReactions, updateReaction, loadReactions } = useReactions();
  const [status, setStatus] = useState<any>(null);
  const [showButtons, setShowButtons] = useState(false);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [hasEarnedPoints, setHasEarnedPoints] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [showStaticPoints, setShowStaticPoints] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [reactions, setReactions] = useState(() => getVideoReactions(item.id));
  const [isTabActive, setIsTabActive] = useState(true);
  const videoRef = useRef<any>(null);
  const pointsAnimation = useRef(new Animated.Value(0)).current;
  const pointsScale = useRef(new Animated.Value(1)).current;
  const hasShownAnimationRef = useRef(false);

  // Listen for tab state changes
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('VIDEO_TAB_STATE', (event) => {
      setIsTabActive(event.isActive);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Load reactions when component mounts or becomes current
  useEffect(() => {
    if (isCurrentVideo) {
      loadReactions();
    }
  }, [isCurrentVideo, loadReactions]);

  // Update reactions when they change in storage
  useEffect(() => {
    const updateLocalReactions = () => {
      const updatedReactions = getVideoReactions(item.id);
      setReactions(updatedReactions);
    };

    // Initial load
    updateLocalReactions();
    
    const subscription = DeviceEventEmitter.addListener('REACTIONS_UPDATED', (event) => {
      if (event?.type === 'reset' || (event?.type === 'update' && event?.videoId === item.id)) {
        updateLocalReactions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [item.id, getVideoReactions]);

  // Reset state when points are updated (including reset)
  const resetState = () => {
    setHasEarnedPoints(false);
    setShowPointsAnimation(false);
    setShowStaticPoints(false);
    pointsAnimation.setValue(0);
    pointsScale.setValue(1);
    hasShownAnimationRef.current = false;
    // Reset video progress
    if (videoRef.current) {
      videoRef.current.setPositionAsync(0);
    }
  };

  // Check watched status whenever it might change
  useEffect(() => {
    const isWatched = hasWatchedVideo(item.id);
    setHasEarnedPoints(isWatched);
    // Show static points only if not watched yet
    setShowStaticPoints(!isWatched);
  }, [hasWatchedVideo, item.id]);

  useEffect(() => {
    onVideoRef(item.id, videoRef);

    // Listen for points reset
    const subscription = DeviceEventEmitter.addListener('POINTS_UPDATED', (event) => {
      if (event?.type === 'reset') {
        resetState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [item.id, onVideoRef]);

  useEffect(() => {
    if (isCurrentVideo && isTabActive) {
      // Play and unmute the current video only if tab is active
      videoRef.current?.playAsync();
      videoRef.current?.setIsMutedAsync(false);
    } else {
      // Stop and mute videos that are not visible or when tab is not active
      videoRef.current?.pauseAsync();
      videoRef.current?.setIsMutedAsync(true);
      setShowButtons(false);
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.pauseAsync();
        videoRef.current.setIsMutedAsync(true);
      }
    };
  }, [isCurrentVideo, isTabActive]);

  const handlePlaybackStatusUpdate = async (status: any) => {
    setStatus(status);
    if (status.didJustFinish) {
      setShowButtons(false);
    }
    
    // Calculate and display remaining time until halfway point
    if (status.positionMillis && status.durationMillis) {
      const halfwayPoint = status.durationMillis / 2;
      const remainingMillis = halfwayPoint - status.positionMillis;
      
      if (remainingMillis > 0 && !hasEarnedPoints) {
        const seconds = Math.ceil(remainingMillis / 1000);
        setRemainingTime(`${seconds}s`);
      } else {
        setRemainingTime('');
      }

      if (status.positionMillis >= halfwayPoint && !hasEarnedPoints) {
        const pointsAdded = await addPoints(10, item.id);
        if (pointsAdded) {
          setHasEarnedPoints(true);
          setShowStaticPoints(false);
          setShowPointsAnimation(true);
          animatePoints();
        }
      }
    }
  };

  const animatePoints = () => {
    // Reset animations
    pointsAnimation.setValue(0);
    pointsScale.setValue(1);

    // Create a more dynamic animation sequence
    Animated.parallel([
      // Floating up animation with easing
      Animated.timing(pointsAnimation, {
        toValue: 150,
        duration: 1500,
        useNativeDriver: true,
      }),
      // Scale and fade animation sequence
      Animated.sequence([
        // Quick pop in
        Animated.spring(pointsScale, {
          toValue: 1.8,
          damping: 12,
          stiffness: 150,
          useNativeDriver: true,
        }),
        // Smooth scale down to normal
        Animated.timing(pointsScale, {
          toValue: 1.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setTimeout(() => {
        setShowPointsAnimation(false); // Hide animation after a delay
      }, 500);
    });
  };

  const calculateVideoDimensions = () => {
    const isVertical = item.type === 'vertical';
    const aspectRatio = item.aspectRatio || (isVertical ? 9/16 : 16/9);
    
    if (isVertical) {
      const maxHeight = AVAILABLE_HEIGHT;
      const maxWidth = SCREEN_WIDTH;
      const heightBasedOnWidth = maxWidth / aspectRatio;
      const widthBasedOnHeight = maxHeight * aspectRatio;
      
      if (heightBasedOnWidth <= maxHeight) {
        return {
          width: maxWidth,
          height: heightBasedOnWidth,
          resizeMode: ResizeMode.COVER,
          marginTop: 0
        };
      } else {
        return {
          width: widthBasedOnHeight,
          height: maxHeight,
          resizeMode: ResizeMode.COVER,
          marginTop: 0
        };
      }
    } else {
      // Horizontal video
      const maxWidth = SCREEN_WIDTH;
      const height = maxWidth / aspectRatio;
      return {
        width: maxWidth,
        height: Math.min(height, AVAILABLE_HEIGHT),
        resizeMode: ResizeMode.CONTAIN,
        marginTop: -170
      };
    }
  };

  const { width, height, resizeMode, marginTop } = calculateVideoDimensions();

  const onLoad = (status: any) => {
    if (status.isLoaded && status.naturalSize) {
      setVideoSize({
        width: status.naturalSize.width,
        height: status.naturalSize.height,
      });
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `${item.title} - Check out this video! ${item.url}`,
        url: item.url,
        title: item.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const onReplay = async () => {
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(0);
      await videoRef.current.playAsync();
      setShowButtons(false);
    }
  };

  const handleWatchFull = async () => {
    if (videoRef.current) {
      await videoRef.current.stopAsync();
    }
    router.push({
      pathname: '/video-detail',
      params: { id: item.id }
    });
  };

  const handleLike = async () => {
    const newAction = reactions.userAction === 'like' ? null : 'like';
    await updateReaction(item.id, newAction);
  };

  const handleDislike = async () => {
    const newAction = reactions.userAction === 'dislike' ? null : 'dislike';
    await updateReaction(item.id, newAction);
  };

  return (
    <View style={[
      styles.videoContainer,
      item.type === 'vertical' ? styles.verticalContainer : styles.horizontalContainer
    ]}>
      <Video
        ref={videoRef}
        source={{ uri: item.url }}
        style={[styles.video, { width, height, marginTop }]}
        resizeMode={resizeMode}
        isLooping
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onLoad={onLoad}
        useNativeControls={false}
        shouldPlay={isCurrentVideo && isTabActive}
        isMuted={!isCurrentVideo || !isTabActive}
        volume={1.0}
        progressUpdateIntervalMillis={500}
      />
      <View style={[
        styles.overlay,
        item.type === 'vertical' ? styles.verticalOverlay : styles.horizontalOverlay
      ]}>
        <View style={styles.videoInfo}>
          <View style={styles.authorContainer}>
          <Text style={styles.author} numberOfLines={1} ellipsizeMode="tail">
            {item.author}
          </Text>
            {remainingTime && !hasEarnedPoints && (
              <View style={styles.countdownWrapper}>
                <View style={styles.countdownDot} />
                <Text style={styles.inlineCountdown}>
                  <Text style={styles.countdownLabel}>WATCH </Text>
                  {remainingTime}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
            {item.description}
          </Text>
          <Pressable style={styles.watchFullButton} onPress={handleWatchFull}>
            <Text style={styles.watchFullButtonText}>Watch Full</Text>
          </Pressable>
        </View>
        <View style={styles.actionButtons}>
          <View style={styles.likeContainer}>
            <Pressable onPress={handleLike} style={styles.actionButton}>
              <ThumbsUp 
                color={reactions.userAction === 'like' ? '#1877F2' : 'white'} 
                fill={reactions.userAction === 'like' ? '#1877F2' : 'transparent'}
                size={SCREEN_WIDTH * 0.06} 
              />
              <Text style={[styles.actionCount, reactions.userAction === 'like' && styles.activeCount]}>
                {reactions.likes}
              </Text>
            </Pressable>
            <Pressable onPress={handleDislike} style={styles.actionButton}>
              <ThumbsDown 
                color={reactions.userAction === 'dislike' ? '#1877F2' : 'white'} 
                fill={reactions.userAction === 'dislike' ? '#1877F2' : 'transparent'}
                size={SCREEN_WIDTH * 0.06} 
              />
              <Text style={[styles.actionCount, reactions.userAction === 'dislike' && styles.activeCount]}>
                {reactions.dislikes}
              </Text>
            </Pressable>
          </View>
          <Pressable onPress={onShare} style={styles.shareButton}>
            <Share2 color="white" size={SCREEN_WIDTH * 0.06} />
          </Pressable>
          <View style={styles.watchedContainer}>
            {hasEarnedPoints && <CheckCircle color="#00ff00" size={SCREEN_WIDTH * 0.06} />}
            {showStaticPoints && !showPointsAnimation && (
              <View style={styles.staticPoints}>
                <Text style={styles.pointsText}>+10 P</Text>
              </View>
            )}
            {showPointsAnimation && (
              <Animated.View
                style={[
                  styles.pointsEarned,
                  {
                    transform: [
                      { translateY: pointsAnimation.interpolate({
                        inputRange: [0, 75, 150],
                        outputRange: [0, -75, -150],
                        extrapolate: 'clamp'
                      })},
                      { scale: pointsScale }
                    ],
                    opacity: pointsAnimation.interpolate({
                      inputRange: [0, 75, 150],
                      outputRange: [1, 1, 0],
                      extrapolate: 'clamp'
                    })
                  }
                ]}
              >
                <Text style={styles.pointsText}>+{item.points} 🎉</Text>
              </Animated.View>
            )}
          </View>
        </View>
        {showButtons && (
          <View style={styles.buttonPopup}>
            <Text style={styles.popupHeader}>Video paused ⏸️</Text>
            <Pressable style={styles.replayButton} onPress={onReplay}>
              <Text style={styles.replayButtonText}>Re-play</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
});

interface VideoRefs {
  [key: string]: React.RefObject<any>;
}

interface ViewableItemsInfo {
  viewableItems: Array<ViewToken>;
  changed: Array<ViewToken>;
}

export default function VideoFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const videoRefs = useRef<VideoRefs>({});
  const { loadReactions } = useReactions();

  // Configure audio to play even when device is muted
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,  // iOS will play audio even when the device is in silent mode
          staysActiveInBackground: false,
          shouldDuckAndroid: true,     // Reduce volume of other apps when this app plays audio
          playThroughEarpieceAndroid: false, // Play through speaker, not earpiece
        });
      } catch (error) {
        console.error('Failed to configure audio mode:', error);
      }
    };

    configureAudio();
  }, []);

  useEffect(() => {
    // Listen for points reset and force re-render
    const subscription = DeviceEventEmitter.addListener('POINTS_UPDATED', (event) => {
      // Only reset position if it's from the reset button
      if (event?.type === 'reset') {
        setForceUpdate(prev => prev + 1);
        setCurrentIndex(0);
        // Scroll back to top only on reset
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Load reactions when feed becomes visible
  useFocusEffect(
    React.useCallback(() => {
      loadReactions();
      return () => {};
    }, [loadReactions])
  );

  const handleVideoRef = (id: string, ref: React.RefObject<any>) => {
    videoRefs.current[id] = ref;
  };

  const handleViewabilityChanged = useCallback(({ viewableItems }: ViewableItemsInfo) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const renderVideo = ({ item, index }: { item: VideoItem; index: number }) => (
    <VideoItemComponent
      item={item}
      isCurrentVideo={index === currentIndex}
      onVideoRef={handleVideoRef}
    />
  );

  return (
    <FlatList
      key={forceUpdate}
      ref={flatListRef}
      data={VIDEOS}
      renderItem={renderVideo}
      keyExtractor={(item) => item.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={AVAILABLE_HEIGHT}
      decelerationRate="fast"
      onViewableItemsChanged={handleViewabilityChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 50,
      }}
      style={styles.flatList}
      initialScrollIndex={0}
      getItemLayout={(_, index) => ({
        length: AVAILABLE_HEIGHT,
        offset: AVAILABLE_HEIGHT * index,
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
  videoContainer: {
    height: AVAILABLE_HEIGHT,
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    // Dynamic sizing is applied via calculateVideoDimensions
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: SCREEN_HEIGHT * 0.02,
  },
  videoInfo: {
    position: 'absolute',
    bottom: 0,
    left: SCREEN_WIDTH * 0.05,
    width: SCREEN_WIDTH * 0.65,
    marginBottom: SCREEN_HEIGHT * 0.14,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  author: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.045,
    fontFamily: 'Inter_700Bold',
  },
  description: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.035,
    fontFamily: 'Inter_400Regular',
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  watchFullButton: {
    backgroundColor: 'white',
    paddingVertical: SCREEN_HEIGHT * 0.015,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    borderRadius: SCREEN_WIDTH * 0.06,
    alignItems: 'center',
    width: '100%',
  },
  watchFullButtonText: {
    color: 'black',
    fontSize: SCREEN_WIDTH * 0.035,
    fontFamily: 'Inter_600SemiBold',
  },
  actionButtons: {
    position: 'absolute',
    right: SCREEN_WIDTH * 0.05,
    bottom: 0,
    alignItems: 'center',
    gap: SCREEN_HEIGHT * 0.025,
    marginBottom: SCREEN_HEIGHT * 0.14,
  },
  likeContainer: {
    alignItems: 'center',
    gap: SCREEN_HEIGHT * 0.02,
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.035,
    fontFamily: 'Inter_600SemiBold',
  },
  activeCount: {
    color: '#1877F2',
  },
  shareButton: {
    padding: SCREEN_WIDTH * 0.015,
  },
  points: {
    color: '#00ff00',
    fontSize: SCREEN_WIDTH * 0.04,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  buttonPopup: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -SCREEN_WIDTH * 0.4 }, { translateY: -100 }],
    width: SCREEN_WIDTH * 0.8,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  popupHeader: {
    color: 'white',
    fontSize: 16,
    marginBottom: 15,
  },
  replayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  replayButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  verticalContainer: {
    height: AVAILABLE_HEIGHT,
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  horizontalContainer: {
    height: AVAILABLE_HEIGHT,
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 10,
  },
  verticalOverlay: {
    justifyContent: 'flex-end',
    paddingBottom: SCREEN_HEIGHT * 0.02,
  },
  horizontalOverlay: {
    justifyContent: 'space-between',
    paddingVertical: SCREEN_HEIGHT * 0.02,
  },
  watchedContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  pointsEarned: {
    position: 'absolute',
    top: -50,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    minWidth: 90,
    alignItems: 'center',
  },
  pointsText: {
    color: '#00ff00',
    fontSize: 15,
    
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',

    textShadowRadius: 3,
  },
  staticPoints: {
    position: 'absolute',
    top: -12,
    right: -50,
    width: 100,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 119, 242, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(24, 119, 242, 0.4)',
    gap: 8,
  },
  countdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1877F2',
    opacity: 0.9,
  },
  inlineCountdown: {
    color: '#1877F2',
    fontSize: SCREEN_WIDTH * 0.034,
    fontFamily: 'Inter_600SemiBold',
  },
  countdownLabel: {
    color: '#1877F2',
    fontSize: SCREEN_WIDTH * 0.03,
    fontFamily: 'Inter_400Regular',
    opacity: 0.85,
    letterSpacing: 0.5,
  },
});