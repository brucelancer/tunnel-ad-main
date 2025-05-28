import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
  Pressable,
  Image,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Easing,
  DeviceEventEmitter,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { usePoints } from '@/hooks/usePoints';
import { 
  DollarSign,
  TrendingUp,
  Clock,
  Bell,
  Check,
  Award,
  Crown,
  Shield,
  Star,
  Heart,
  ArrowDownUp,
  RefreshCw,
  Play,
  Plus,
  Video,
  DollarSign as Money,
} from 'lucide-react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSanityAuth } from '../hooks/useSanityAuth';
import { createClient } from '@sanity/client';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Exchange rate: 100 points = $1
const EXCHANGE_RATE = 100;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Subscription plans data
const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Basic access with limitations',
    features: [
      'Limited video streaming',
      'Basic content access',
      'Contains ads',
      'Earn points while watching'
    ],
    icon: 'Award',
    colors: ['#1E1E1E', '#333333'] as readonly string[],
    ctaText: 'Current Plan'
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    period: 'month',
    description: 'Enhanced experience with more content',
    features: [
      'Unlimited video streaming',
      'Ad-free experience',
      'Download videos offline',
      'Priority customer support',
      'Earn 2× points while watching'
    ],
    icon: 'Star',
    recommended: true,
    colors: ['#1a4a9e', '#1877F2'] as readonly string[],
    ctaText: 'Upgrade Now'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$79.99',
    period: 'year',
    description: 'Complete experience with all features',
    features: [
      'Everything in Premium',
      'Exclusive content access',
      'Early access to new features',
      'Family sharing (up to 5 users)',
      'Earn 3× points while watching',
      '10% bonus when redeeming points'
    ],
    icon: 'Crown',
    colors: ['#005500', '#00bb00'] as readonly string[],
    ctaText: 'Upgrade to Pro'
  }
];

