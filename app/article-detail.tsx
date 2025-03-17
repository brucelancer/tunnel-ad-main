import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  Animated,
  Share,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Share2, Heart } from 'lucide-react-native';
import { usePointsStore } from '@/store/usePointsStore';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Using the same ARTICLES data from ArticleFeed
const ARTICLES = [
  {
    id: '1',
    type: 'article',
    thumbnail: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc',
    title: 'Top 10 Dance Tips',
    author: '@dancepro',
    description: 'Master these essential dance moves to improve your skills',
    points: 5,
    content: `Dancing is an art form that combines rhythm, movement, and expression. Whether you're a beginner or looking to enhance your skills, these tips will help you become a better dancer.

1. Master the Basics
Start with fundamental moves and perfect them before moving to complex routines. Good posture and balance are essential.

2. Feel the Music
Listen to different genres and understand how rhythm works. Try to identify beats and patterns in music.

3. Practice Regularly
Dedicate time each day to practice. Even 15 minutes of focused practice can make a difference.

4. Record Yourself
Use video recordings to analyze your movements and identify areas for improvement.

5. Stay Flexible
Incorporate stretching into your routine to maintain and improve flexibility.

6. Watch Other Dancers
Learn from experienced dancers by observing their techniques and styles.

7. Take Care of Your Body
Proper nutrition and rest are crucial for maintaining energy and preventing injuries.

8. Be Patient
Progress takes time. Focus on consistent improvement rather than immediate results.

9. Find Your Style
While learning established techniques, develop your unique style and expression.

10. Join Dance Communities
Connect with other dancers to share experiences and learn from each other.`,
  },
  {
    id: '2',
    type: 'article',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b',
    title: 'Music Trends 2025',
    author: '@musicinsider',
    description: 'The future of music and dance in the digital age',
    points: 5,
    content: `The music industry is rapidly evolving with technological advancements and changing consumer preferences. Here's what to expect in 2025.

Digital Integration
• AI-composed music becoming mainstream
• Virtual reality concerts gaining popularity
• Blockchain technology in music distribution

Genre Evolution
• Fusion of traditional and digital sounds
• Rise of micro-genres
• Cross-cultural collaborations increasing

Performance Innovation
• Holographic performances
• Interactive live streaming
• Augmented reality music experiences

Creator Economy
• Direct artist-to-fan platforms
• Decentralized music ownership
• New monetization models

Technology Impact
• Advanced music production tools
• Improved streaming quality
• Enhanced live performance technology`,
  },
  {
    id: '3',
    type: 'article',
    thumbnail: 'https://res.cloudinary.com/rainforest-cruises/images/c_fill,g_auto/f_auto,q_auto/w_1120,h_650/v1623088422/Shwedagon-Pagoda-Guide-Sunset/Shwedagon-Pagoda-Guide-Sunset.jpg',
    title: 'ရန်ကုန်မြို့တော်၏ ရွှေတိဂုံစေတီတော်',
    author: '@myanmarculture',
    description: 'Exploring the magnificence of Shwedagon Pagoda - ရွှေတိဂုံစေတီတော်၏ အလှအပများ',
    points: 10,
    content: `ရွှေတိဂုံစေတီတော်သည် မြန်မာနိုင်ငံ၏ အထင်ကရ ဗုဒ္ဓဘာသာ ဘုရားစေတီတစ်ဆူဖြစ်ပါသည်။

Historical Significance | သမိုင်းဝင် အရေးပါမှု
• Built over 2,600 years ago
• တည်ထားသည်မှာ နှစ်ပေါင်း ၂၆၀၀ ကျော်ရှိပြီဖြစ်သည်
• Houses sacred Buddha relics
• မြတ်စွာဘုရား၏ ဓာတ်တော်များ ကိန်းဝပ်စံပယ်တော်မူသည်

Architecture | ဗိသုကာလက်ရာ
• Height: 99 meters (325 feet)
• အမြင့် ၉၉ မီတာ (၃၂၅ ပေ)
• Covered with genuine gold plates
• စစ်မှန်သော ရွှေချပ်များဖြင့် မွမ်းမံထားသည်
• Adorned with thousands of diamonds
• စိန်ရတနာ ထောင်ချီ၍ စီချယ်ထားသည်

Visitor Information | လည်ပတ်လိုသူများအတွက် အချက်အလက်များ
• Open daily: 4:00 AM - 10:00 PM
• နေ့စဉ် နံနက် ၄ နာရီမှ ည ၁၀ နာရီအထိ ဖွင့်သည်
• Dress code: Conservative attire required
• သင့်တော်သော ဝတ်စားဆင်ယင်မှု လိုအပ်သည်
• Entrance fee varies for locals and foreigners
• ပြည်တွင်း/ပြည်ပ ဝင်ကြေး ကွာခြားသည်`,
  }
];

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { addPoints } = usePointsStore();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [hasEarnedPoints, setHasEarnedPoints] = React.useState(false);
  const [liked, setLiked] = React.useState(false);

  const article = ARTICLES.find(a => a.id === id);

  if (!article) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Article not found</Text>
      </View>
    );
  }

  useEffect(() => {
    if (!hasEarnedPoints) {
      addPoints(article.points);
      setHasEarnedPoints(true);
    }
  }, [article.points, addPoints, hasEarnedPoints]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this article: ${article.title}`,
        title: article.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {article.title}
          </Text>
        </View>
      </Animated.View>

      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft color="white" size={24} />
      </Pressable>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Animated.Image
            source={{ uri: article.thumbnail }}
            style={[
              styles.heroImage,
              {
                transform: [{ scale: imageScale }],
              },
            ]}
          />
          <View style={styles.heroOverlay}>
            <View style={styles.heroContent}>
              <Text style={styles.title}>{article.title}</Text>
              <Text style={styles.author}>{article.author}</Text>
              {hasEarnedPoints && (
                <View style={styles.pointsEarned}>
                  <Text style={styles.pointsText}>+{article.points} points earned</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.articleText}>{article.content}</Text>
        </View>
      </Animated.ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable style={styles.actionButton} onPress={handleLike}>
          <Heart
            size={24}
            color={liked ? '#ff3b30' : 'white'}
            fill={liked ? '#ff3b30' : 'transparent'}
          />
        </Pressable>
        <Pressable style={styles.actionButton} onPress={handleShare}>
          <Share2 size={24} color="white" />
        </Pressable>
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
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 60,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    height: SCREEN_HEIGHT * 0.6,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  heroContent: {
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.08,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
  },
  author: {
    color: '#ccc',
    fontSize: SCREEN_WIDTH * 0.04,
    fontFamily: 'Inter_500Medium',
    marginBottom: 15,
  },
  pointsEarned: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
  },
  pointsText: {
    color: '#00ff00',
    fontSize: SCREEN_WIDTH * 0.035,
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    padding: 20,
  },
  articleText: {
    color: '#fff',
    fontSize: SCREEN_WIDTH * 0.04,
    fontFamily: 'Inter_400Regular',
    lineHeight: SCREEN_WIDTH * 0.06,
  },
  actionButtons: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
}); 