import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Image, Dimensions } from 'react-native';
import { usePointsStore } from '@/store/usePointsStore';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

export default function ArticleFeed() {
  const { addPoints } = usePointsStore();
  const router = useRouter();

  const handleArticlePress = (article: typeof ARTICLES[0]) => {
    router.push({
      pathname: '/article-detail',
      params: { id: article.id }
    });
  };

  const renderArticle = ({ item }: { item: typeof ARTICLES[0] }) => (
    <Pressable
      style={styles.articleItem}
      onPress={() => handleArticlePress(item)}>
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <View style={styles.articleInfo}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.author}>{item.author}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.points}>+{item.points} points</Text>
      </View>
    </Pressable>
  );

  return (
    <FlatList
      data={ARTICLES}
      renderItem={renderArticle}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 20,
  },
  articleItem: {
    marginBottom: 20,
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  articleInfo: {
    padding: 15,
  },
  title: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.045,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  author: {
    color: '#888',
    fontSize: SCREEN_WIDTH * 0.035,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  description: {
    color: '#ccc',
    fontSize: SCREEN_WIDTH * 0.035,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  points: {
    color: '#00ff00',
    fontSize: SCREEN_WIDTH * 0.035,
    fontFamily: 'Inter_600SemiBold',
  },
});