export default function PointsAboutScreen() {
  const { points: localPoints, dailyPoints } = usePoints();
  const [displayPoints, setDisplayPoints] = useState(localPoints);
  const [pointsLoading, setPointsLoading] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const cashAvailable = (displayPoints / EXCHANGE_RATE).toFixed(2);
  const router = useRouter();
  const unreadNotifications = 3; // This would normally come from a notifications context or API
  
  // Add state for points guide modal
  const [showPointsModal, setShowPointsModal] = useState(false);
  
  // States for points converter
  const [cashAmount, setCashAmount] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  
  // Animation values for modals
  const pointsGuideAnimation = useRef(new Animated.Value(0)).current;
  const pointsGuideBackdropAnimation = useRef(new Animated.Value(0)).current;
  const animatedValue = useRef(new Animated.Value(0)).current;
  const waveAnimatedValue = useRef(new Animated.Value(0)).current;

  // Get user data from Sanity auth hook
  const { user } = useSanityAuth();

  // Calculate max points for chart scaling
  const maxPoints = Math.max(...dailyPoints.map(day => day.points), 100); // minimum 100 for scale

  // Modify header animation to hide content at top position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });
  
  const headerContentOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  // Function to fetch live points data from Sanity with forced refreshing
  const fetchLivePointsData = async (force = false) => {
    if (!user?._id) return;

    setPointsLoading(true);
    
    try {
      console.log("PointsAbout: Fetching live points data from Sanity...");
      
      // Create Sanity client with no caching
      const client = createClient({
        projectId: '21is7976',
        dataset: 'production',
        useCdn: false, // Disable CDN to get real-time data
        apiVersion: '2023-03-01',
      });
      
      // Use a timestamp to prevent any caching
      const timestamp = new Date().getTime();
      
      // Query with a timestamp parameter to force a new request
      const userData = await client.fetch(
        '*[_type == "user" && _id == $userId][0] { _id, points }',
        { userId: user._id, timestamp }
      );
      
      if (userData?.points !== undefined) {
        console.log(`PointsAbout: (LIVE) Fetched points from Sanity: ${userData.points}`);
        
        // Always update the display points, even if they seem the same
        setDisplayPoints(userData.points);
        
        // If the points in user state don't match the fetched points, update the user state
        if (user.points !== userData.points) {
          console.log(`PointsAbout: Points mismatch: local ${user.points}, Sanity ${userData.points}. Updating local state.`);
          
          // Emit event to update user object in auth context
          DeviceEventEmitter.emit('USER_POINTS_UPDATED', {
            points: userData.points
          });
        }
      }
    } catch (error) {
      console.error("PointsAbout: Error fetching live points:", error);
    } finally {
      setPointsLoading(false);
    }
  };

  // Add periodic points refresh and initial fetch
  useEffect(() => {
    // Initial fetch
    fetchLivePointsData(true);
    
    // Set up interval to fetch points regularly
    const pointsRefreshInterval = setInterval(() => {
      console.log("PointsAbout: Running periodic points refresh...");
      fetchLivePointsData();
    }, 30000); // 30 seconds

    return () => {
      clearInterval(pointsRefreshInterval);
    };
  }, [user?._id]);

  // Listen for point update events
  useEffect(() => {
    // Listen for POINTS_EARNED events
    const pointsEarnedSubscription = DeviceEventEmitter.addListener('POINTS_EARNED', (event) => {
      console.log('PointsAbout: received POINTS_EARNED event:', event);
      
      if (event.verifiedFromSanity && event.newTotal !== undefined) {
        // Update with the exact total from Sanity
        console.log(`PointsAbout: Setting points to ${event.newTotal} (verified from Sanity)`);
        setDisplayPoints(event.newTotal);
      } else if (event.amount) {
        // Also fetch from Sanity to ensure accuracy
        fetchLivePointsData();
      }
    });
    
    // Listen for USER_POINTS_UPDATED events
    const userPointsUpdatedSubscription = DeviceEventEmitter.addListener('USER_POINTS_UPDATED', (event) => {
      console.log('PointsAbout: received USER_POINTS_UPDATED event:', event);
      
      if (event.points !== undefined) {
        // Update with the new points total
        setDisplayPoints(event.points);
      }
    });

    return () => {
      pointsEarnedSubscription.remove();
      userPointsUpdatedSubscription.remove();
    };
  }, []);

  // Force refresh points function
  const refreshPoints = () => {
    fetchLivePointsData(true);
  };

  // Update when user data changes
  useEffect(() => {
    if (user?.points !== undefined) {
      setDisplayPoints(user.points);
    }
  }, [user]);

  // Handlers for points converter
  const handleCashAmountChange = (value: string) => {
    setCashAmount(value);
    // Convert USD to points
    if (value) {
      const pointsValue = parseFloat(value) * EXCHANGE_RATE;
      setPointsAmount(pointsValue.toString());
    } else {
      setPointsAmount('');
    }
  };

  const handlePointsAmountChange = (value: string) => {
    setPointsAmount(value);
    // Convert points to USD
    if (value) {
      const usdValue = parseFloat(value) / EXCHANGE_RATE;
      setCashAmount(usdValue.toFixed(2));
    } else {
      setCashAmount('');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return DAYS[date.getDay()];
  };

  // Function to navigate to subscription screen
  const navigateToSubscriptions = () => {
    router.push('/screens/subscriptions' as any);
  };
  
  // Function to show the points guide modal
  const openPointsGuideModal = () => {
    setShowPointsModal(true);
    
    Animated.parallel([
      Animated.timing(pointsGuideBackdropAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(pointsGuideAnimation, {
        toValue: 1,
        damping: 15,
        stiffness: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  // Function to hide the points guide modal
  const hidePointsGuideModal = () => {
    Animated.parallel([
      Animated.timing(pointsGuideBackdropAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pointsGuideAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowPointsModal(false);
    });
  };

  const renderPlanIcon = (iconName: string, colors: string[]) => {
    switch (iconName) {
      case 'Award':
        return (
          <View style={[styles.planIconContainer, {backgroundColor: colors[0]}]}>
            <Award color="white" size={24} />
          </View>
        );
      case 'Star':
        return (
          <View style={[styles.planIconContainer, {backgroundColor: colors[0]}]}>
            <Star color="white" size={24} />
          </View>
        );
      case 'Crown':
        return (
          <View style={[styles.planIconContainer, {backgroundColor: colors[0]}]}>
            <Crown color="white" size={24} />
          </View>
        );
      default:
        return (
          <View style={[styles.planIconContainer, {backgroundColor: colors[0]}]}>
            <Shield color="white" size={24} />
          </View>
        );
    }
  };

  const renderEarningsChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Points Earned This Week</Text>
        <Text style={styles.chartTotal}>
          Total: {dailyPoints.reduce((sum, day) => sum + day.points, 0)}
        </Text>
      </View>
      <View style={styles.chart}>
        {dailyPoints.map((data, index) => {
          const barHeight = (data.points / maxPoints) * 150;
          const isToday = new Date(data.date).toDateString() === new Date().toDateString();
          
          return (
            <View key={data.date} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: isToday ? '#1877F2' : 'rgba(255, 255, 255, 0.3)',
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{formatDate(data.date)}</Text>
              <Text style={styles.barValue}>{data.points}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  // Update useEffect with wave animation
  useEffect(() => {
    try {
      // Create animation sequence for colors with ping-pong effect
      const startAnimation = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
              easing: Easing.linear
            }),
            Animated.timing(animatedValue, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
              easing: Easing.linear
            })
          ])
        ).start();
        
        // Add continuous wave animation
        Animated.loop(
          Animated.timing(waveAnimatedValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.linear
          })
        ).start();
      };
      
      startAnimation();
      return () => {
        // Proper cleanup
        animatedValue.setValue(0);
        waveAnimatedValue.setValue(0);
      };
    } catch (error) {
      console.error('Animation error:', error);
    }
  }, [animatedValue, waveAnimatedValue]);

  const renderPremiumBanner = () => {
    // Opacity values for the main color animation
    const firstLayerOpacity = animatedValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0.5, 0]
    });

    const secondLayerOpacity = animatedValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0]
    });

    const thirdLayerOpacity = animatedValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.5, 1]
    });
    
    // Wave animation transforms
    const waveTransform1 = waveAnimatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"]
    });
    
    const waveTransform2 = waveAnimatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["360deg", "0deg"]
    });

    return (
      <View style={styles.premiumBanner}>
        <View style={styles.gradientContainer}>
          {/* Base layer */}
          <LinearGradient
            colors={['#0D47A1', '#1a4a9e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumGradient}
          />
          
          {/* Wave layers - using animatedLayer style */}
          <Animated.View 
            style={[
              styles.animatedLayer, 
              { 
                opacity: 0.6,
                transform: [{ rotate: waveTransform1 }]
              }
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(24, 119, 242, 0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumGradient}
            />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.animatedLayer, 
              { 
                opacity: 0.4,
                transform: [{ rotate: waveTransform2 }]
              }
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0, 212, 255, 0.2)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumGradient}
            />
          </Animated.View>
          
          {/* Color layers */}
          <Animated.View style={[styles.animatedLayer, { opacity: firstLayerOpacity }]}>
            <LinearGradient
              colors={['#1a4a9e', '#1877F2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumGradient}
            />
          </Animated.View>
          
          <Animated.View style={[styles.animatedLayer, { opacity: secondLayerOpacity }]}>
            <LinearGradient
              colors={['#0D47A1', '#1877F2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumGradient}
            />
          </Animated.View>
          
          <Animated.View style={[styles.animatedLayer, { opacity: thirdLayerOpacity }]}>
            <LinearGradient
              colors={['#1877F2', '#1a4a9e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumGradient}
            />
          </Animated.View>
          
          {/* Shimmering wave effect - using animatedLayer style */}
          <Animated.View 
            style={[
              styles.animatedLayer,
              {
                opacity: waveAnimatedValue.interpolate({
                  inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                  outputRange: [0, 0.5, 0.7, 0.5, 0.3, 0]
                })
              }
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255, 255, 255, 0.2)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumGradient}
            />
          </Animated.View>
        </View>
        
        <View style={styles.premiumContentContainer}>
          <View style={styles.premiumContent}>
            <Star color="#FFD700" size={28} />
            <View style={styles.premiumTextContainer}>
              <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
              <Text style={styles.premiumDescription}>
                Earn points 2× faster and enjoy ad-free videos
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={navigateToSubscriptions}
          >
            <Text style={styles.upgradeButtonText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Replace the existing earningInfo View with a touchable version
  const renderEarningInfo = () => (
    <View style={styles.earningInfoContainer}>
      <TouchableOpacity 
        style={styles.earningInfoSimple}
        activeOpacity={0.7}
        onPress={openPointsGuideModal}
      >
       
        <View style={styles.earningTextContainer}>
          <Text style={styles.earningTitle}>How to Earn Points?</Text>
        </View>
        <View style={styles.earningInfoArrow}>
          <Text style={styles.tapHintText}>→</Text>
        </View>
      </TouchableOpacity>
      
      {/* Points capacity limit bar */}
      <View style={styles.pointsCapacityContainer}>
        <View style={styles.pointsCapacityHeader}>
          <Text style={styles.pointsCapacityLabel}>Points Capacity</Text>
          <Text style={styles.pointsCapacityValue}>{displayPoints}/1000</Text>
        </View>
        <View style={styles.pointsCapacityBar}>
          <View 
            style={[
              styles.pointsCapacityFill, 
              { width: `${Math.min(100, (displayPoints / 1000) * 100)}%` },
              displayPoints > 800 && styles.pointsCapacityHighFill
            ]} 
          />
        </View>
        <Text style={styles.pointsCapacityInfo}>
          {displayPoints >= 1000 ? 'Max capacity reached! Redeem now' : `${1000 - displayPoints} more points until full capacity`}
        </Text>
      </View>
      
      {/* Points and Cash Converter */}
      <View style={styles.converterSection}>
        <Text style={styles.converterTitle}>Points Converter</Text>
        
        {/* Cash Input */}
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={cashAmount}
            onChangeText={handleCashAmountChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#666"
          />
        </View>
        
        {/* Converter Icon */}
        <View style={styles.converterIconContainer}>
          <View style={styles.converterSeparator} />
          <View style={styles.converterIcon}>
            <ArrowDownUp size={18} color="#00ff00" />
          </View>
          <View style={styles.converterSeparator} />
        </View>
        
        {/* Points Input */}
        <View style={styles.converterContainer}>
          <Text style={styles.converterLabel}>Points:</Text>
          <TextInput
            style={styles.converterInput}
            value={pointsAmount}
            onChangeText={handlePointsAmountChange}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#666"
          />
        </View>
      </View>
    </View>
  );
  
  // Render the points guide modal
  const renderPointsGuideModal = () => {
    return (
      <Modal
        visible={showPointsModal}
        transparent={true}
        statusBarTranslucent={true}
        animationType="none"
        onRequestClose={hidePointsGuideModal}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: pointsGuideBackdropAnimation }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={hidePointsGuideModal}
          />
          
          <Animated.View
            style={[
              styles.modalContainer,
              styles.pointsGuideModalContainer,
              {
                transform: [
                  { 
                    scale: pointsGuideAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    })
                  }
                ],
                opacity: pointsGuideAnimation
              }
            ]}
          >
            <LinearGradient
              colors={['#0F2027', '#203A43', '#2C5364']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.pointsGuideGradientHeader}
            >
              <View style={styles.pointsGuideHeaderContent}>
                <View style={styles.pointsGuideIconWrapper}>
                  <TrendingUp color="#fff" size={28} />
                </View>
                <View style={styles.pointsGuideTitleContainer}>
                  <Text style={styles.pointsGuideTitle}>How to Earn Points</Text>
                  <Text style={styles.pointsGuideSubtitle}>Unlock rewards through everyday activities</Text>
                </View>
              </View>
              
              <View style={styles.pointsGuideTotalContainer}>
                <Text style={styles.pointsGuideTotalLabel}>Your Current Points</Text>
                <Text style={styles.pointsGuideTotalValue}>{displayPoints}</Text>
                <View style={styles.pointsGuideValueBar}>
                  <View style={[styles.pointsGuideValueFill, { width: `${Math.min(100, (displayPoints / 1000) * 100)}%` }]} />
                </View>
                <Text style={styles.pointsGuideNextMilestone}>
                  {displayPoints < 1000 ? `${1000 - displayPoints} points until next milestone` : 'Milestone reached!'}
                </Text>
              </View>
            </LinearGradient>
            
            <ScrollView 
              style={styles.pointsGuideContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Introduction */}
              <View style={styles.pointsGuideIntroBox}>
                <Text style={styles.pointsGuideIntroText}>
                  Points can be redeemed for rewards and special content. The more you engage, the faster you earn!
                </Text>
              </View>

              {/* Quick tips section */}
              <View style={styles.pointsGuideTipsContainer}>
                <Text style={styles.pointsGuideSectionHeader}>Quick Tips</Text>
                <View style={styles.pointsGuideTipCards}>
                  <View style={styles.pointsGuideTipCard}>
                    <Award color="#1877F2" size={20} />
                    <Text style={styles.pointsGuideTipText}>Daily login gives you 20 points</Text>
                  </View>
                  <View style={styles.pointsGuideTipCard}>
                    <Star color="#FFD700" size={20} />
                    <Text style={styles.pointsGuideTipText}>Premium users earn 2× points</Text>
                  </View>
                  <View style={styles.pointsGuideTipCard}>
                    <Heart color="#FF3366" size={20} />
                    <Text style={styles.pointsGuideTipText}>Inviting friends is worth 100 points</Text>
                  </View>
                </View>
              </View>
            
              {/* Video watching section */}
              <View style={styles.pointsGuideSection}>
                <View style={styles.pointsGuideSectionHeader}>
                  <View style={[styles.pointsGuideIconBg, { backgroundColor: '#1877F2' }]}>
                    <Award size={20} color="white" />
                  </View>
                  <Text style={styles.pointsGuideSectionTitle}>Watch Videos</Text>
                </View>
                
                <View style={styles.pointsGuideItemCard}>
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Watch to halfway</Text>
                        <Text style={styles.pointsGuideItemPoints}>+10 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Earn points by watching at least 50% of any video.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Complete a video</Text>
                        <Text style={styles.pointsGuideItemPoints}>+5 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Finish the entire video to earn bonus points.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Like a video</Text>
                        <Text style={styles.pointsGuideItemPoints}>+2 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Show appreciation for content you enjoy.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Article reading section */}
              <View style={styles.pointsGuideSection}>
                <View style={styles.pointsGuideSectionHeader}>
                  <View style={[styles.pointsGuideIconBg, { backgroundColor: '#00AA00' }]}>
                    <Clock size={20} color="white" />
                  </View>
                  <Text style={styles.pointsGuideSectionTitle}>Read Articles</Text>
                </View>
                
                <View style={styles.pointsGuideItemCard}>
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Read an article</Text>
                        <Text style={styles.pointsGuideItemPoints}>+5 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Spend at least 1 minute reading an article to earn points.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Comment on an article</Text>
                        <Text style={styles.pointsGuideItemPoints}>+3 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Engage with the community by leaving thoughtful comments.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Daily activities section */}
              <View style={styles.pointsGuideSection}>
                <View style={styles.pointsGuideSectionHeader}>
                  <View style={[styles.pointsGuideIconBg, { backgroundColor: '#FF9500' }]}>
                    <Bell size={20} color="white" />
                  </View>
                  <Text style={styles.pointsGuideSectionTitle}>Daily Activities</Text>
                </View>
                
                <View style={styles.pointsGuideItemCard}>
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Daily login bonus</Text>
                        <Text style={styles.pointsGuideItemPoints}>+20 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Simply open the app once every day to claim your bonus.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>7-day streak</Text>
                        <Text style={styles.pointsGuideItemPoints}>+50 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Log in for 7 consecutive days to earn a special bonus.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Complete daily challenge</Text>
                        <Text style={styles.pointsGuideItemPoints}>+15 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Check notifications for special daily challenges.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* AdMob section */}
              <View style={styles.pointsGuideSection}>
                <View style={styles.pointsGuideSectionHeader}>
                  <View style={[styles.pointsGuideIconBg, { backgroundColor: '#8000AA' }]}>
                    <Video size={20} color="white" />
                  </View>
                  <Text style={styles.pointsGuideSectionTitle}>Watch Advertisements</Text>
                </View>
                
                <View style={styles.pointsGuideItemCard}>
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Watch AdMob video</Text>
                        <Text style={styles.pointsGuideItemPoints}>+20 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Complete a short 30-second video advertisement.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Daily ad limit</Text>
                        <Text style={styles.pointsGuideItemPoints}>+200 points max</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Watch up to 10 ads per day to maximize your earnings.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pointsGuideItem}>
                    <View style={[styles.pointsGuideCheckCircle, styles.pointsGuidePremiumCircle]}>
                      <Star color="#FFD700" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Premium bonus</Text>
                        <Text style={[styles.pointsGuideItemPoints, styles.pointsGuidePremiumPoints]}>+40 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Premium users earn double points for watching ads!
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Social activities section */}
              <View style={styles.pointsGuideSection}>
                <View style={styles.pointsGuideSectionHeader}>
                  <View style={[styles.pointsGuideIconBg, { backgroundColor: '#FF3366' }]}>
                    <Heart size={20} color="white" />
                  </View>
                  <Text style={styles.pointsGuideSectionTitle}>Social Activities</Text>
                </View>
                
                <View style={styles.pointsGuideItemCard}>
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Share content</Text>
                        <Text style={styles.pointsGuideItemPoints}>+5 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Share videos or articles with friends on social media.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pointsGuideItem}>
                    <View style={styles.pointsGuideCheckCircle}>
                      <Check color="#fff" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Invite a friend</Text>
                        <Text style={styles.pointsGuideItemPoints}>+100 points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Earn bonus points when a friend signs up using your referral code.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Premium multipliers */}
              <View style={styles.pointsGuideSection}>
                <View style={styles.pointsGuideSectionHeader}>
                  <View style={[styles.pointsGuideIconBg, { backgroundColor: '#8E44AD' }]}>
                    <Crown size={20} color="white" />
                  </View>
                  <Text style={styles.pointsGuideSectionTitle}>Premium Multipliers</Text>
                </View>
                
                <View style={styles.pointsGuideItemCard}>
                  <View style={styles.pointsGuideItem}>
                    <View style={[styles.pointsGuideCheckCircle, styles.pointsGuidePremiumCircle]}>
                      <Star color="#FFD700" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Premium subscribers</Text>
                        <Text style={[styles.pointsGuideItemPoints, styles.pointsGuidePremiumPoints]}>2× points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Premium users earn double points for all activities!
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pointsGuideItem}>
                    <View style={[styles.pointsGuideCheckCircle, styles.pointsGuidePremiumCircle]}>
                      <Star color="#FFD700" size={16} />
                    </View>
                    <View style={styles.pointsGuideItemContent}>
                      <View style={styles.pointsGuideItemHeader}>
                        <Text style={styles.pointsGuideItemTitle}>Pro subscribers</Text>
                        <Text style={[styles.pointsGuideItemPoints, styles.pointsGuidePremiumPoints]}>3× points</Text>
                      </View>
                      <Text style={styles.pointsGuideItemDescription}>
                        Pro users earn triple points for all activities!
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.pointsGuideCloseButton}
              onPress={hidePointsGuideModal}
            >
              <Text style={styles.pointsGuideCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  };

  // Function to render AdMob section
  const renderAdMobSection = () => {
    // State for cooldown timer and ad limit tracking would be defined at component level
    const [adCooldown, setAdCooldown] = useState(0);
    const [adsWatchedToday, setAdsWatchedToday] = useState(2); // Example initial value
    const [isWatchingAd, setIsWatchingAd] = useState(false);
    const [showSampleAd, setShowSampleAd] = useState(false);
    const [adProgress, setAdProgress] = useState(0);
    const maxAdsPerDay = 10;
    const cooldownSeconds = 20;
    
    // Ref for the cooldown timer
    const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const adProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Start ad watching
    const handleWatchAd = () => {
      if (adCooldown > 0 || adsWatchedToday >= maxAdsPerDay || isWatchingAd) {
        return;
      }
      
      setIsWatchingAd(true);
      setShowSampleAd(true);
      setAdProgress(0);
      
      // Start the ad progress animation
      if (adProgressRef.current) {
        clearInterval(adProgressRef.current);
      }
      
      // Update progress every 100ms for 5 seconds (50 steps for smooth animation)
      adProgressRef.current = setInterval(() => {
        setAdProgress(prev => {
          if (prev >= 100) {
            if (adProgressRef.current) {
              clearInterval(adProgressRef.current);
              adProgressRef.current = null;
            }
            return 100;
          }
          return prev + 2; // Increment by 2% each time for 5 seconds total
        });
      }, 100);
      
      // Simulate ad completion after 5 seconds
      setTimeout(() => {
        // Update ads watched count
        setAdsWatchedToday(prev => Math.min(prev + 1, maxAdsPerDay));
        
        // Add points (this would normally be done via backend)
        DeviceEventEmitter.emit('POINTS_EARNED', {
          amount: 20,
          source: 'ad_watch',
          verifiedFromSanity: false
        });
        
        // Hide the sample ad
        setShowSampleAd(false);
        
        // Start cooldown
        setAdCooldown(cooldownSeconds);
        setIsWatchingAd(false);
        
        // Start cooldown timer
        if (cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
        }
        
        cooldownTimerRef.current = setInterval(() => {
          setAdCooldown(prev => {
            if (prev <= 1) {
              if (cooldownTimerRef.current) {
                clearInterval(cooldownTimerRef.current);
                cooldownTimerRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, 5000);
    };
    
    // Clean up timer on unmount
    useEffect(() => {
      return () => {
        if (cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
        }
        if (adProgressRef.current) {
          clearInterval(adProgressRef.current);
        }
      };
    }, []);

    return (
      <View style={styles.adMobSection}>
        <View style={styles.adMobSectionHeader}>
          <Text style={styles.sectionTitle}>Earn with AdMob</Text>
          <Text style={styles.sectionSubtitle}>Watch ads, earn points, get rewards</Text>
        </View>

        {/* Animated AdMob Card */}
        <View style={styles.adMobCardContainer}>
          <LinearGradient
            colors={['#2E0052', '#5A0087', '#8000AA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.adMobCard}
          >
            {/* Decorative elements */}
            <View style={styles.adMobDecorativeCircle1} />
            <View style={styles.adMobDecorativeCircle2} />
            
            <View style={styles.adMobCardContent}>
              <View style={styles.adMobIconContainer}>
                <Video color="#fff" size={32} />
              </View>
              
              <Text style={styles.adMobCardTitle}>AdMob Rewards</Text>
              <Text style={styles.adMobCardDescription}>
                Watch short video advertisements and earn points instantly
              </Text>
              
              <View style={styles.adMobRewardsRow}>
                <View style={styles.adMobRewardItem}>
                  <View style={styles.adMobRewardIconContainer}>
                    <Clock color="#ffffff" size={18} />
                  </View>
                  <Text style={styles.adMobRewardLabel}>30 sec</Text>
                </View>
                
                <View style={styles.adMobRewardItem}>
                  <View style={styles.adMobRewardIconContainer}>
                    <Plus color="#ffffff" size={18} />
                  </View>
                  <Text style={styles.adMobRewardLabel}>+20 points</Text>
                </View>
                
                <View style={styles.adMobRewardItem}>
                  <View style={styles.adMobRewardIconContainer}>
                    <Money color="#ffffff" size={18} />
                  </View>
                  <Text style={styles.adMobRewardLabel}>+$0.20</Text>
                </View>
              </View>
              
              {/* Ad Limit Progress Bar */}
              <View style={styles.adLimitContainer}>
                <View style={styles.adLimitHeader}>
                  <Text style={styles.adLimitLabel}>Today's Ad Limit</Text>
                  <Text style={styles.adLimitCounter}>{adsWatchedToday}/{maxAdsPerDay}</Text>
                </View>
                <View style={styles.adLimitProgressBar}>
                  <View 
                    style={[
                      styles.adLimitProgressFill, 
                      { width: `${(adsWatchedToday / maxAdsPerDay) * 100}%` },
                      adsWatchedToday === maxAdsPerDay && styles.adLimitProgressFillComplete
                    ]} 
                  />
                </View>
              </View>
              
              {/* Watch Ad Button with different states */}
              {isWatchingAd ? (
                <View style={[styles.adMobWatchButton, styles.adMobWatchButtonLoading]}>
                  <ActivityIndicator color="#5A0087" size="small" style={styles.adMobWatchButtonIcon} />
                  <Text style={styles.adMobWatchButtonText}>Loading Ad...</Text>
                </View>
              ) : adCooldown > 0 ? (
                <View style={[styles.adMobWatchButton, styles.adMobWatchButtonCooldown]}>
                  <Clock color="#fff" size={20} style={styles.adMobWatchButtonIcon} />
                  <Text style={[styles.adMobWatchButtonText, { color: '#fff' }]}>Wait {adCooldown}s</Text>
                </View>
              ) : adsWatchedToday >= maxAdsPerDay ? (
                <View style={[styles.adMobWatchButton, styles.adMobWatchButtonDisabled]}>
                  <Bell color="#999" size={20} style={styles.adMobWatchButtonIcon} />
                  <Text style={[styles.adMobWatchButtonText, { color: '#999' }]}>Daily Limit Reached</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.adMobWatchButton}
                  onPress={handleWatchAd}
                >
                  <Play color="#5A0087" size={20} style={styles.adMobWatchButtonIcon} />
                  <Text style={styles.adMobWatchButtonText}>Watch Ad Now</Text>
                </TouchableOpacity>
              )}
              
              {/* Cooldown info */}
              {adCooldown > 0 && (
                <Text style={styles.adMobInfoText}>
                  Cooldown: Wait {adCooldown}s before watching another ad
                </Text>
              )}
              
              {/* Daily limit reached message */}
              {adsWatchedToday >= maxAdsPerDay && (
                <Text style={styles.adMobInfoText}>
                  You've reached your daily limit. Come back tomorrow!
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Full-screen Video Ad Overlay */}
        {showSampleAd && (
          <View style={styles.videoAdOverlay}>
            <View style={styles.videoAdContainer}>
              {/* Video Ad Header */}
              <View style={styles.videoAdHeader}>
                <View style={styles.videoAdBadge}>
                  <Text style={styles.videoAdBadgeText}>Ad</Text>
                </View>
                <Text style={styles.videoAdTitle}>Google AdMob Video</Text>
                <Text style={styles.videoAdCounter}>{Math.floor(adProgress/20) + 1}/5</Text>
              </View>
              
              {/* Video Ad Content */}
              <View style={styles.videoAdContent}>
                {/* "Video" Preview with play icon overlay */}
                <View style={styles.videoPreviewContainer}>
                  <Image
                    source={require('@/assets/images/tunnel-coin.jpeg')}
                    style={styles.videoPreviewImage}
                    resizeMode="cover"
                  />
                  
                  {/* Video controls overlay */}
                  <View style={styles.videoPlayingIndicator}>
                    {/* Animated play button that pulses */}
                    <Animated.View style={{
                      opacity: Math.sin(adProgress/5) * 0.3 + 0.7,
                      transform: [{ scale: Math.sin(adProgress/10) * 0.2 + 1.1 }]
                    }}>
                      <View style={styles.videoPlayButton}>
                        <Play color="#fff" size={32} />
                      </View>
                    </Animated.View>
                  </View>
                  
                  {/* Product banner at bottom of video */}
                  <Text style={styles.videoAdProductName}>Google Play Premium Bundle</Text>
                </View>
                
                {/* Ad message */}
                <View style={styles.videoAdMessageContainer}>
                  <Text style={styles.videoAdMessage}>
                    Discover amazing premium apps and games with exclusive limited-time offers!
                  </Text>
                  
                  <View style={styles.videoAdRating}>
                    <Star color="#FFD700" size={16} />
                    <Star color="#FFD700" size={16} />
                    <Star color="#FFD700" size={16} />
                    <Star color="#FFD700" size={16} />
                    <Star color="#FFD700" size={16} />
                    <Text style={styles.videoAdRatingText}>5.0 (2.5k+ reviews)</Text>
                  </View>
                  
                  <TouchableOpacity style={styles.videoAdButton} disabled={true}>
                    <Text style={styles.videoAdButtonText}>Install Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Video Ad Progress Bar */}
              <View style={styles.videoAdProgressContainer}>
                <View style={styles.videoAdProgressBar}>
                  <View 
                    style={[
                      styles.videoAdProgressFill,
                      { width: `${adProgress}%` }
                    ]}
                  />
                </View>
                <Text style={styles.videoAdProgressText}>
                  Ad will close in {5 - Math.floor(adProgress/20)} seconds...
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Additional info cards */}
        <View style={styles.adMobInfoCardsContainer}>
          <View style={styles.adMobInfoCard}>
            <View style={[styles.adMobInfoIconBg, { backgroundColor: '#0050B3' }]}>
              <Clock size={20} color="#ffffff" />
            </View>
            <Text style={styles.adMobInfoTitle}>Cooldown Period</Text>
            <Text style={styles.adMobInfoText}>20 second wait between ads</Text>
          </View>
          
          <View style={styles.adMobInfoCard}>
            <View style={[styles.adMobInfoIconBg, { backgroundColor: '#52C41A' }]}>
              <Bell size={20} color="#ffffff" />
            </View>
            <Text style={styles.adMobInfoTitle}>Daily Refresh</Text>
            <Text style={styles.adMobInfoText}>Limit resets at midnight</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Animated Header - completely empty, just blur background */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          scrollY.setValue(offsetY);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{
          ...styles.scrollContent,
          paddingBottom: 120,
        }}
        bounces={false}
      >
        {/* Points Balance */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Available Points</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>{displayPoints}</Text>
            <Image
              source={require('@/assets/images/tunnel-coin.jpeg')}
              style={styles.balanceCoinIcon}
            />
            {/* Refresh button for points */}
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={refreshPoints}
              disabled={pointsLoading}
            >
              {pointsLoading ? (
                <ActivityIndicator size="small" color="#1877F2" />
              ) : (
                <RefreshCw size={20} color="#1877F2" />
              )}
            </TouchableOpacity>
          </View>
          
          <Pressable 
            style={styles.notificationButtonLarge}
            onPress={() => {
              router.push('/screens/notifications' as any);
            }}
          >
            <Bell color="#fff" size={20} style={styles.notificationIcon} />
            <Text style={styles.notificationButtonText}>View Activity</Text>
          </Pressable>
        </View>

        {/* Exchange Rate Info */}
        <View style={styles.infoSection}>
          <View style={styles.exchangeInfo}>
            <View style={styles.exchangeRate}>
              <DollarSign color="#00ff00" size={24} />
              <Text style={styles.exchangeRateText}>
                {EXCHANGE_RATE} Points = $1
              </Text>
            </View>
            <Text style={styles.cashAvailable}>
              Cash value: ${cashAvailable}
            </Text>
            
          </View>
          {renderPremiumBanner()}
       

          {/* Replace with the touchable version */}
          {renderEarningInfo()}
        </View>

        {/* Earnings Chart */}
        {renderEarningsChart()}

        {/* AdMob Section */}
        {renderAdMobSection()}

        {/* Additional Info */}
        <View style={styles.additionalInfo}>
          <Clock size={20} color="#888" />
          <Text style={styles.additionalInfoText}>
            Points are updated in real-time as you engage with content
          </Text>
        </View>
      </ScrollView>
      
      {/* Points Guide Modal */}
      {renderPointsGuideModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    zIndex: 100,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  balanceSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  balanceLabel: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginBottom: 5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceValue: {
    color: '#00ff00',
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    marginRight: 10,
  },
  balanceCoinIcon: {
    width: 40,
    height: 40,
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: '#111',
    marginHorizontal: Math.max(10, SCREEN_WIDTH * 0.05),
    marginVertical: Math.max(15, SCREEN_HEIGHT * 0.02),
    borderRadius: Math.min(15, SCREEN_WIDTH * 0.04),
    padding: Math.max(15, SCREEN_WIDTH * 0.04),
    alignSelf: 'center',
    width: Math.min(SCREEN_WIDTH - 20, 500),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  exchangeInfo: {
    marginBottom: 20,
    alignItems: 'center',
  },
  exchangeRate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  exchangeRateText: {
    color: '#00ff00',
    fontSize: Math.max(16, SCREEN_WIDTH * 0.045),
    fontFamily: 'Inter_600SemiBold',
  },
  cashAvailable: {
    color: 'white',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 20,
    width: '100%',
  },
  earningInfoContainer: {
    width: '100%',
  },
  earningInfoSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: Math.min(12, SCREEN_WIDTH * 0.03),
    padding: Math.max(12, SCREEN_WIDTH * 0.035),
    marginBottom: 16,
  },
  earningInfoArrow: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsCapacityContainer: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: Math.min(12, SCREEN_WIDTH * 0.03),
    padding: Math.max(12, SCREEN_WIDTH * 0.035),
  },
  pointsCapacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pointsCapacityLabel: {
    color: 'white',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_500Medium',
  },
  pointsCapacityValue: {
    color: '#00ff00',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_600SemiBold',
  },
  pointsCapacityBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  pointsCapacityFill: {
    height: '100%',
    backgroundColor: '#00ff00',
    borderRadius: 4,
  },
  pointsCapacityHighFill: {
    backgroundColor: '#FFA500',
  },
  pointsCapacityInfo: {
    color: '#888',
    fontSize: Math.max(12, SCREEN_WIDTH * 0.03),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  earningTextContainer: {
    flex: 1,
  },
  earningTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  tapHintText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  chartContainer: {
    margin: 20,
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 20,
    position: 'relative',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  chartTotal: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    zIndex: 1,
  },
  chartGrid: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    height: 150,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 150,
  },
  bar: {
    width: 30,
    backgroundColor: '#1877F2',
    borderRadius: 15,
    justifyContent: 'flex-start',
    paddingTop: 8,
    minHeight: 30,
  },
  barValue: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  barLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  todayLabel: {
    color: '#00ff00',
    fontFamily: 'Inter_600SemiBold',
  },
  todayIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ff00',
    position: 'absolute',
    bottom: -12,
  },
  additionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 12,
  },
  additionalInfoText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#111',
    position: 'relative',
  },
  notificationButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    width: '80%',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  notificationIcon: {
    marginRight: 8,
  },
  notificationButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  // Subscription section styles
  subscriptionSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  plansContainer: {
    gap: 20,
  },
  planWrapper: {
    position: 'relative',
    marginBottom: 5,
    paddingTop: 12, // Space for the recommended badge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
  },
  selectedPlan: {
    // Selected plan styles
    borderWidth: 2,
    borderColor: '#00ff00',
  },
  recommendedPlan: {
    // Recommended plan styles
    transform: [{ scale: 1.02 }],
  },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#1877F2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
  },
  recommendedText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  planPeriod: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginLeft: 2,
  },
  planDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
    lineHeight: 20,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  featureText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: 'white',
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  currentPlanButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  recommendedButton: {
    backgroundColor: 'white',
  },
  subscribeText: {
    color: '#1877F2',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  currentPlanText: {
    color: 'white',
  },
  subscriptionNote: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  noteText: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  moreFeaturesText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 5,
    marginLeft: 26,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    backgroundColor: '#111',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  modalGradientHeader: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'relative',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  modalPlanName: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  modalPlanPrice: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  modalPlanPeriod: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginLeft: 2,
  },
  modalRecommendedTag: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 30,
  },
  modalContent: {
    padding: 20,
  },
  modalSectionTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 10,
    marginTop: 15,
  },
  modalDescription: {
    color: '#CCC',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 5,
  },
  modalFeaturesList: {
    marginBottom: 20,
  },
  modalFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  modalFeatureText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    flex: 1,
  },
  modalComparisonText: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  modalButtonsContainer: {
    marginTop: 10,
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButton: {
    backgroundColor: '#1877F2',
  },
  modalCurrentButton: {
    backgroundColor: '#00aa00',
  },
  modalPrimaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  modalSecondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalSecondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  pointsGuideModalContainer: {
    padding: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderRadius: Math.min(20, SCREEN_WIDTH * 0.05),
  },
  pointsGuideGradientHeader: {
    padding: SCREEN_WIDTH * 0.05,
    paddingBottom: SCREEN_WIDTH * 0.06,
  },
  pointsGuideHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsGuideIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  pointsGuideTitleContainer: {
    flex: 1,
  },
  pointsGuideTitle: {
    color: 'white',
    fontSize: Math.max(22, SCREEN_WIDTH * 0.055),
    fontFamily: 'Inter_700Bold',
  },
  pointsGuideSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  pointsGuideTotalContainer: {
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 15,
    padding: 15,
  },
  pointsGuideTotalLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Math.max(12, SCREEN_WIDTH * 0.03),
    fontFamily: 'Inter_500Medium',
    marginBottom: 5,
  },
  pointsGuideTotalValue: {
    color: '#00ff00',
    fontSize: Math.max(26, SCREEN_WIDTH * 0.07),
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
  },
  pointsGuideValueBar: {
    height: SCREEN_HEIGHT * 0.01,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  pointsGuideValueFill: {
    height: '100%',
    backgroundColor: '#00ff00',
    borderRadius: 4,
  },
  pointsGuideNextMilestone: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.max(11, SCREEN_WIDTH * 0.028),
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
  },
  pointsGuideContent: {
    padding: Math.max(15, SCREEN_WIDTH * 0.04),
  },
  pointsGuideIntroBox: {
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#1877F2',
  },
  pointsGuideIntroText: {
    color: 'white',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_500Medium',
    lineHeight: Math.max(20, SCREEN_WIDTH * 0.05),
    textAlign: Platform.OS === 'ios' ? 'center' : 'auto',
  },
  pointsGuideTipsContainer: {
    marginBottom: 25,
  },
  pointsGuideSectionHeader: {
    color: 'white',
    fontSize: Math.max(16, SCREEN_WIDTH * 0.045),
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 15,
  },
  pointsGuideTipCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  pointsGuideTipCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: Math.max(10, SCREEN_WIDTH * 0.025),
    alignItems: 'center',
    minHeight: SCREEN_HEIGHT * 0.12,
    justifyContent: 'center',
  },
  pointsGuideTipText: {
    color: 'white',
    fontSize: Math.max(12, SCREEN_WIDTH * 0.03),
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginTop: 10,
  },
  pointsGuideSection: {
    marginBottom: Math.max(20, SCREEN_HEIGHT * 0.03),
  },
  pointsGuideIconBg: {
    width: Math.max(36, SCREEN_WIDTH * 0.09),
    height: Math.max(36, SCREEN_WIDTH * 0.09),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pointsGuideSectionTitle: {
    color: 'white',
    fontSize: Math.max(16, SCREEN_WIDTH * 0.042),
    fontFamily: 'Inter_600SemiBold',
  },
  pointsGuideItemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 2,
    marginBottom: 5,
  },
  pointsGuideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Math.max(12, SCREEN_WIDTH * 0.035),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  pointsGuideCheckCircle: {
    width: Math.max(24, SCREEN_WIDTH * 0.06),
    height: Math.max(24, SCREEN_WIDTH * 0.06),
    borderRadius: Math.max(12, SCREEN_WIDTH * 0.03),
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    marginTop: 2,
  },
  pointsGuidePremiumCircle: {
    backgroundColor: '#8E44AD',
  },
  pointsGuideItemContent: {
    flex: 1,
  },
  pointsGuideItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pointsGuideItemTitle: {
    color: 'white',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.038),
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    paddingRight: 8,
  },
  pointsGuideItemPoints: {
    color: '#00ff00',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.038),
    fontFamily: 'Inter_700Bold',
  },
  pointsGuidePremiumPoints: {
    color: '#FFD700',
  },
  pointsGuideItemDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.max(12, SCREEN_WIDTH * 0.033),
    fontFamily: 'Inter_400Regular',
    lineHeight: Math.max(18, SCREEN_WIDTH * 0.045),
  },
  pointsGuideCloseButton: {
    backgroundColor: '#1877F2',
    padding: Math.max(14, SCREEN_HEIGHT * 0.02),
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 5,
  },
  pointsGuideCloseButtonText: {
    color: 'white',
    fontSize: Math.max(15, SCREEN_WIDTH * 0.04),
    fontFamily: 'Inter_600SemiBold',
  },
  premiumBanner: {
    marginHorizontal: 20,
    marginBottom: 20,

    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  premiumGradient: {
    flex: 1,
    height: '100%',
  },
  animatedLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  premiumContentContainer: {
    padding: 20,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  premiumTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  premiumTitle: {
    color: 'white',
    fontSize: Math.max(18, SCREEN_WIDTH * 0.045),
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  premiumDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_400Regular',
  },
  upgradeButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#1877F2',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  converterSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  converterTitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInputContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  currencySymbol: {
    color: '#888',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 8,
  },
  amountInput: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    padding: 0,
  },
  converterIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  converterSeparator: {
    height: 1,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  converterIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  converterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#222',
  },
  converterLabel: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginRight: 10,
  },
  converterInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    padding: 0,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  // AdMob section styles
  adMobSection: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  adMobSectionHeader: {
    marginBottom: 15,
  },
  adMobCardContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#5A0087',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  adMobCard: {
    padding: 20,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 220,
  },
  adMobDecorativeCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -20,
    right: -30,
  },
  adMobDecorativeCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -15,
    left: -15,
  },
  adMobCardContent: {
    position: 'relative',
    zIndex: 1,
  },
  adMobIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  adMobCardTitle: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  adMobCardDescription: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: '90%',
  },
  adMobRewardsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 25,
    gap: 15,
  },
  adMobRewardItem: {
    alignItems: 'center',
    marginRight: 10,
  },
  adMobRewardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  adMobRewardLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  adMobWatchButton: {
    backgroundColor: 'white',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    marginBottom: 15,
  },
  adMobWatchButtonIcon: {
    marginRight: 8,
  },
  adMobWatchButtonText: {
    color: '#5A0087',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  adMobInfoCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  adMobInfoCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 15,
    flex: 1,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  adMobInfoIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  adMobInfoTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  adMobInfoText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  adLimitContainer: {
    marginBottom: 15,
  },
  adLimitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  adLimitLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  adLimitCounter: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  adLimitProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 5,
    overflow: 'hidden',
  },
  adLimitProgressFill: {
    height: '100%',
    backgroundColor: '#00ff00',
    borderRadius: 4,
  },
  adLimitProgressFillComplete: {
    backgroundColor: '#FFA500',
  },
  adMobWatchButtonLoading: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-start',
  },
  adMobWatchButtonCooldown: {
    backgroundColor: '#8000AA',
    alignSelf: 'flex-start',
  },
  adMobWatchButtonDisabled: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
  },
  adMobWatchButtonTextCooldown: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  adMobWatchButtonTextDisabled: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  adCooldownInfo: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  adDailyLimitInfo: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  // Sample Google Ad styles
  sampleAdContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  sampleAdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sampleAdBadge: {
    backgroundColor: '#FFEB3B',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  sampleAdBadgeText: {
    color: '#333',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  sampleAdHeaderText: {
    flex: 1,
    color: '#333',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  sampleAdCloseButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleAdCloseButtonText: {
    color: '#333',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    lineHeight: 24,
  },
  sampleAdContent: {
    padding: 15,
    alignItems: 'center',
  },
  sampleAdImage: {
    width: 120,
    height: 120,
    marginBottom: 15,
    borderRadius: 8,
  },
  sampleAdTitle: {
    color: '#333',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  sampleAdDescription: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 15,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  sampleAdRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sampleAdRatingText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 8,
  },
  sampleAdButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  sampleAdButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  sampleAdFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  sampleAdCountdown: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 8,
  },
  videoAdOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  videoAdContainer: {
    backgroundColor: '#111',
    borderRadius: 16,
    width: '90%',
    maxWidth: 350,
    overflow: 'hidden',
  },
  videoAdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#000',
  },
  videoAdBadge: {
    backgroundColor: '#FFEB3B',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  videoAdBadgeText: {
    color: '#000',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  videoAdTitle: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 10,
  },
  videoAdCounter: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  videoAdContent: {
    alignItems: 'center',
    padding: 15,
  },
  videoPreviewContainer: {
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
    position: 'relative',
  },
  videoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  videoPlayingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  videoAdProductName: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  videoAdMessageContainer: {
    alignItems: 'center',
    width: '100%',
  },
  videoAdMessage: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 15,
  },
  videoAdRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  videoAdRatingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 5,
  },
  videoAdButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  videoAdButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  videoAdProgressContainer: {
    padding: 10,
    backgroundColor: '#000',
    width: '100%',
  },
  videoAdProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 5,
  },
  videoAdProgressFill: {
    height: '100%',
    backgroundColor: '#FFEB3B',
    borderRadius: 2,
  },
  videoAdProgressText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
}); 