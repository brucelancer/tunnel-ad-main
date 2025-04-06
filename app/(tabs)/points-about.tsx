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
} from 'lucide-react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

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
  const { points, dailyPoints } = usePoints();
  const scrollY = useRef(new Animated.Value(0)).current;
  const cashAvailable = (points / EXCHANGE_RATE).toFixed(2);
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
                      backgroundColor: isToday ? '#00ff00' : '#1877F2',
                    }
                  ]}
                >
                  <Text style={styles.barValue}>{data.points}</Text>
                </Animated.View>
                {isToday && <View style={styles.todayIndicator} />}
              </View>
              <Text style={[
                styles.barLabel,
                isToday && styles.todayLabel
              ]}>
                {formatDate(data.date)}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.chartGrid}>
        {[0, 1, 2, 3].map((line) => (
          <View 
            key={line} 
            style={[
              styles.gridLine,
              { bottom: (line * 150) / 3 }
            ]} 
          />
        ))}
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
          <Text style={styles.pointsCapacityValue}>{points}/1000</Text>
        </View>
        <View style={styles.pointsCapacityBar}>
          <View 
            style={[
              styles.pointsCapacityFill, 
              { width: `${Math.min(100, (points / 1000) * 100)}%` },
              points > 800 && styles.pointsCapacityHighFill
            ]} 
          />
        </View>
        <Text style={styles.pointsCapacityInfo}>
          {points >= 1000 ? 'Max capacity reached! Redeem now' : `${1000 - points} more points until full capacity`}
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
                <Text style={styles.pointsGuideTotalValue}>{points}</Text>
                <View style={styles.pointsGuideValueBar}>
                  <View style={[styles.pointsGuideValueFill, { width: `${Math.min(100, (points / 1000) * 100)}%` }]} />
                </View>
                <Text style={styles.pointsGuideNextMilestone}>
                  {points < 1000 ? `${1000 - points} points until next milestone` : 'Milestone reached!'}
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
            <Text style={styles.balanceValue}>{points}</Text>
            <Image
              source={require('@/assets/images/tunnel-coin-4.png')}
             
            />
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
  tunnelIcon: {
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
}); 