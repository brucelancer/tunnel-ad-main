import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  Dimensions,
  Animated,
  DeviceEventEmitter,
} from 'react-native';
import {
  Film,
  FileText,
  HelpCircle,
  Star,
  Trophy,
  Users,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import VideoTunnelling from '../components/video-tunnelling';
import ArticleTunnelling from '../components/article-tunnelling';
import ScreenContainer from '../components/ScreenContainer';

type UploadType = 'video' | 'article';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TunnellingScreen() {
  const [activeType, setActiveType] = useState<UploadType>('video');
  const [showInstructions, setShowInstructions] = useState(false);
  const router = useRouter();
  const previousActiveType = useRef<UploadType>(activeType);
  
  // Animation for the title text
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        })
      ).start();
    };
    
    startAnimation();
    return () => {
      animatedValue.stopAnimation();
    };
  }, []);

  // Handle tab switching and video playback
  useEffect(() => {
    // If switching from video to article, pause videos
    if (previousActiveType.current === 'video' && activeType === 'article') {
      DeviceEventEmitter.emit('VIDEO_TAB_STATE', { isActive: false });
    }
    
    // If switching from article to video, resume videos
    if (previousActiveType.current === 'article' && activeType === 'video') {
      DeviceEventEmitter.emit('VIDEO_TAB_STATE', { isActive: true });
    }
    
    // Update previous type for next comparison
    previousActiveType.current = activeType;
  }, [activeType]);

  const handleSubmit = (data: any) => {
    // Handle the submission from either component
    Alert.alert('Success', 'Content uploaded successfully!');
    // Reset form or navigate as needed
    router.back();
  };

  const renderInstructionItem = (icon: React.ReactNode, title: string, description: string) => (
    <View style={styles.instructionItem}>
      <LinearGradient
        colors={['rgba(0,112,243,0.1)', 'rgba(0,223,216,0.1)']}
        style={styles.instructionIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {icon}
      </LinearGradient>
      <View style={styles.instructionText}>
        <Text style={styles.instructionTitle}>{title}</Text>
        <Text style={styles.instructionDescription}>{description}</Text>
      </View>
    </View>
  );

  const renderUploadType = (type: UploadType, icon: React.ReactNode, label: string) => (
    <Pressable
      style={styles.typeButton}
      onPress={() => setActiveType(type)}
    >
      <LinearGradient
        colors={activeType === type ? ['#0070F3', '#00DFD8'] : ['#2A2A2A', '#1A1A1A']}
        style={[styles.typeGradient, activeType === type && styles.activeTypeGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {icon}
        <Text style={[styles.typeText, activeType === type && styles.activeTypeText]}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );

  // Animated color for the title
  const animatedColor = animatedValue.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#0070F3', '#00A5F3', '#00DFD8', '#00A5F3', '#0070F3']
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Animated.Text style={[styles.headerTitle, { color: animatedColor }]}>
              Tunnelling
            </Animated.Text>
            <Text style={styles.headerSubtitle}>Ready for tunnelling?</Text>
            <Text style={styles.headerSubtitle}>Earn your profits with your content!</Text>
          </View>
          <Pressable
            style={styles.helpButton}
            onPress={() => setShowInstructions(true)}
          >
            <HelpCircle size={24} color="#0070F3" />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.typeContainer}>
          {renderUploadType(
            'video',
            <Film size={24} color={activeType === 'video' ? '#fff' : '#666'} />,
            'Video'
          )}
          {renderUploadType(
            'article',
            <FileText size={24} color={activeType === 'article' ? '#fff' : '#666'} />,
            'Article'
          )}
        </View>

        {activeType === 'video' ? (
          <VideoTunnelling onSubmit={handleSubmit} />
        ) : (
          <ArticleTunnelling onSubmit={handleSubmit} />
        )}
      </ScrollView>

      <Modal
        visible={showInstructions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInstructions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#1A1A1A', '#000000']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Star size={24} color="#0070F3" />
                <Text style={styles.modalTitle}>How to Earn Points</Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowInstructions(false)}
              >
                <X size={24} color="#666" />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {renderInstructionItem(
                <Film size={24} color="#0070F3" />,
                "Upload Videos",
                "Earn 100 points for each video upload. High-quality content can earn bonus points!"
              )}
              {renderInstructionItem(
                <FileText size={24} color="#0070F3" />,
                "Write Articles",
                "Get 50 points per article. Well-researched content receives additional rewards."
              )}
              {renderInstructionItem(
                <Users size={24} color="#0070F3" />,
                "Engage Community",
                "Earn 10 points for each meaningful comment or reaction from other users."
              )}
              {renderInstructionItem(
                <TrendingUp size={24} color="#0070F3" />,
                "Trending Content",
                "Double your points when your content reaches trending status!"
              )}
              {renderInstructionItem(
                <Trophy size={24} color="#0070F3" />,
                "Weekly Rewards",
                "Top contributors receive exclusive badges and bonus point multipliers."
              )}
            </ScrollView>

            <Pressable
              style={styles.startEarningButton}
              onPress={() => setShowInstructions(false)}
            >
              <LinearGradient
                colors={['#0070F3', '#00DFD8']}
                style={styles.startEarningGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.startEarningText}>Start Earning Now</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,112,243,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0,112,243,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  content: {
    flex: 1,
  },
  typeContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 30,
    gap: 16,
  },
  typeButton: {
    flex: 1,
    height: 72,
    borderRadius: 20,
    overflow: 'hidden',
  },
  typeGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
  },
  activeTypeGradient: {
    borderColor: '#0070F3',
    borderWidth: 2,
  },
  typeText: {
    color: '#666',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  activeTypeText: {
    color: '#fff',
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH - 40,
    maxHeight: '80%',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  instructionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    flex: 1,
  },
  instructionTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  instructionDescription: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  startEarningButton: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startEarningGradient: {
    padding: 16,
    alignItems: 'center',
  },
  startEarningText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
}); 