import React, { useState, useRef, useEffect, useCallback, useContext, MutableRefObject } from 'react';
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
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
  Play, 
  Share2, 
  CheckCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Lock, 
  PlayCircle, 
  RefreshCw, 
  Crown, 
  Maximize, 
  Minimize,
  Search,
  Coins
} from 'lucide-react-native';
import { usePoints } from '../hooks/usePoints';
import { useReactions } from '../hooks/useReactions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as videoService from '../tunnel-ad-main/services/videoService';
import { useSanityAuth } from '../app/hooks/useSanityAuth';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Use full screen height
const HEADER_HEIGHT = (isFullScreen: boolean): number => isFullScreen ? 0 : 50;
const BOTTOM_NAV_HEIGHT = 0;
const AVAILABLE_HEIGHT = SCREEN_HEIGHT;
// Get status bar height for proper safe area handling
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

// Header tab options
const HEADER_TABS = ['Videos', 'Feed', 'Points', 'Search'];

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
  showPremiumAd: boolean;
  isTabFocused: boolean;
  isFullScreen?: boolean;
  toggleFullScreen?: () => void;
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
  autoScrollPulse,
  showPremiumAd,
  isTabFocused,
  isFullScreen = false,
  toggleFullScreen
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

  // Configure audio to play in silent mode
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: 1, // DoNotMix
          interruptionModeAndroid: 1, // DoNotMix
          shouldDuckAndroid: false,
        });
      } catch (error) {
        console.error('Failed to configure audio:', error);
      }
    };
    
    configureAudio();
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
    if (isCurrentVideo && isTabActive && isTabFocused) {
      // Only play and unmute if the video is current AND tab is active AND focused
      videoRef.current?.playAsync().catch(() => {});
      videoRef.current?.setIsMutedAsync(false).catch(() => {});
    } else {
      // Stop and mute videos that are not visible or when tab is not active/focused
      videoRef.current?.pauseAsync().catch(() => {});
      videoRef.current?.setIsMutedAsync(true).catch(() => {});
      setShowButtons(false);
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.pauseAsync().catch(() => {});
        videoRef.current.setIsMutedAsync(true).catch(() => {});
      }
    };
  }, [isCurrentVideo, isTabActive, isTabFocused]);

  const handlePlaybackStatusUpdate = async (status: any) => {
    setStatus(status);
    
    // Detect video completion - enable auto-scroll while still looping
    if (status.didJustFinish) {
      console.log('Video finished, autoScroll:', autoScroll, 'isCurrentVideo:', isCurrentVideo, 'showPremiumAd:', showPremiumAd);
      
      // Emit event that video has ended - always emit this regardless of previous watch status
      DeviceEventEmitter.emit('VIDEO_ENDED', { videoId: item.id });
      
      // Only trigger auto-scroll if premium ad is not showing and auto-scroll is enabled
      if (autoScroll && isCurrentVideo && !showPremiumAd) {
        console.log('Emitting AUTO_SCROLL_NEXT event');
        // Add a small delay to ensure premium ad check is complete
        setTimeout(() => {
          if (!showPremiumAd) {
            DeviceEventEmitter.emit('AUTO_SCROLL_NEXT', { fromVideo: item.id });
          }
        }, 100);
      }
    }
    
    // If premium ad is showing, ensure video stays paused
    if (showPremiumAd && status.isPlaying) {
      videoRef.current?.pauseAsync().catch(() => {});
      return;
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

  // Modify the calculateVideoDimensions function to use this constant
  const calculateVideoDimensions = () => {
    const isVertical = item.type === 'vertical';
    const aspectRatio = item.aspectRatio || (isVertical ? 9/16 : 16/9);
    
    if (isVertical) {
      // For vertical videos, use COVER to fill the entire screen
      // This is how TikTok and YouTube Shorts display videos
      return {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        resizeMode: ResizeMode.COVER,
        marginTop: 0
      };
    } else {
      // Horizontal video
      const maxWidth = SCREEN_WIDTH;
      const height = maxWidth / aspectRatio;
      return {
        width: maxWidth,
        height: Math.min(height, AVAILABLE_HEIGHT),
        resizeMode: ResizeMode.CONTAIN,
        marginTop: 0
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
    // Set different margin values based on fullscreen mode
    const bottomMargin = isFullScreen ? SCREEN_HEIGHT * 0.04 : SCREEN_HEIGHT * 0.14;
    
    // Add extra style adjustments for fullscreen mode
    const fullscreenAdjustments = isFullScreen ? {
      // For author info, add better visibility and position
      videoInfoStyle: {
        bottom: Platform.OS === 'ios' ? 20 : 10,
        marginBottom: bottomMargin,
      },
      // For action buttons, adjust positioning
      actionButtonsStyle: {
        bottom: Platform.OS === 'ios' ? 20 : 10,
        marginBottom: bottomMargin,
        gap: SCREEN_HEIGHT * 0.035
      }
    } : {
      videoInfoStyle: {
        marginBottom: bottomMargin,
      },
      actionButtonsStyle: {
        marginBottom: bottomMargin
      }
    };
    
    if (item.type === 'horizontal') {
      return {
        videoInfoStyle: {
          position: 'absolute' as const,
          bottom: 0,
          left: SCREEN_WIDTH * 0.05,
          width: SCREEN_WIDTH * 0.65,
          zIndex: 10,
          ...fullscreenAdjustments.videoInfoStyle,
        },
        actionButtonsStyle: {
          position: 'absolute' as const,
          bottom: 0,
          right: SCREEN_WIDTH * 0.05,
          zIndex: 10,
          ...fullscreenAdjustments.actionButtonsStyle,
        }
      };
    }
    
    return {
      videoInfoStyle: {
        position: 'absolute' as const,
        bottom: 0,
        left: SCREEN_WIDTH * 0.05,
        width: SCREEN_WIDTH * 0.65,
        zIndex: 10,
        ...fullscreenAdjustments.videoInfoStyle,
      },
      actionButtonsStyle: {
        position: 'absolute' as const,
        bottom: 0,
        right: SCREEN_WIDTH * 0.05,
        zIndex: 10,
        ...fullscreenAdjustments.actionButtonsStyle,
      }
    };
  };

  const { videoInfoStyle, actionButtonsStyle } = getContentPositionStyles();

  return (
    <View style={[
      styles.videoContainer,
      item.type === 'vertical' ? styles.verticalContainer : styles.horizontalContainer
    ]}>
      {/* Video component */}
      <View style={item.type === 'vertical' ? styles.verticalVideoWrapper : styles.horizontalVideoWrapper}>
        <Video
          ref={videoRef}
          source={{ uri: item.url }}
          style={[styles.video, { width, height }]}
          resizeMode={resizeMode}
          isLooping={true}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onLoad={onLoad}
          useNativeControls={false}
          shouldPlay={isCurrentVideo && isTabActive && !isLocked && !showPremiumAd && isTabFocused}
          isMuted={!isCurrentVideo || !isTabActive || isLocked || !isTabFocused}
          volume={1.0}
          progressUpdateIntervalMillis={500}
        />
      </View>
      
      {/* UI Overlay with SafeAreaView for better positioning */}
      <SafeAreaView style={[
        styles.overlay,
        item.type === 'vertical' ? styles.verticalOverlay : styles.horizontalOverlay
      ]}>
        <View style={[styles.videoInfo, videoInfoStyle]}>
          {/* Author info */}
          <View style={styles.authorContainer}>
            <Text 
              style={[
                styles.author,
                // Enhance text visibility in fullscreen mode
                isFullScreen && {
                  fontSize: SCREEN_WIDTH * 0.05,
                  textShadowColor: 'rgba(0,0,0,0.7)',
                  textShadowRadius: 5
                }
              ]} 
              numberOfLines={1} 
              ellipsizeMode="tail"
            >
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
          
          {/* Video description with enhanced visibility in fullscreen */}
          <Text 
            style={[
              styles.description,
              isFullScreen && {
                fontSize: SCREEN_WIDTH * 0.04,
                textShadowColor: 'rgba(0,0,0,0.7)',
                textShadowRadius: 5
              }
            ]}
            numberOfLines={isFullScreen ? 3 : 2} 
            ellipsizeMode="tail"
          >
            {item.description}
          </Text>
          <View style={styles.buttonRow}>
            <Pressable style={styles.watchFullButton} onPress={handleWatchFull}>
              <Text style={styles.watchFullButtonText}>Watch Full</Text>
            </Pressable>
            <Pressable style={styles.fullScreenButton} onPress={toggleFullScreen}>
              {isFullScreen ? 
                <Minimize color="white" size={SCREEN_WIDTH * 0.05} /> : 
                <Maximize color="white" size={SCREEN_WIDTH * 0.05} />
              }
            </Pressable>
          </View>
        </View>
        <View style={[
          styles.actionButtons, 
          actionButtonsStyle,
          isFullScreen && {
            bottom: Platform.OS === 'ios' ? 20 : 10,
            gap: SCREEN_HEIGHT * 0.035
          }
        ]}>
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
            
            {/* Auto-scroll button placed in the like container to be static */}
            <Pressable 
              style={[
                styles.autoScrollButton,
                autoScroll && styles.autoScrollButtonActive
              ]} 
              onPress={toggleAutoScroll}
            >
              <PlayCircle 
                color={autoScroll ? '#1877F2' : 'white'} 
                fill={autoScroll ? 'rgba(24, 119, 242, 0.3)' : 'transparent'}
                size={SCREEN_WIDTH * 0.06} 
              />
              <Text style={[
                styles.actionCount, 
                autoScroll ? styles.activeCount : null
              ]}>
                Auto
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
      </SafeAreaView>
      
      {/* Lock overlay when premium alert is shown */}
      {isLocked && isCurrentVideo && (
        <View style={styles.lockOverlay}>
          <Lock color="white" size={SCREEN_WIDTH * 0.1} />
        </View>
      )}
    </View>
  );
});

// Add interface for TopHeader props
interface TopHeaderProps {
  activeTab: number;
  onTabPress: (tab: string, index: number) => void;
  isFullScreen: boolean;
}

// Add a new TopHeader component for navigation
const TopHeader: React.FC<TopHeaderProps> = ({ activeTab, onTabPress, isFullScreen }) => {
  if (isFullScreen) return null;
  
  return (
    <SafeAreaView style={styles.headerContainer}>
      <View style={styles.headerContent}>
        {HEADER_TABS.map((tab, index) => (
          <Pressable
            key={tab}
            style={styles.headerTab}
            onPress={() => onTabPress(tab, index)}
          >
            <Text style={[
              styles.headerTabText,
              activeTab === index && styles.headerTabTextActive
            ]}>
              {tab}
            </Text>
            {activeTab === index && <View style={styles.headerTabIndicator} />}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
};

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
  const [showPremiumAd, setShowPremiumAd] = useState(false);
  const [watchedVideosCount, setWatchedVideosCount] = useState(0);
  const [isTabFocused, setIsTabFocused] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeHeaderTab, setActiveHeaderTab] = useState(0);
  const { user } = useSanityAuth();
  const router = useRouter();
  
  // Animation values
  const premiumModalScale = useRef(new Animated.Value(0.3)).current;
  const premiumModalOpacity = useRef(new Animated.Value(0)).current;
  
  const flatListRef = useRef<FlatList>(null);
  const videoRefs = useRef<VideoRefs>({});
  const initRef = useRef(false);
  const premiumAdRef = useRef(false);
  const viewConfigRef = useRef({ 
    viewAreaCoveragePercentThreshold: 70,
    minimumViewTime: 500
  });
  const onViewableItemsChangedRef = useRef((info: ViewableItemsInfo) => {
    if (info.viewableItems.length > 0) {
      const index = info.viewableItems[0].index ?? 0;
      console.log('Changed to video index:', index);
      setCurrentVideoIndex(index);
    }
  });
  const autoScrollPulse = useRef(new Animated.Value(1)).current;
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set status bar configuration for immersive experience - moved outside of conditional renders
  useEffect(() => {
    // Make status bar transparent for immersive experience
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
    
    return () => {
      // Reset on unmount if needed
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(false);
        StatusBar.setBackgroundColor('#000');
      }
    };
  }, []);
  
  // Handle Video refs
  const handleVideoRef = (id: string, ref: any) => {
    videoRefs.current[id] = ref;
  };
  
  // Track when user watches videos and show premium ad after 2 videos
  useEffect(() => {
    const handleVideoEnded = (event: any) => {
      setWatchedVideosCount(prevCount => {
        const newCount = prevCount + 1;
        console.log('Videos watched:', newCount);
        
        // Show premium ad after user watches 2 videos
        if (newCount % 2 === 0 && !premiumAdRef.current) {
          premiumAdRef.current = true;
          setShowPremiumAd(true);
          
          // Disable auto-scroll while premium ad is showing
          // This is a temporary override that will be restored when the ad is closed
          if (isAutoScrollEnabled) {
            console.log('Temporarily suspending auto-scroll while premium ad is showing');
          }
          
          // Pause all videos
          Object.values(videoRefs.current).forEach(videoRef => {
            if (videoRef && videoRef.current) {
              videoRef.current.pauseAsync().catch(() => {});
            }
          });
          
          // Animate premium modal in
          premiumModalScale.setValue(0.3);
          premiumModalOpacity.setValue(0);
          
          Animated.parallel([
            Animated.spring(premiumModalScale, {
              toValue: 1,
              tension: 50,
              friction: 7,
              useNativeDriver: true
            }),
            Animated.timing(premiumModalOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true
            })
          ]).start();
        }
        
        return newCount;
      });
    };
    
    const subscription = DeviceEventEmitter.addListener('VIDEO_ENDED', handleVideoEnded);
    
    return () => {
      subscription.remove();
    };
  }, [premiumModalScale, premiumModalOpacity, isAutoScrollEnabled]);
  
  // Listen for auto-scroll events - prevent scrolling when premium ad is visible
  useEffect(() => {
    const handleAutoScroll = (event: any) => {
      console.log('Received AUTO_SCROLL_NEXT event', event, 'currentIndex:', currentVideoIndex, 'videos.length:', videos.length);
      
      // Don't process auto-scroll if premium ad is showing
      if (showPremiumAd) {
        console.log('Blocking auto-scroll because premium ad is showing');
        // Ensure current video stays paused
        const currentVideo = videos[currentVideoIndex];
        if (currentVideo && videoRefs.current[currentVideo.id] && videoRefs.current[currentVideo.id].current) {
          videoRefs.current[currentVideo.id].current.pauseAsync().catch(() => {});
        }
        return;
      }
      
      // Calculate next index and ensure it's valid
      const nextIndex = currentVideoIndex + 1;
      
      if (flatListRef.current && videos.length > nextIndex) {
        console.log('Scrolling to next video, index:', nextIndex);
        try {
          // Ensure the scroll is limited to exactly one video
          flatListRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
            viewPosition: 0
          });
        } catch (error) {
          console.error('Error scrolling to next video:', error);
          
          // Fallback approach if the first method fails
          setTimeout(() => {
            if (flatListRef.current && !showPremiumAd) {
              try {
                flatListRef.current.scrollToOffset({
                  offset: nextIndex * AVAILABLE_HEIGHT,
            animated: true
          });
              } catch (e) {
                console.error('Fallback scroll failed too:', e);
              }
            }
          }, 100);
        }
      } else {
        console.log('Cannot auto-scroll: no more videos or flatList ref missing');
      }
    };

    const subscription = DeviceEventEmitter.addListener('AUTO_SCROLL_NEXT', handleAutoScroll);

    return () => {
      subscription.remove();
    };
  }, [currentVideoIndex, videos.length, showPremiumAd]);
  
  // Handle closing premium ad
  const handleClosePremiumAd = () => {
    // Animate modal out
    Animated.parallel([
      Animated.timing(premiumModalScale, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(premiumModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setShowPremiumAd(false);
      premiumAdRef.current = false;
      
      // Calculate next index
      const nextIndex = currentVideoIndex + 1;
      
      // Scroll to next video if available
      if (flatListRef.current && videos.length > nextIndex) {
        try {
          flatListRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
            viewPosition: 0
          });
        } catch (error) {
          console.error('Error scrolling to next video:', error);
          
          // Fallback approach
          setTimeout(() => {
            if (flatListRef.current) {
              try {
                flatListRef.current.scrollToOffset({
                  offset: nextIndex * AVAILABLE_HEIGHT,
                  animated: true
                });
              } catch (e) {
                console.error('Fallback scroll failed:', e);
              }
            }
          }, 100);
        }
      }
    });
  };
  
  // Handle subscribing to premium
  const handleSubscribe = () => {
    // Here you would implement the actual subscription flow
    // For now, just close the ad
    handleClosePremiumAd();
  };
  
  // Toggle auto-scroll
  const toggleAutoScroll = useCallback(() => {
    const newValue = !isAutoScrollEnabled;
    setIsAutoScrollEnabled(newValue);
    
    // Save preference
    AsyncStorage.setItem('autoScrollEnabled', String(newValue))
      .catch(err => console.error('Error saving auto-scroll preference:', err));
  }, [isAutoScrollEnabled]);
  
  // Toggle full screen mode
  const toggleFullScreen = useCallback(() => {
    setIsFullScreen(prev => !prev);
    // Notify parent components about full screen mode change
    DeviceEventEmitter.emit('TOGGLE_FULL_SCREEN', { isFullScreen: !isFullScreen });
  }, [isFullScreen]);
  
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
  
  // Initial load and setting retrieval
  useEffect(() => {
    const loadInitialData = async () => {
    if (!initRef.current) {
        // Load auto-scroll preference
        try {
          const savedAutoScroll = await AsyncStorage.getItem('autoScrollEnabled');
          if (savedAutoScroll === 'true') {
            setIsAutoScrollEnabled(true);
            console.log('Auto-scroll enabled from saved preference');
          }
        } catch (err) {
          console.error('Error loading auto-scroll preference:', err);
        }
        
        // Load videos
      loadVideos(true);
      initRef.current = true;
    }
    };
    
    loadInitialData();
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
  
  // Use useFocusEffect to handle tab focus changes
  useFocusEffect(
    useCallback(() => {
      console.log('Tab focused');
      setIsTabFocused(true);
      
      // Resume current video when tab is focused
      const currentVideo = videos[currentVideoIndex];
      if (currentVideo && videoRefs.current[currentVideo.id] && videoRefs.current[currentVideo.id].current) {
        videoRefs.current[currentVideo.id].current.playAsync().catch(() => {});
        videoRefs.current[currentVideo.id].current.setIsMutedAsync(false).catch(() => {});
      }

      return () => {
        console.log('Tab unfocused');
        setIsTabFocused(false);
        
        // Pause all videos and mute them when tab loses focus
        Object.values(videoRefs.current).forEach(videoRef => {
          if (videoRef && videoRef.current) {
            videoRef.current.pauseAsync().catch(() => {});
            videoRef.current.setIsMutedAsync(true).catch(() => {});
          }
        });
      };
    }, [currentVideoIndex, videos])
  );
  
  // Handle header tab navigation
  const handleTabPress = (tab: string, index: number) => {
    setActiveHeaderTab(index);
    
    // Navigate to the appropriate screen based on the tab
    if (tab === 'Videos') {
      // Already on videos screen
      return;
    }
    
    // Create pathname object for router navigation
    const routeMap: Record<string, string> = {
      'Feed': '/(tabs)/feed',  // Updated to use tab structure for Feed
      'Points': '/(tabs)/points-about',
      'Search': '/search'
    };
    
    const path = routeMap[tab];
    if (path) {
      router.push(path as any);
    }
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
      showPremiumAd={showPremiumAd}
      isTabFocused={isTabFocused}
      isFullScreen={isFullScreen}
      toggleFullScreen={toggleFullScreen}
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
      {/* Header with navigation tabs */}
      <TopHeader 
        activeTab={activeHeaderTab} 
        onTabPress={handleTabPress} 
        isFullScreen={isFullScreen}
      />
      
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
        bounces={false}
        disableIntervalMomentum={true}
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
      
      {/* Premium subscription advertisement */}
      {showPremiumAd && (
        <Modal
          animationType="none"
          transparent={true}
          visible={showPremiumAd}
          onRequestClose={handleClosePremiumAd}
          statusBarTranslucent={true}
        >
          <Pressable 
            style={styles.premiumModalOverlay}
            onPress={handleClosePremiumAd}
          >
            <Animated.View 
              style={[
                styles.premiumModalContent,
                {
                  transform: [{ scale: premiumModalScale }],
                  opacity: premiumModalOpacity
                }
              ]}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <LinearGradient
                  colors={['#1a1a2e', '#16213e', '#0f3460']}
                  style={styles.premiumGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.premiumHeader}>
                    <View style={styles.premiumCrownContainer}>
                      <Crown color="#ffb703" size={SCREEN_WIDTH * 0.06} fill="#ffb703" />
                    </View>
                    <Text style={styles.premiumModalTitle}>Upgrade to Premium</Text>
                  </View>
                  
                  <View style={styles.premiumModalIconContainer}>
                    <View style={styles.premiumIconCircle}>
                      <PlayCircle 
                        color="#1877F2" 
                        size={Math.min(SCREEN_WIDTH * 0.15, SCREEN_HEIGHT * 0.08)} 
                        fill="rgba(24, 119, 242, 0.2)" 
                      />
                    </View>
                  </View>
                  
                  <Text style={styles.premiumModalHeading}>Enjoy an Ad-Free Experience</Text>
                  
                  <ScrollView 
                    style={styles.premiumScrollView}
                    contentContainerStyle={styles.premiumScrollContent}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    bounces={false}
                  >
                    <View style={styles.premiumFeaturesList}>
                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumCheckCircle}>
                          <CheckCircle color="#1877F2" size={SCREEN_WIDTH * 0.04} />
                        </View>
                        <Text style={styles.premiumFeatureText}>Unlimited video streaming</Text>
                      </View>
                      
                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumCheckCircle}>
                          <CheckCircle color="#1877F2" size={SCREEN_WIDTH * 0.04} />
                        </View>
                        <Text style={styles.premiumFeatureText}>No interruptions</Text>
                      </View>
                      
                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumCheckCircle}>
                          <CheckCircle color="#1877F2" size={SCREEN_WIDTH * 0.04} />
                        </View>
                        <Text style={styles.premiumFeatureText}>HD video quality</Text>
                      </View>
                      
                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumCheckCircle}>
                          <CheckCircle color="#1877F2" size={SCREEN_WIDTH * 0.04} />
                        </View>
                        <Text style={styles.premiumFeatureText}>Download videos for offline viewing</Text>
                      </View>
                    </View>
                    
                    <View style={styles.premiumPriceSection}>
                      <Text style={styles.premiumPriceLabel}>Starting at</Text>
                      <View style={styles.premiumPriceRow}>
                        <Text style={styles.premiumPriceAmount}>$4.99</Text>
                        <Text style={styles.premiumPricePeriod}>/month</Text>
                      </View>
                    </View>
                  </ScrollView>
                  
                  <View style={styles.premiumButtonsContainer}>
                    <LinearGradient
                      colors={['#1877F2', '#0056D1']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.premiumSubscribeButton}
                    >
                      <Pressable 
                        style={({ pressed }) => [
                          styles.premiumSubscribeButtonContent,
                          pressed && styles.premiumButtonPressed
                        ]}
                        onPress={handleSubscribe}
                        android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
                      >
                        <Text style={styles.premiumSubscribeButtonText}>Subscribe Now</Text>
                      </Pressable>
                    </LinearGradient>
                    
                    <Pressable 
                      style={({ pressed }) => [
                        styles.premiumContinueButton,
                        pressed && styles.premiumButtonPressed
                      ]}
                      onPress={handleClosePremiumAd}
                      android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <Text style={styles.premiumContinueButtonText}>Continue Watching</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Add header styles
  headerContainer: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? STATUS_BAR_HEIGHT : 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  headerTab: {
    paddingHorizontal: 15,
    alignItems: 'center',
    position: 'relative',
  },
  headerTabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  headerTabIndicator: {
    position: 'absolute',
    bottom: -10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  verticalContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  horizontalContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  video: {
    backgroundColor: '#000',
  },
  horizontalVideoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  verticalVideoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  verticalOverlay: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Safe area bottom padding
  },
  horizontalOverlay: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoInfo: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60,
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
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.035,
    marginBottom: SCREEN_HEIGHT * 0.015,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  watchFullButton: {
    backgroundColor: 'white',
    paddingVertical: SCREEN_HEIGHT * 0.015,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    borderRadius: SCREEN_WIDTH * 0.06,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  fullScreenButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: SCREEN_HEIGHT * 0.015,
    borderRadius: SCREEN_WIDTH * 0.06,
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH * 0.12,
    height: SCREEN_WIDTH * 0.12,
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
  autoScrollButton: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.02,
    gap: 4
  },
  autoScrollButtonActive: {
    backgroundColor: 'transparent',
  },
  autoScrollText: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.03,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  autoScrollTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 2,
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
  premiumModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  premiumModalContent: {
    width: Math.min(SCREEN_WIDTH * 0.9, 400),
    maxHeight: Math.min(SCREEN_HEIGHT * 0.8, 700),
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  premiumGradient: {
    padding: SCREEN_WIDTH * 0.06,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SCREEN_HEIGHT * 0.02,
    width: '100%',
  },
  premiumCrownContainer: {
    backgroundColor: 'rgba(255, 183, 3, 0.2)',
    borderRadius: 15,
    padding: 8,
    marginRight: 10,
  },
  premiumModalTitle: {
    color: 'white',
    fontSize: Math.min(SCREEN_WIDTH * 0.06, 28),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  premiumModalIconContainer: {
    marginBottom: SCREEN_HEIGHT * 0.02,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumIconCircle: {
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderRadius: 50,
    padding: 15,
    borderWidth: 2,
    borderColor: '#1877F2',
  },
  premiumModalHeading: {
    color: 'white',
    fontSize: Math.min(SCREEN_WIDTH * 0.045, 22),
    fontWeight: 'bold',
    marginBottom: SCREEN_HEIGHT * 0.02,
    textAlign: 'center',
  },
  premiumScrollView: {
    width: '100%',
    maxHeight: Math.min(SCREEN_HEIGHT * 0.35, 300),
  },
  premiumScrollContent: {
    paddingBottom: 15,
    paddingHorizontal: 5,
  },
  premiumFeaturesList: {
    width: '100%',
    marginBottom: SCREEN_HEIGHT * 0.02,
    paddingHorizontal: 5,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  premiumCheckCircle: {
    backgroundColor: 'rgba(24, 119, 242, 0.2)',
    borderRadius: 20,
    padding: 5,
    marginRight: 15,
  },
  premiumFeatureText: {
    color: 'white',
    fontSize: Math.min(SCREEN_WIDTH * 0.04, 18),
    fontWeight: '500',
    flexShrink: 1,
  },
  premiumPriceSection: {
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.02,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  premiumPriceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.min(SCREEN_WIDTH * 0.035, 16),
    marginBottom: 5,
  },
  premiumPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  premiumPriceAmount: {
    color: 'white',
    fontSize: Math.min(SCREEN_WIDTH * 0.08, 36),
    fontWeight: 'bold',
  },
  premiumPricePeriod: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.min(SCREEN_WIDTH * 0.035, 16),
    marginBottom: 8,
    marginLeft: 2,
  },
  premiumButtonsContainer: {
    width: '100%',
    marginTop: SCREEN_HEIGHT * 0.01,
  },
  premiumSubscribeButton: {
    borderRadius: 30,
    width: '100%',
    marginBottom: 15,
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  premiumSubscribeButtonContent: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Math.max(SCREEN_HEIGHT * 0.015, 12),
    paddingHorizontal: 25,
  },
  premiumButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  premiumSubscribeButtonText: {
    color: 'white',
    fontSize: Math.min(SCREEN_WIDTH * 0.045, 20),
    fontWeight: 'bold',
  },
  premiumContinueButton: {
    backgroundColor: 'transparent',
    paddingVertical: Math.max(SCREEN_HEIGHT * 0.015, 12),
    paddingHorizontal: 25,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  premiumContinueButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.min(SCREEN_WIDTH * 0.04, 18),
    fontWeight: '500',
  },
  fullscreenOverlay: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Safe area bottom padding
  },
  fullscreenVideoInfo: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60,
    left: SCREEN_WIDTH * 0.05,
    width: SCREEN_WIDTH * 0.65,
  },
  fullscreenAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  fullscreenAuthorText: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  fullscreenDescription: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.035,
    marginBottom: SCREEN_HEIGHT * 0.015,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  fullscreenActionButtons: {
    position: 'absolute',
    right: SCREEN_WIDTH * 0.05,
    bottom: 0,
    alignItems: 'center',
    gap: SCREEN_HEIGHT * 0.025,
  },
});