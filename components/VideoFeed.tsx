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
  AppState,
  AppStateStatus,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { useRouter, useFocusEffect } from 'expo-router';
import { Play, Share2, CheckCircle, ThumbsUp, ThumbsDown, Lock, PlayCircle, RefreshCw } from 'lucide-react-native';
import { usePoints } from '../hooks/usePoints';
import { useReactions } from '../hooks/useReactions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as videoService from '../tunnel-ad-main/services/videoService';
import { useSanityAuth } from '../app/hooks/useSanityAuth';

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
  thumbnail?: string;
  views?: number;
  likes?: number;
  dislikes?: number;
  authorId?: string;
}

interface VideoItemProps {
  item: VideoItem;
  isCurrentVideo: boolean;
  onVideoRef: (id: string, ref: any) => void;
  isLocked?: boolean;
  autoScroll: boolean;
  toggleAutoScroll: () => void;
  autoScrollPulse: Animated.Value;
}

interface VideoRefs {
  [key: string]: {
    current: any;
    getLastPosition: () => number;
    resetPosition: () => void;
  };
}

interface ViewableItemsInfo {
  viewableItems: Array<ViewToken>;
  changed: Array<ViewToken>;
}

const VideoItemComponent = React.memo(({ 
  item, 
  isCurrentVideo, 
  onVideoRef, 
  isLocked = false, 
  autoScroll, 
  toggleAutoScroll,
  autoScrollPulse
}: VideoItemProps): JSX.Element => {
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
  const lastPositionRef = useRef<number>(0);

  // Listen for tab state changes
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('VIDEO_TAB_STATE', (event) => {
      setIsTabActive(event.isActive);
      
      // Immediately pause and mute the video when tab becomes inactive
      if (!event.isActive && videoRef.current) {
        videoRef.current.pauseAsync().catch(() => {});
        videoRef.current.setIsMutedAsync(true).catch(() => {});
      }
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
    onVideoRef(item.id, {
      current: videoRef.current,
      getLastPosition: () => lastPositionRef.current,
      resetPosition: () => { lastPositionRef.current = 0; }
    });
    
    // Listen for points reset
    const subscription = DeviceEventEmitter.addListener('POINTS_UPDATED', (event) => {
      if (event?.type === 'reset') {
        resetState();
        lastPositionRef.current = 0;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [item.id, onVideoRef]);

  // Always stop videos when they're no longer current
  useEffect(() => {
    if (!isCurrentVideo && videoRef.current) {
      // Fully stop the video when it's no longer the current one
      videoRef.current.stopAsync().catch(() => {});
      videoRef.current.setIsMutedAsync(true).catch(() => {});
    } else if (isCurrentVideo && isTabActive && videoRef.current) {
      // Only start playing when this becomes the current video
      videoRef.current.playAsync().catch(() => {});
      videoRef.current.setIsMutedAsync(false).catch(() => {});
    }
  }, [isCurrentVideo, isTabActive]);

  // Ensure current refs are passed to parent
  useEffect(() => {
    // Update the reference any time videoRef changes
    if (videoRef.current) {
      onVideoRef(item.id, {
        current: videoRef.current,
        getLastPosition: () => lastPositionRef.current,
        resetPosition: () => { lastPositionRef.current = 0; }
      });
    }
  });

  // Additional effect to fully stop video when no longer active
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.stopAsync();
          videoRef.current.unloadAsync();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  // Replace the existing useEffect that responds to isCurrentVideo & isTabActive changes
  useEffect(() => {
    if (isCurrentVideo && isTabActive) {
      // Play and unmute the current video only if tab is active
      videoRef.current?.playAsync().catch(() => {});
      videoRef.current?.setIsMutedAsync(false).catch(() => {});
    } else {
      // Stop videos that are not visible or when tab is not active
      videoRef.current?.stopAsync().catch(() => {});
      videoRef.current?.setIsMutedAsync(true).catch(() => {});
      setShowButtons(false);
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.stopAsync().catch(() => {});
        videoRef.current.setIsMutedAsync(true).catch(() => {});
      }
    };
  }, [isCurrentVideo, isTabActive]);

  const handlePlaybackStatusUpdate = async (status: any) => {
    setStatus(status);
    
    // Detect video completion and emit event
    if (status.didJustFinish) {
      setShowButtons(false);
      // Emit event that video has ended - always emit this regardless of previous watch status
      DeviceEventEmitter.emit('VIDEO_ENDED', { videoId: item.id });
    }
    
    // Store the current position for potential resuming
    if (status.isLoaded && status.positionMillis) {
      lastPositionRef.current = status.positionMillis;
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
        marginTop: -170 // Match test.tsx value for horizontal videos
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
      pathname: '/video-detail' as any,
      params: { id: item.id }
    });
  };

  const handleLike = async () => {
    const newAction = reactions.userAction === 'like' ? null : 'like';
    setReactions({
      ...reactions,
      userAction: newAction,
      likes: newAction === 'like' ? reactions.likes + 1 : reactions.likes - 1
    });
  };

  const handleDislike = async () => {
    const newAction = reactions.userAction === 'dislike' ? null : 'dislike';
    setReactions({
      ...reactions,
      userAction: newAction,
      dislikes: newAction === 'dislike' ? reactions.dislikes + 1 : reactions.dislikes - 1
    });
  };

  // Add special styles for horizontal video info content positioning
  const getContentPositionStyles = () => {
    if (item.type === 'horizontal') {
      return {
        videoInfoStyle: {
          position: 'absolute' as const,
          bottom: 0,
          left: SCREEN_WIDTH * 0.05,
          width: SCREEN_WIDTH * 0.65,
          marginBottom: SCREEN_HEIGHT * 0.14,
          zIndex: 10,
        },
        actionButtonsStyle: {
          position: 'absolute' as const,
          bottom: 0,
          right: SCREEN_WIDTH * 0.05,
          marginBottom: SCREEN_HEIGHT * 0.14,
          zIndex: 10,
        }
      };
    }
    return {
      videoInfoStyle: {
        position: 'absolute' as const,
        bottom: 0,
        left: SCREEN_WIDTH * 0.05,
        width: SCREEN_WIDTH * 0.65,
        marginBottom: SCREEN_HEIGHT * 0.14,
        zIndex: 10,
      },
      actionButtonsStyle: {
        position: 'absolute' as const,
        bottom: 0,
        right: SCREEN_WIDTH * 0.05,
        marginBottom: SCREEN_HEIGHT * 0.14,
        zIndex: 10,
      }
    };
  };

  const { videoInfoStyle, actionButtonsStyle } = getContentPositionStyles();

  return (
    <View style={[
      styles.videoContainer,
      item.type === 'vertical' ? styles.verticalContainer : styles.horizontalContainer
    ]}>
      <Video
        ref={videoRef}
        source={{ uri: item.url }}
        style={[styles.video, { 
          width, 
          height, 
          marginTop 
        }]}
        resizeMode={resizeMode}
        isLooping
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onLoad={onLoad}
        useNativeControls={false}
        shouldPlay={isCurrentVideo && isTabActive && !isLocked}
        isMuted={!isCurrentVideo || !isTabActive || isLocked}
        volume={1.0}
        progressUpdateIntervalMillis={500}
      />
      <View style={[
        styles.overlay,
        item.type === 'vertical' ? styles.verticalOverlay : styles.horizontalOverlay
      ]}>
        <View style={[styles.videoInfo, videoInfoStyle]}>
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
        <View style={[styles.actionButtons, actionButtonsStyle]}>
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
          
          {/* Auto-scroll toggle button */}
          {isCurrentVideo && (
            <Animated.View style={{
              transform: [{ scale: autoScrollPulse }]
            }}>
              <Pressable 
                style={[
                  styles.inlineAutoScrollButton,
                  autoScroll && styles.inlineAutoScrollButtonActive
                ]} 
                onPress={toggleAutoScroll}
              >
                <PlayCircle 
                  color={autoScroll ? 'white' : '#1877F2'} 
                  size={SCREEN_WIDTH * 0.045} 
                />
                <Text style={[
                  styles.inlineAutoScrollText,
                  autoScroll && styles.inlineAutoScrollTextActive
                ]}>
                  {autoScroll ? 'Auto ON' : 'Auto OFF'}
                </Text>
              </Pressable>
            </Animated.View>
          )}
          
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
      
      {/* Lock overlay when premium alert is shown */}
      {isLocked && isCurrentVideo && (
        <View style={styles.lockOverlay}>
          <Lock color="white" size={SCREEN_WIDTH * 0.1} />
        </View>
      )}
    </View>
  );
});

export default function VideoFeed() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [lastVideoId, setLastVideoId] = useState<string | null>(null);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showLockedVideo, setShowLockedVideo] = useState(false);
  const [showAutoScrollModal, setShowAutoScrollModal] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(false);
  const { user } = useSanityAuth();
  
  const flatListRef = useRef<FlatList>(null);
  const videoRefs = useRef<VideoRefs>({});
  const initRef = useRef(false);
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 70 });
  const onViewableItemsChangedRef = useRef((info: ViewableItemsInfo) => {
    if (info.viewableItems.length > 0) {
      const index = info.viewableItems[0].index ?? 0;
      setCurrentVideoIndex(index);
    }
  });
  const autoScrollPulse = useRef(new Animated.Value(1)).current;
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle Video refs
  const handleVideoRef = (id: string, ref: any) => {
    videoRefs.current[id] = ref;
  };
  
  // Toggle auto-scroll
  const toggleAutoScroll = useCallback(() => {
    const newValue = !isAutoScrollEnabled;
    setIsAutoScrollEnabled(newValue);
    
    // Save preference
    AsyncStorage.setItem('autoScrollEnabled', String(newValue))
      .catch(err => console.error('Error saving auto-scroll preference:', err));
      
    // Schedule next auto-scroll if enabled
    if (newValue && videos.length > currentVideoIndex + 1) {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
      
      autoScrollTimeoutRef.current = setTimeout(() => {
        if (flatListRef.current && videos.length > currentVideoIndex + 1) {
          flatListRef.current.scrollToIndex({
            index: currentVideoIndex + 1,
            animated: true
          });
        }
      }, 5000); // Auto-scroll after 5 seconds
    }
  }, [isAutoScrollEnabled, videos, currentVideoIndex]);
  
  // Load videos from Sanity
  const loadVideos = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setLastVideoId(null);
      } else if (!hasMoreVideos || loadingMore) {
        return;
      } else {
        setLoadingMore(true);
      }
      
      console.log('Loading videos, lastId:', lastVideoId);
      
      // Using null for the `lastId` parameter as the videoService expects it
      const fetchedVideos = await videoService.fetchVideos(
        20, 
        refresh ? null : (lastVideoId as null | undefined)
      );
      
      // Update state based on whether this is a refresh or pagination
      if (refresh) {
        setVideos(fetchedVideos);
      } else {
        setVideos(prev => [...prev, ...fetchedVideos]);
      }
      
      // Update pagination state
      if (fetchedVideos.length > 0) {
        setLastVideoId(fetchedVideos[fetchedVideos.length - 1].id);
      }
      setHasMoreVideos(fetchedVideos.length === 20);
      
      console.log(`Loaded ${fetchedVideos.length} videos`);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [lastVideoId, hasMoreVideos, loadingMore]);
  
  // Initial load
  useEffect(() => {
    if (!initRef.current) {
      loadVideos(true);
      initRef.current = true;
    }
  }, [loadVideos]);
  
  // Configure auto-scroll animation
  useEffect(() => {
    const pulsateAnimation = () => {
      Animated.sequence([
        Animated.timing(autoScrollPulse, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(autoScrollPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ]).start(() => pulsateAnimation());
    };
    
    pulsateAnimation();
    
    return () => {
      autoScrollPulse.stopAnimation();
    };
  }, [autoScrollPulse]);
  
  // Reset video position helper function
  const resetVideoPosition = (videoId: string) => {
    const videoRef = videoRefs.current[videoId];
    if (videoRef && typeof videoRef.resetPosition === 'function') {
      videoRef.resetPosition();
    }
  };
  
  // Load more videos when reaching the end
  const handleEndReached = () => {
    if (!loadingMore && hasMoreVideos) {
      loadVideos();
    }
  };
  
  // Add pull-to-refresh functionality
  const handleRefresh = () => {
    loadVideos(true);
  };
  
  // Render video item
  const renderVideo = ({ item, index }: { item: VideoItem; index: number }) => (
    <VideoItemComponent
      key={item.id}
      item={item}
      isCurrentVideo={index === currentVideoIndex}
      onVideoRef={handleVideoRef}
      isLocked={showLockedVideo && index > 1}
      autoScroll={isAutoScrollEnabled}
      toggleAutoScroll={toggleAutoScroll}
      autoScrollPulse={autoScrollPulse}
    />
  );
  
  // Render loading state
  if (isLoading && videos.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0070F3" />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={AVAILABLE_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChangedRef.current}
        viewabilityConfig={viewConfigRef.current}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        snapToAlignment="start"
        removeClippedSubviews={true}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        ListFooterComponent={loadingMore ? (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color="#0070F3" />
            <Text style={styles.loadMoreText}>Loading more videos...</Text>
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No videos found</Text>
            <Pressable style={styles.refreshButton} onPress={() => loadVideos(true)}>
              <RefreshCw color="#fff" size={20} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </Pressable>
          </View>
        }
      />
      
      {/* Show spinner when loading more videos */}
      {loadingMore && videos.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#0070F3" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: AVAILABLE_HEIGHT,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  verticalContainer: {
    height: AVAILABLE_HEIGHT,
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'relative',
  },
  horizontalContainer: {
    height: AVAILABLE_HEIGHT,
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 10,
    position: 'relative',
  },
  video: {
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: SCREEN_HEIGHT * 0.02,
    zIndex: 5,
  },
  videoInfo: {
    position: 'absolute',
    bottom: 0,
    left: SCREEN_WIDTH * 0.05,
    width: SCREEN_WIDTH * 0.65,
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
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.035,
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
    fontWeight: '600',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#0070F3',
    fontSize: 16,
    marginTop: 10,
  },
  loadMoreContainer: {
    padding: 10,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#0070F3',
    fontSize: 14,
    marginTop: 8,
  },
  emptyContainer: {
    height: AVAILABLE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#AAA',
    fontSize: 16,
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#AAA',
    fontSize: 14,
    marginLeft: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalOverlay: {
    justifyContent: 'flex-end',
    paddingBottom: SCREEN_HEIGHT * 0.02,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  horizontalOverlay: {
    justifyContent: 'space-between',
    paddingVertical: SCREEN_HEIGHT * 0.02,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionButtons: {
    position: 'absolute',
    right: SCREEN_WIDTH * 0.05,
    bottom: 0,
    alignItems: 'center',
    gap: SCREEN_HEIGHT * 0.025,
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
  inlineAutoScrollButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: SCREEN_WIDTH * 0.08,
    borderWidth: 1,
    borderColor: '#1877F2',
    padding: SCREEN_WIDTH * 0.015,
    marginVertical: SCREEN_HEIGHT * 0.01,
    width: SCREEN_WIDTH * 0.17,
  },
  inlineAutoScrollButtonActive: {
    backgroundColor: '#1877F2',
  },
  inlineAutoScrollText: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.03,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  inlineAutoScrollTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
