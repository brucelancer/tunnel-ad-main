import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { usePoints } from '@/hooks/usePoints';
import { Gift, ChevronRight } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', title: 'All Rewards' },
  { id: 'gaming', title: 'Gaming' },
  { id: 'shopping', title: 'Shopping' },
  { id: 'food', title: 'Food & Drinks' },
  { id: 'entertainment', title: 'Entertainment' },
];

const REWARDS = [
    {
    id: 'lineman30',
    title: 'LINE MAN',
    description: 'B150 Vouncher Card',
    points: 10,
    image: 'https://cdn.freelogovectors.net/wp-content/uploads/2020/11/line-man-logo.png',
    category: 'food',
  },
  {
    id: 'foodpanda25',
    title: 'foodpanda',
    description: '$25 Gift Card',
    points: 2500,
    image: 'https://www.foodpanda.com/wp-content/uploads/2024/05/foodpanda-logo-RGB-stacked-900x636.png',
    category: 'food',
  },
  {
    id: 'applemusic25',
    title: 'Apple Music',
    description: '$25 Gift Card',
    points: 2500,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Apple_Music_icon.svg/542px-Apple_Music_icon.svg.png?20221219073958',
    category: 'entertainment',
  },
  {
    id: 'googleplay50',
    title: 'Google Play',
    description: '$50 Gift Card',
    points: 5000,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/2560px-Google_Play_Store_badge_EN.svg.png',
    category: 'shopping',
  },
  {
    id: 'steam50',
    title: 'Steam',
    description: '$50 Gift Card',
    points: 5000,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/2048px-Steam_icon_logo.svg.png',
    category: 'gaming',
  },
  {
    id: 'amazon100',
    title: 'Amazon',
    description: '$100 Gift Card',
    points: 10000,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Amazon_icon.svg/2048px-Amazon_icon.svg.png',
    category: 'shopping',
  },
  {
    id: 'netflix30',
    title: 'Netflix',
    description: '$30 Gift Card',
    points: 3000,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Netflix_2015_N_logo.svg/1200px-Netflix_2015_N_logo.svg.png',
    category: 'entertainment',
  },
  {
    id: 'starbucks25',
    title: 'Starbucks',
    description: '$25 Gift Card',
    points: 2500,
    image: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/1200px-Starbucks_Corporation_Logo_2011.svg.png',
    category: 'food',
  },
  {
    id: 'psn50',
    title: 'PlayStation',
    description: '$50 PSN Card',
    points: 5000,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/PlayStation_logo.svg/2560px-PlayStation_logo.svg.png',
    category: 'gaming',
  },
  {
    id: 'grab30',
    title: 'Grab Eats',
    description: '$30 Gift Card',
    points: 3000,
    image: 'https://cdn.freebiesupply.com/logos/large/2x/grab-logo-png-transparent.png',
    category: 'food',
  },
  
];

export default function GiftCardScreen() {
  const { points } = usePoints();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredRewards = REWARDS.filter(
    reward => selectedCategory === 'all' || reward.category === selectedCategory
  );

  const handleRedeem = (reward: typeof REWARDS[0]) => {
    if (points < reward.points) {
      Alert.alert('Error', 'Insufficient points');
      return;
    }

    Alert.alert(
      'Confirm Redemption',
      `Are you sure you want to redeem ${reward.title} ${reward.description}?\nRequired points: ${reward.points}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            // Handle redemption logic here
            Alert.alert('Success', 'Gift card redeemed successfully! Check your email for the code.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      bounces={false}
    >
      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES.map(category => (
          <Pressable
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.selectedCategoryButton,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.selectedCategoryText,
              ]}
            >
              {category.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Rewards Grid */}
      <View style={styles.rewardsContainer}>
        {filteredRewards.map(reward => (
          <Pressable
            key={reward.id}
            style={styles.rewardCard}
            onPress={() => handleRedeem(reward)}
          >
            <View style={styles.rewardImageContainer}>
              <Image source={{ uri: reward.image }} style={styles.rewardImage} />
            </View>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardTitle}>{reward.title}</Text>
              <Text style={styles.rewardDescription}>{reward.description}</Text>
              <View style={styles.rewardPoints}>
                <Gift size={14} color="#1877F2" />
                <Text style={styles.pointsText}>{reward.points} points</Text>
              </View>
              <View style={styles.redeemButton}>
                <Text style={styles.redeemButtonText}>Redeem</Text>
                <ChevronRight size={16} color="white" />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 6,
  },
  categoriesContainer: {
    paddingHorizontal: 2,
    paddingVertical: 15,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    marginRight: 8,
  },
  selectedCategoryButton: {
    backgroundColor: '#1877F2',
    borderColor: '#1877F2',
  },
  categoryText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  selectedCategoryText: {
    color: 'white',
  },
  rewardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingTop: 10,
  },
  rewardCard: {
    width: '49%',
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
    marginBottom: 15,
  },
  rewardImageContainer: {
    width: '100%',
    aspectRatio: 1.2,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  rewardImage: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain',
  },
  rewardInfo: {
    padding: 12,
  },
  rewardTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  rewardDescription: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  rewardPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  pointsText: {
    color: '#1877F2',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#1877F2',
    paddingVertical: 8,
    borderRadius: 8,
  },
  redeemButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
}); 