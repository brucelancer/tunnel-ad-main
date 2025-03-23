import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { 
  ArrowLeft,
  Check,
  Award,
  Crown,
  Shield,
  Star,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    description: 'Enhanced experience with all features',
    features: [
      'Unlimited video streaming',
      'Ad-free experience',
      'Download videos offline',
      'Priority customer support',
      'Earn 3× points while watching',
      'Family sharing (up to 5 users)',
      'Exclusive content access',
      'Early access to new features',
      '10% bonus when redeeming points'
    ],
    icon: 'Crown',
    recommended: true,
    colors: ['#1a4a9e', '#1877F2'] as readonly string[],
    ctaText: 'Upgrade Now'
  }
];

export default function SubscriptionsScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('free');
  
  // Add state for popup modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [activePlan, setActivePlan] = useState<typeof SUBSCRIPTION_PLANS[0] | null>(null);
  
  // Animation values for modals
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const modalBackdropAnimation = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    // Close modal if open
    if (showPlanModal) {
      hideModal();
    }
    // Here you would implement the actual subscription logic
    console.log(`Subscribing to ${planId} plan`);
  };
  
  // Function to show the modal for a specific plan
  const showPlanDetails = (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    setActivePlan(plan);
    setShowPlanModal(true);
    
    // Animate the modal entrance with timing based on screen size
    Animated.parallel([
      Animated.timing(modalBackdropAnimation, {
        toValue: 1,
        duration: Math.min(300, SCREEN_WIDTH * 0.6),
        useNativeDriver: true,
      }),
      Animated.spring(modalAnimation, {
        toValue: 1,
        damping: 15,
        stiffness: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  // Function to hide the modal
  const hideModal = () => {
    Animated.parallel([
      Animated.timing(modalBackdropAnimation, {
        toValue: 0,
        duration: Math.min(200, SCREEN_WIDTH * 0.4),
        useNativeDriver: true,
      }),
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: Math.min(200, SCREEN_WIDTH * 0.4),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowPlanModal(false);
      setActivePlan(null);
    });
  };

  const renderPlanIcon = (iconName: string, colors: string[]) => {
    switch (iconName) {
      case 'Award':
        return (
          <View style={[styles.planIconContainer, {backgroundColor: colors[0]}]}>
            <Award color="white" size={Math.max(24, SCREEN_WIDTH * 0.06)} />
          </View>
        );
      case 'Star':
        return (
          <View style={[styles.planIconContainer, {backgroundColor: colors[0]}]}>
            <Star color="white" size={Math.max(24, SCREEN_WIDTH * 0.06)} />
          </View>
        );
      case 'Crown':
        return (
          <View style={[styles.planIconContainer, {backgroundColor: colors[0]}]}>
            <Crown color="white" size={Math.max(24, SCREEN_WIDTH * 0.06)} />
          </View>
        );
      default:
        return (
          <View style={[styles.planIconContainer, {backgroundColor: colors[0]}]}>
            <Shield color="white" size={Math.max(24, SCREEN_WIDTH * 0.06)} />
          </View>
        );
    }
  };

  const renderSubscriptionPlans = () => (
    <View style={styles.subscriptionSection}>
      <Text style={styles.sectionTitle}>Choose Your Plan</Text>
      <Text style={styles.sectionSubtitle}>
        Upgrade your experience and earn more points
      </Text>

      <View style={styles.plansContainer}>
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const isRecommended = plan.recommended;

          return (
            <TouchableOpacity 
              key={plan.id} 
              style={styles.planWrapper}
              activeOpacity={0.9}
              onPress={() => showPlanDetails(plan)}
            >
              <LinearGradient
                colors={plan.colors as any}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={[
                  styles.planCard,
                  isSelected && styles.selectedPlan,
                  isRecommended && styles.recommendedPlan
                ]}
              >
                <View style={styles.planHeader}>
                  {renderPlanIcon(plan.icon, plan.colors as string[])}
                  <View style={styles.planTitleContainer}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={styles.pricingContainer}>
                      <Text style={styles.planPrice}>{plan.price}</Text>
                      <Text style={styles.planPeriod}>/{plan.period}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.planDescription}>{plan.description}</Text>

                <View style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Check color={isRecommended ? '#fff' : '#1877F2'} size={16} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => handleSubscribe(plan.id)}
                  style={[
                    styles.subscribeButton,
                    isSelected ? styles.currentPlanButton : null,
                    isRecommended && styles.recommendedButton,
                    isRecommended && { paddingVertical: Math.max(14, SCREEN_HEIGHT * 0.02) }
                  ]}
                >
                  <Text 
                    style={[
                      styles.subscribeText,
                      isSelected && styles.currentPlanText
                    ]}
                  >
                    {isSelected ? 'Current Plan' : plan.ctaText}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.subscriptionNote}>
        <Text style={styles.noteText}>
          All plans automatically renew until canceled. Cancel anytime in settings.
          Subscription will be charged to your payment method through your App Store account.
        </Text>
      </View>
    </View>
  );
  
  // Render the subscription detail modal
  const renderSubscriptionModal = () => {
    if (!activePlan) return null;
    
    const isSelected = selectedPlan === activePlan.id;
    const isRecommended = activePlan.recommended;
    
    return (
      <Modal
        visible={showPlanModal}
        transparent={true}
        statusBarTranslucent={true}
        animationType="none"
        onRequestClose={hideModal}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: modalBackdropAnimation }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={hideModal}
          />
          
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  { 
                    scale: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    })
                  }
                ],
                opacity: modalAnimation
              }
            ]}
          >
            <LinearGradient
              colors={activePlan.colors as any}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.modalGradientHeader}
            >
              <View style={styles.modalHeaderContent}>
                {renderPlanIcon(activePlan.icon, activePlan.colors as string[])}
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalPlanName}>{activePlan.name}</Text>
                  <View style={styles.pricingContainer}>
                    <Text style={styles.modalPlanPrice}>{activePlan.price}</Text>
                    <Text style={styles.modalPlanPeriod}>/{activePlan.period}</Text>
                  </View>
                </View>
              </View>
              
              {isRecommended && (
                <View style={styles.modalRecommendedTag}>
                  <Text style={styles.recommendedText}>RECOMMENDED</Text>
                </View>
              )}
            </LinearGradient>
            
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={Platform.OS === 'android'}
              contentContainerStyle={{
                paddingBottom: Math.max(10, SCREEN_HEIGHT * 0.01)
              }}
              bounces={false}
            >
              <Text style={styles.modalSectionTitle}>Description</Text>
              <Text style={styles.modalDescription}>{activePlan.description}</Text>
              
              <Text style={styles.modalSectionTitle}>Features</Text>
              <View style={styles.modalFeaturesList}>
                {activePlan.features.map((feature, index) => (
                  <View key={index} style={styles.modalFeatureItem}>
                    <Check color="#1877F2" size={Math.max(18, SCREEN_WIDTH * 0.045)} />
                    <Text style={styles.modalFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              
              <Text style={styles.modalComparisonText}>
                {activePlan.id === 'free' 
                  ? 'Upgrade to Premium to unlock all features and earn points faster!' 
                  : 'Premium gives you the complete experience with all features and maximum rewards.'}
              </Text>
            </ScrollView>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  isSelected ? styles.modalCurrentButton : styles.modalPrimaryButton
                ]}
                onPress={() => {
                  handleSubscribe(activePlan.id);
                }}
              >
                <Text style={[
                  styles.modalPrimaryButtonText,
                  isSelected && styles.modalCurrentPlanText
                ]}>
                  {isSelected ? 'Current Plan' : activePlan.ctaText}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={hideModal}
              >
                <Text style={styles.modalSecondaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <View style={{width: 24}} />
        </View>
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
        {/* Premium Benefits Banner */}
        <View style={styles.benefitsBanner}>
          <LinearGradient
            colors={['#1877F2', '#1a4a9e']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.benefitsGradient}
          >
            <View style={styles.benefitsContent}>
              <Crown color="#FFD700" size={32} />
              <Text style={styles.benefitsTitle}>Premium Benefits</Text>
              <Text style={styles.benefitsDescription}>
                Enjoy an ad-free experience, unlimited video streaming, exclusive content,
                and earn points 3× faster with our premium plan.
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Subscription Plans */}
        {renderSubscriptionPlans()}

        {/* Additional Info */}
        <View style={styles.additionalInfo}>
          <Text style={styles.additionalInfoTitle}>Why Upgrade?</Text>
          <Text style={styles.additionalInfoText}>
            Premium subscribers enjoy an enhanced experience with more content, 
            no ads, offline downloads, family sharing, and earn points at 3× the normal rate.
            Upgrade today to maximize your experience and rewards.
          </Text>
        </View>
      </ScrollView>
      
      {/* Subscription Detail Modal */}
      {renderSubscriptionModal()}
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
    fontSize: Math.max(18, SCREEN_WIDTH * 0.045),
    fontFamily: 'Inter_600SemiBold',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 40,
  },
  benefitsBanner: {
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
  benefitsGradient: {
    padding: 20,
  },
  benefitsContent: {
    alignItems: 'center',
  },
  benefitsTitle: {
    color: 'white',
    fontSize: Math.max(22, SCREEN_WIDTH * 0.055),
    fontFamily: 'Inter_700Bold',
    marginTop: 15,
    marginBottom: 10,
  },
  benefitsDescription: {
    color: 'white',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: Math.max(20, SCREEN_WIDTH * 0.05),
  },
  // Subscription section styles
  subscriptionSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: Math.max(24, SCREEN_WIDTH * 0.06),
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: Math.max(16, SCREEN_WIDTH * 0.04),
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  plansContainer: {
    gap: 20,
  },
  planWrapper: {
    position: 'relative',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  planCard: {
    borderRadius: Math.min(16, SCREEN_WIDTH * 0.04),
    padding: Math.max(20, SCREEN_WIDTH * 0.05),
    overflow: 'hidden',
  },
  selectedPlan: {
    // Selected plan styles - remove border
  },
  recommendedPlan: {
    // Recommended plan styles
    transform: [{ scale: 1.03 }],
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
    borderWidth: Platform.OS === 'ios' ? 1.5 : 0,
    borderColor: 'rgba(24, 119, 242, 0.5)',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#1877F2',
    paddingVertical: Math.max(6, SCREEN_HEIGHT * 0.008),
    paddingHorizontal: Math.max(12, SCREEN_WIDTH * 0.03),
    borderTopLeftRadius: Math.min(12, SCREEN_WIDTH * 0.03),
    borderTopRightRadius: Math.min(12, SCREEN_WIDTH * 0.03),
    alignItems: 'center',
  },
  recommendedText: {
    color: 'white',
    fontSize: Math.max(12, SCREEN_WIDTH * 0.03),
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Math.max(16, SCREEN_HEIGHT * 0.02),
  },
  planIconContainer: {
    width: Math.max(44, SCREEN_WIDTH * 0.11),
    height: Math.max(44, SCREEN_WIDTH * 0.11),
    borderRadius: Math.max(22, SCREEN_WIDTH * 0.055),
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Math.max(12, SCREEN_WIDTH * 0.03),
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    color: 'white',
    fontSize: Math.max(20, SCREEN_WIDTH * 0.05),
    fontFamily: 'Inter_700Bold',
    marginBottom: Math.max(4, SCREEN_HEIGHT * 0.005),
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    color: 'white',
    fontSize: Math.max(18, SCREEN_WIDTH * 0.045),
    fontFamily: 'Inter_600SemiBold',
  },
  planPeriod: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_400Regular',
    marginLeft: Math.max(2, SCREEN_WIDTH * 0.005),
  },
  planDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_400Regular',
    marginBottom: Math.max(16, SCREEN_HEIGHT * 0.02),
    lineHeight: Math.max(20, SCREEN_WIDTH * 0.05),
  },
  featuresList: {
    marginBottom: Math.max(20, SCREEN_HEIGHT * 0.025),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Math.max(8, SCREEN_HEIGHT * 0.012),
    gap: Math.max(10, SCREEN_WIDTH * 0.025),
  },
  featureText: {
    color: 'white',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_400Regular',
    lineHeight: Math.max(20, SCREEN_WIDTH * 0.05),
    flex: 1,
    flexWrap: 'wrap',
  },
  subscribeButton: {
    backgroundColor: 'white',
    borderRadius: Math.max(30, SCREEN_WIDTH * 0.07),
    paddingVertical: Math.max(12, SCREEN_HEIGHT * 0.018),
    paddingHorizontal: Math.max(15, SCREEN_WIDTH * 0.04),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    marginTop: Math.max(10, SCREEN_HEIGHT * 0.012),
  },
  currentPlanButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recommendedButton: {
    backgroundColor: 'white',
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  subscribeText: {
    color: '#1877F2',
    fontSize: Math.max(16, SCREEN_WIDTH * 0.04),
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    width: '100%',
  },
  currentPlanText: {
    color: '#00ff00', // Change to green color
    fontWeight: '700',
  },
  subscriptionNote: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  noteText: {
    color: '#666',
    fontSize: Math.max(12, SCREEN_WIDTH * 0.03),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: Math.max(18, SCREEN_WIDTH * 0.045),
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
    maxWidth: Math.min(450, SCREEN_WIDTH * 0.95),
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderRadius: Math.min(20, SCREEN_WIDTH * 0.05),
    backgroundColor: '#111',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  modalGradientHeader: {
    paddingTop: Math.max(15, SCREEN_WIDTH * 0.05),
    paddingBottom: Math.max(15, SCREEN_WIDTH * 0.05),
    paddingHorizontal: Math.max(15, SCREEN_WIDTH * 0.05),
    position: 'relative',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flex: 1,
    marginLeft: Math.max(12, SCREEN_WIDTH * 0.03),
  },
  modalPlanName: {
    color: 'white',
    fontSize: Math.max(24, SCREEN_WIDTH * 0.06),
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  modalPlanPrice: {
    color: 'white',
    fontSize: Math.max(20, SCREEN_WIDTH * 0.05),
    fontFamily: 'Inter_600SemiBold',
  },
  modalPlanPeriod: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.max(16, SCREEN_WIDTH * 0.04),
    fontFamily: 'Inter_400Regular',
    marginLeft: 2,
  },
  modalRecommendedTag: {
    position: 'absolute',
    top: Math.max(12, SCREEN_HEIGHT * 0.015),
    right: Math.max(12, SCREEN_WIDTH * 0.03),
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: Math.max(4, SCREEN_HEIGHT * 0.006),
    paddingHorizontal: Math.max(8, SCREEN_WIDTH * 0.02),
    borderRadius: Math.max(20, SCREEN_WIDTH * 0.05),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalContent: {
    padding: Math.max(15, SCREEN_WIDTH * 0.05),
    maxHeight: SCREEN_HEIGHT <= 667 ? SCREEN_HEIGHT * 0.45 : (SCREEN_HEIGHT <= 812 ? SCREEN_HEIGHT * 0.55 : SCREEN_HEIGHT * 0.6),
  },
  modalSectionTitle: {
    color: 'white',
    fontSize: Math.max(18, SCREEN_WIDTH * 0.045),
    fontFamily: 'Inter_600SemiBold',
    marginBottom: Math.max(8, SCREEN_HEIGHT * 0.01),
    marginTop: Math.max(12, SCREEN_HEIGHT * 0.015),
  },
  modalDescription: {
    color: '#CCC',
    fontSize: Math.max(16, SCREEN_WIDTH * 0.04),
    fontFamily: 'Inter_400Regular',
    lineHeight: Math.max(22, SCREEN_WIDTH * 0.055),
    marginBottom: Math.max(5, SCREEN_HEIGHT * 0.007),
  },
  modalFeaturesList: {
    marginBottom: Math.max(15, SCREEN_HEIGHT * 0.02),
  },
  modalFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Math.max(8, SCREEN_HEIGHT * 0.012),
    paddingRight: Math.max(5, SCREEN_WIDTH * 0.01),
    gap: Math.max(8, SCREEN_WIDTH * 0.02),
  },
  modalFeatureText: {
    color: 'white',
    fontSize: Math.max(15, SCREEN_WIDTH * 0.038),
    fontFamily: 'Inter_400Regular',
    lineHeight: Math.max(20, SCREEN_WIDTH * 0.05),
    flex: 1,
    flexWrap: 'wrap',
  },
  modalComparisonText: {
    color: '#999',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginVertical: Math.max(15, SCREEN_HEIGHT * 0.02),
    paddingHorizontal: Math.max(8, SCREEN_WIDTH * 0.02),
    lineHeight: Math.max(20, SCREEN_WIDTH * 0.05),
  },
  modalButtonsContainer: {
    marginTop: Math.max(10, SCREEN_HEIGHT * 0.015),
    gap: Math.max(10, SCREEN_HEIGHT * 0.012),
    paddingBottom: Math.max(5, SCREEN_HEIGHT * 0.01),
    paddingHorizontal: Math.max(15, SCREEN_WIDTH * 0.05),
    width: '100%',
  },
  modalButton: {
    paddingVertical: Math.max(14, SCREEN_HEIGHT * 0.02),
    borderRadius: Math.max(30, SCREEN_WIDTH * 0.07),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButton: {
    backgroundColor: '#1877F2',
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    width: '100%',
  },
  modalCurrentButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00aa00',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalPrimaryButtonText: {
    color: 'white',
    fontSize: Math.max(16, SCREEN_WIDTH * 0.04),
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    width: '100%',
  },
  modalSecondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Math.max(30, SCREEN_WIDTH * 0.07),
    paddingVertical: Math.max(12, SCREEN_HEIGHT * 0.016),
    paddingHorizontal: Math.max(15, SCREEN_WIDTH * 0.04),
  },
  modalSecondaryButtonText: {
    color: 'white',
    fontSize: Math.max(16, SCREEN_WIDTH * 0.04),
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  modalCurrentPlanText: {
    color: '#00ff00',
    fontWeight: '700',
  },
  additionalInfo: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: '#111',
    borderRadius: 16,
    marginBottom: 30,
  },
  additionalInfoTitle: {
    color: 'white',
    fontSize: Math.max(18, SCREEN_WIDTH * 0.045),
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  additionalInfoText: {
    color: '#999',
    fontSize: Math.max(14, SCREEN_WIDTH * 0.035),
    fontFamily: 'Inter_400Regular',
    lineHeight: Math.max(20, SCREEN_WIDTH * 0.05),
  },
}); 