import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
  TextInput,
} from 'react-native';
import { 
  ArrowLeft, 
  BarChart2, 
  Folder, 
  Film, 
  PieChart,
  Eye,
  ThumbsUp,
  MessageCircle,
  ChevronRight,
  Search,
  X,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createClient } from '@sanity/client';
import * as postService from '@/tunnel-ad-main/services/postService';
import { useSanityAuth } from './hooks/useSanityAuth';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Initialize Sanity client for direct queries
const sanityClient = createClient({
  projectId: '21is7976',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-03-01'
});

// Tunnel verification mark component
const TunnelVerifiedMark = ({ size = 10 }) => (
  <Svg width={size * 1.5} height={size * 1.5} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 2L14 5.1L17.5 3.5L17 7.3L21 8L18.9 11L21 14L17 14.7L17.5 18.5L14 16.9L12 20L10 16.9L6.5 18.5L7 14.7L3 14L5.1 11L3 8L7 7.3L6.5 3.5L10 5.1L12 2Z" 
      fill="#1877F2" 
    />
    <Path 
      d="M10 13.17l-2.59-2.58L6 12l4 4 8-8-1.41-1.42L10 13.17z" 
      fill="#FFFFFF" 
      strokeWidth="0"
    />
  </Svg>
);

// Helper function to format numbers for display
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

interface PostData {
  id: string;
  content: string;
  image: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  createdAt: string;
}

interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  createdAt: string;
}

export default function InsightsUserProfile() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { user } = useSanityAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'videos'>('posts');
  const [postsData, setPostsData] = useState<PostData[]>([]);
  const [videosData, setVideosData] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  
  // Add search state variables
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [videoSearchQuery, setVideoSearchQuery] = useState('');

  useEffect(() => {
    fetchUserProfile();
    fetchUserPosts();
    fetchUserVideos();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      if (!userId) return;
      
      console.log("Fetching user profile for:", userId);
      
      const result = await sanityClient.fetch(`
        *[_type == "user" && _id == $userId][0] {
          _id,
          username,
          firstName,
          lastName,
          "avatar": profile.avatar,
          "isVerified": username == "admin" || username == "moderator" || defined(isBlueVerified)
        }
      `, { userId });
      
      if (result) {
        setUserProfile(result);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      if (!userId) return;
      
      setPostsLoading(true);
      console.log("Fetching posts for user:", userId);
      
      const result = await sanityClient.fetch(`
        *[_type == "post" && author._ref == $userId] | order(_createdAt desc) {
          _id,
          content,
          "image": images[0].asset->url,
          likesCount,
          "commentsCount": count(comments),
          shares,
          views,
          _createdAt
        }
      `, { userId });
      
      if (result) {
        const formattedPosts = result.map((post: any) => ({
          id: post._id,
          content: post.content || '',
          image: post.image || '',
          likes: post.likesCount || 0,
          comments: post.commentsCount || 0,
          shares: post.shares || 0,
          views: post.views || 0,
          createdAt: post._createdAt
        }));
        
        setPostsData(formattedPosts);
      }
      
      setPostsLoading(false);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      setPostsData([]);
      setPostsLoading(false);
    }
  };

  const fetchUserVideos = async () => {
    try {
      if (!userId) return;
      
      setVideosLoading(true);
      console.log("Fetching videos for user:", userId);
      
      const result = await sanityClient.fetch(`
        *[_type == "video" && author._ref == $userId] | order(_createdAt desc) {
          _id,
          title,
          "thumbnail": thumbnail.asset->url,
          likesCount,
          "commentsCount": count(comments),
          shares,
          views,
          _createdAt
        }
      `, { userId });
      
      if (result) {
        const formattedVideos = result.map((video: any) => ({
          id: video._id,
          title: video.title || '',
          thumbnail: video.thumbnail || '',
          likes: video.likesCount || 0,
          comments: video.commentsCount || 0,
          shares: video.shares || 0,
          views: video.views || 0,
          createdAt: video._createdAt
        }));
        
        setVideosData(formattedVideos);
      }
      
      setVideosLoading(false);
    } catch (error) {
      console.error("Error fetching user videos:", error);
      setVideosData([]);
      setVideosLoading(false);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleViewPostInsights = (postId: string) => {
    router.push({
      pathname: '/feed-insights' as any,
      params: { postId }
    });
  };

  const handleViewVideoInsights = (videoId: string) => {
    router.push({
      pathname: '/video-insights' as any,
      params: { id: videoId }
    });
  };

  const renderPostItem = ({ item }: { item: PostData }) => (
    <TouchableOpacity
      style={styles.contentCard}
      onPress={() => handleViewPostInsights(item.id)}
    >
      <Image 
        source={{ uri: item.image || 'https://via.placeholder.com/150' }}
        style={styles.contentThumbnail}
      />
      <View style={styles.contentInfo}>
        <Text style={styles.contentTitle} numberOfLines={2}>{item.content || 'Post'}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Eye size={14} color="#888" />
            <Text style={styles.statText}>{formatNumber(item.views)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <ThumbsUp size={14} color="#888" />
            <Text style={styles.statText}>{formatNumber(item.likes)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <MessageCircle size={14} color="#888" />
            <Text style={styles.statText}>{formatNumber(item.comments)}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.viewInsightsButton}>
        <BarChart2 size={18} color="#1877F2" />
      </View>
    </TouchableOpacity>
  );

  const renderVideoItem = ({ item }: { item: VideoData }) => (
    <TouchableOpacity
      style={styles.contentCard}
      onPress={() => handleViewVideoInsights(item.id)}
    >
      <View style={styles.videoThumbnailContainer}>
        <Image 
          source={{ uri: item.thumbnail || 'https://via.placeholder.com/150' }}
          style={styles.contentThumbnail}
        />
        <View style={styles.videoPlayIconContainer}>
          <Film size={20} color="#FFF" />
        </View>
      </View>
      
      <View style={styles.contentInfo}>
        <Text style={styles.contentTitle} numberOfLines={2}>{item.title || 'Video'}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Eye size={14} color="#888" />
            <Text style={styles.statText}>{formatNumber(item.views)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <ThumbsUp size={14} color="#888" />
            <Text style={styles.statText}>{formatNumber(item.likes)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <MessageCircle size={14} color="#888" />
            <Text style={styles.statText}>{formatNumber(item.comments)}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.viewInsightsButton}>
        <BarChart2 size={18} color="#1877F2" />
      </View>
    </TouchableOpacity>
  );

  // Filter posts based on search query
  const filteredPosts = postsData.filter(post => 
    post.content.toLowerCase().includes(postSearchQuery.toLowerCase())
  );

  // Filter videos based on search query
  const filteredVideos = videosData.filter(video => 
    video.title.toLowerCase().includes(videoSearchQuery.toLowerCase())
  );

  // Handle clearing search
  const clearPostSearch = () => setPostSearchQuery('');
  const clearVideoSearch = () => setVideoSearchQuery('');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#1877F2" size="large" />
        <Text style={styles.loadingText}>Loading user insights...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Content Insights</Text>
          {userProfile && (
            <View style={styles.userInfo}>
              {userProfile.avatar && (
                <Image 
                  source={{ uri: postService.urlFor(userProfile.avatar).url() }}
                  style={styles.avatar}
                />
              )}
              <Text style={styles.username}>
                {userProfile.username || 'User'}
              </Text>
              {userProfile.isVerified && <TunnelVerifiedMark size={12} />}
            </View>
          )}
        </View>
        
        <View style={styles.headerRight} />
      </View>
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <Folder 
            size={16} 
            color={activeTab === 'posts' ? "#1877F2" : "#888"} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
            Posts
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
          onPress={() => setActiveTab('videos')}
        >
          <Film 
            size={16} 
            color={activeTab === 'videos' ? "#1877F2" : "#888"} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
            Videos
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'posts' && (
          <>
            {/* Search bar for posts */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Search size={18} color="#888" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search posts..."
                  placeholderTextColor="#888"
                  value={postSearchQuery}
                  onChangeText={setPostSearchQuery}
                />
                {postSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={clearPostSearch} style={styles.clearButton}>
                    <View style={styles.clearButtonInner}>
                      <X size={14} color="#888" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {postsLoading ? (
              <View style={styles.loadingContentContainer}>
                <ActivityIndicator color="#1877F2" size="small" />
                <Text style={styles.loadingContentText}>Loading posts...</Text>
              </View>
            ) : postsData.length > 0 ? (
              <>
                <FlatList
                  data={filteredPosts}
                  renderItem={renderPostItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptySearchContainer}>
                      <Text style={styles.emptySearchText}>No posts found matching "{postSearchQuery}"</Text>
                    </View>
                  }
                />
                {postSearchQuery.length > 0 && filteredPosts.length > 0 && (
                  <View style={styles.searchResultsCount}>
                    <Text style={styles.searchResultsText}>
                      Found {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIconContainer}>
                  <Folder color="#333" size={40} />
                </View>
                <Text style={styles.emptyStateText}>No Posts Yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  This user hasn't shared any posts yet.
                </Text>
              </View>
            )}
          </>
        )}
        
        {activeTab === 'videos' && (
          <>
            {/* Search bar for videos */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Search size={18} color="#888" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search videos..."
                  placeholderTextColor="#888"
                  value={videoSearchQuery}
                  onChangeText={setVideoSearchQuery}
                />
                {videoSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={clearVideoSearch} style={styles.clearButton}>
                    <View style={styles.clearButtonInner}>
                      <X size={14} color="#888" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {videosLoading ? (
              <View style={styles.loadingContentContainer}>
                <ActivityIndicator color="#1877F2" size="small" />
                <Text style={styles.loadingContentText}>Loading videos...</Text>
              </View>
            ) : videosData.length > 0 ? (
              <>
                <FlatList
                  data={filteredVideos}
                  renderItem={renderVideoItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptySearchContainer}>
                      <Text style={styles.emptySearchText}>No videos found matching "{videoSearchQuery}"</Text>
                    </View>
                  }
                />
                {videoSearchQuery.length > 0 && filteredVideos.length > 0 && (
                  <View style={styles.searchResultsCount}>
                    <Text style={styles.searchResultsText}>
                      Found {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIconContainer}>
                  <Film color="#333" size={40} />
                </View>
                <Text style={styles.emptyStateText}>No Videos Yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  This user hasn't uploaded any videos yet.
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerRight: {
    width: 40,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 4,
  },
  username: {
    color: '#CCC',
    fontSize: 14,
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 16,
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1877F2',
  },
  tabIcon: {
    marginRight: 4,
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1877F2',
  },
  content: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContainer: {
    padding: 16,
  },
  contentCard: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  contentThumbnail: {
    width: 80,
    height: 80,
  },
  videoThumbnailContainer: {
    position: 'relative',
  },
  videoPlayIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  contentInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  contentTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  viewInsightsButton: {
    width: 40,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(24,119,242,0.1)',
  },
  loadingContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingContentText: {
    color: '#CCC',
    marginTop: 8,
    fontSize: 14,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginLeft: 5,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    padding: 10,
    height: 40,
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonInner: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 20,
  },
  emptySearchText: {
    color: '#CCC',
    fontSize: 14,
    textAlign: 'center',
  },
  searchResultsCount: {
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderRadius: 8,
    margin: 16,
    marginTop: 0,
  },
  searchResultsText: {
    color: '#1877F2',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
}); 