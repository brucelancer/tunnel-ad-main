import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StatusBar,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import {
  Grid,
  List,
  Film,
  Play,
  Award,
  Heart,
  MessageCircle,
  Bookmark,
  MapPin,
  ChevronLeft,
  Search,
  X,
} from 'lucide-react-native';
import { createClient } from '@sanity/client';
import { useSanityAuth } from '../hooks/useSanityAuth';
import * as sanityAuthService from '../../tunnel-ad-main/services/sanityAuthService';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface PostData {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
    isBlueVerified?: boolean;
  };
  content: string;
  images: string[];
  location?: string;
  timeAgo: string;
  likes: number;
  comments: number;
  points: number;
  hasLiked: boolean;
  hasSaved: boolean;
}

export default function YourContentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'posts' | 'videos'>('posts');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [userVideos, setUserVideos] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [videosLoading, setVideosLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState<PostData[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<any[]>([]);
  
  // Get user data from Sanity auth hook
  const { user } = useSanityAuth();

  // Calculate time ago helper
  const calculateTimeAgo = (dateString: string) => {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (secondsAgo < 60) return 'Just now';
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    const daysAgo = Math.floor(hoursAgo / 24);
    if (daysAgo < 30) return `${daysAgo}d ago`;
    const monthsAgo = Math.floor(daysAgo / 30);
    if (monthsAgo < 12) return `${monthsAgo}mo ago`;
    return `${Math.floor(monthsAgo / 12)}y ago`;
  };

  // Fetch user posts
  const fetchUserPosts = async () => {
    if (!user || !user._id) return;
    
    try {
      setPostsLoading(true);
      
      // Create a Sanity client
      const client = createClient({
        projectId: '21is7976',
        dataset: 'production',
        useCdn: false,
        apiVersion: '2023-03-01'
      });
      
      const userPostsData = await client.fetch(`
        *[_type == "post" && author._ref == $userId] | order(createdAt desc) {
          _id,
          content,
          location,
          createdAt,
          likesCount,
          commentsCount,
          points,
          "hasLiked": count(likes[_ref == $currentUserId]) > 0,
          "hasSaved": count(savedBy[_ref == $currentUserId]) > 0,
          "author": author->{
            _id,
            username,
            firstName,
            lastName,
            "avatar": profile.avatar,
            "isVerified": username == "admin" || username == "moderator",
            "isBlueVerified": defined(isBlueVerified) && isBlueVerified == true
          },
          images
        }
      `, { 
        userId: user._id,
        currentUserId: user._id || ''
      });
      
      // Format posts
      const formattedPosts = userPostsData.map((post: any) => {
        // Handle image URLs
        let imageUrls: string[] = [];
        if (post.images && post.images.length > 0) {
          imageUrls = post.images.map((img: any) => {
            if (typeof img === 'string') {
              return img;
            } else if (img.url) {
              return img.url;
            } else if (img.asset && img.asset._ref) {
              return sanityAuthService.urlFor(img).url();
            }
            return '';
          }).filter((url: string) => url);
        }
        
        return {
          id: post._id,
          content: post.content || '',
          location: post.location || '',
          timeAgo: calculateTimeAgo(post.createdAt),
          likes: post.likesCount || 0,
          comments: post.commentsCount || 0,
          points: post.points || 0,
          hasLiked: post.hasLiked || false,
          hasSaved: post.hasSaved || false,
          user: {
            id: post.author?._id || 'unknown',
            name: post.author?.username || (post.author?.firstName ? `${post.author.firstName} ${post.author.lastName || ''}` : 'Unknown User'),
            username: '@' + (post.author?.username || 'unknown'),
            avatar: post.author?.avatar ? sanityAuthService.urlFor(post.author.avatar).url() : 'https://randomuser.me/api/portraits/men/32.jpg',
            isVerified: post.author?.isVerified || false,
            isBlueVerified: post.author?.isBlueVerified || false
          },
          images: imageUrls,
        };
      });
      
      setUserPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  // Fetch user videos
  const fetchUserVideos = async () => {
    if (!user || !user._id) return;
    
    try {
      setVideosLoading(true);
      
      // Create a Sanity client
      const client = createClient({
        projectId: '21is7976',
        dataset: 'production',
        useCdn: false,
        apiVersion: '2023-03-01'
      });
      
      // Query to get videos by user ID
      const query = `*[_type == "video" && author._ref == $userId] | order(createdAt desc) {
        _id,
        title,
        description,
        url,
        "videoUrl": videoFile.asset->url,
        type,
        contentType,
        aspectRatio,
        points,
        views,
        likes,
        dislikes,
        "author": author->username,
        "authorId": author->_id,
        "authorAvatar": author->profile.avatar,
        "isVerified": author->username == "admin" || author->username == "moderator",
        "isBlueVerified": author->isBlueVerified,
        "thumbnailUrl": thumbnail.asset->url,
        createdAt,
        "hasLiked": count(likedBy[_ref == $currentUserId]) > 0
      }`;
      
      const videos = await client.fetch(query, { 
        userId: user._id,
        currentUserId: user._id || ''
      });
      
      // Process videos data
      const processedVideos = videos.map((video: any) => {
        return {
          id: video._id,
          title: video.title || 'Untitled Video',
          description: video.description || '',
          url: video.videoUrl || video.url || '',
          type: video.type || 'horizontal',
          aspectRatio: video.aspectRatio || (video.type === 'horizontal' ? 16/9 : 9/16),
          points: video.points || 0,
          views: video.views || 0,
          likes: video.likes || 0,
          dislikes: video.dislikes || 0,
          author: video.author || "Unknown",
          authorId: video.authorId || user._id,
          authorAvatar: video.authorAvatar ? sanityAuthService.urlFor(video.authorAvatar).url() : null,
          isVerified: video.isVerified || false,
          isBlueVerified: video.isBlueVerified || false,
          thumbnail: video.thumbnailUrl || '',
          timeAgo: calculateTimeAgo(video.createdAt),
          hasLiked: video.hasLiked || false
        };
      });
      
      setUserVideos(processedVideos);
    } catch (error) {
      console.error('Error fetching user videos:', error);
    } finally {
      setVideosLoading(false);
    }
  };

  // Fetch content when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserPosts();
      fetchUserVideos();
      return () => {
        // Cleanup when screen loses focus
      };
    }, [user])
  );

  // Filter content based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // If search is empty, show all content
      setFilteredPosts(userPosts);
      setFilteredVideos(userVideos);
    } else {
      // Filter posts based on content
      const searchTermLower = searchQuery.toLowerCase();
      
      // Filter posts
      const matchingPosts = userPosts.filter(post => 
        post.content.toLowerCase().includes(searchTermLower) || 
        (post.location && post.location.toLowerCase().includes(searchTermLower))
      );
      setFilteredPosts(matchingPosts);
      
      // Filter videos
      const matchingVideos = userVideos.filter(video => 
        (video.title && video.title.toLowerCase().includes(searchTermLower)) || 
        (video.description && video.description.toLowerCase().includes(searchTermLower))
      );
      setFilteredVideos(matchingVideos);
    }
  }, [searchQuery, userPosts, userVideos]);

  // Handle search clear
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Refresh data
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchUserPosts(), fetchUserVideos()])
      .finally(() => setRefreshing(false));
  }, []);

  // Toggle view type between grid and list
  const toggleViewType = () => {
    setViewType(viewType === 'grid' ? 'list' : 'grid');
  };

  // Render post grid item
  const renderGridItem = ({ item }: { item: PostData }) => {
    return (
      <Pressable 
        style={styles.gridItem}
        onPress={() => router.push({
          pathname: "/feedpost-detail" as any,
          params: { id: item.id }
        })}
      >
        {item.images && item.images.length > 0 ? (
          <Image 
            source={{ uri: item.images[0] }}
            style={styles.gridItemImage}
          />
        ) : (
          <View style={styles.gridItemTextOnly}>
            <Text 
              style={styles.gridItemContent}
              numberOfLines={4}
            >
              {item.content}
            </Text>
          </View>
        )}
        
        {/* Multiple images indicator */}
        {item.images && item.images.length > 1 && (
          <View style={styles.multipleImagesIndicator}>
            <Text style={styles.multipleImagesText}>+{item.images.length - 1}</Text>
          </View>
        )}
      </Pressable>
    );
  };
  
  // Render post list item
  const renderListItem = ({ item }: { item: PostData }) => {
    return (
      <View style={styles.listItem}>
        {/* Content */}
        <Text style={styles.listItemContent}>{item.content}</Text>
        
        {/* Images */}
        {item.images && item.images.length > 0 && (
          <View style={styles.listItemImagesContainer}>
            {item.images.length === 1 ? (
              <Image 
                source={{ uri: item.images[0] }}
                style={styles.listItemSingleImage}
              />
            ) : (
              <FlatList
                data={item.images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => `image-${index}`}
                renderItem={({ item: imageUri }) => (
                  <Image 
                    source={{ uri: imageUri }}
                    style={{ width: SCREEN_WIDTH - 32, height: 200, resizeMode: 'cover' }}
                  />
                )}
              />
            )}
          </View>
        )}
        
        {/* Location */}
        {item.location && (
          <View style={styles.listItemLocation}>
            <MapPin size={12} color="#888" />
            <Text style={styles.listItemLocationText}>{item.location}</Text>
          </View>
        )}
        
        {/* Actions */}
        <View style={styles.listItemActions}>
          <View style={styles.listItemActionGroup}>
            <View style={styles.listItemAction}>
              <Heart 
                size={16} 
                color={item.hasLiked ? '#FF3B30' : '#888'} 
                fill={item.hasLiked ? '#FF3B30' : 'transparent'} 
              />
              <Text style={styles.listItemActionText}>{item.likes}</Text>
            </View>
            
            <View style={styles.listItemAction}>
              <MessageCircle size={16} color="#888" />
              <Text style={styles.listItemActionText}>{item.comments}</Text>
            </View>
            
            <View style={styles.listItemAction}>
              <Award size={16} color="#FFD700" />
              <Text style={styles.listItemActionText}>{item.points}</Text>
            </View>
          </View>
          
          <View style={styles.listItemAction}>
            <Bookmark 
              size={16} 
              color={item.hasSaved ? '#1877F2' : '#888'} 
              fill={item.hasSaved ? '#1877F2' : 'transparent'} 
            />
          </View>
        </View>
      </View>
    );
  };

  // Render video grid item
  const renderVideoGridItem = ({ item }: { item: any }) => {
    return (
      <Pressable 
        style={[styles.gridItem, styles.videoGridItemContainer]}
        onPress={() => router.push({
          pathname: '/video-detail',
          params: { id: item.id }
        } as any)}
      >
        <View style={styles.videoGridItem}>
          {/* Thumbnail section */}
          <View style={styles.videoThumbnailContainer}>
            {item.thumbnail ? (
              <Image 
                source={{ uri: item.thumbnail }} 
                style={styles.videoThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Film size={24} color="#666" />
              </View>
            )}
            
            {/* Play button overlay */}
            <View style={styles.videoPlayOverlay}>
              <View style={styles.videoPlayButton}>
                <Play size={20} color="#FFF" />
              </View>
            </View>
          </View>
          
          {/* Video info section */}
          <View style={styles.videoInfo}>
            <Text 
              style={styles.videoTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.title || 'Untitled Video'}
            </Text>
            <Text style={styles.videoTimeAgo}>{item.timeAgo}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  // Render video list item
  const renderVideoListItem = ({ item }: { item: any }) => {
    return (
      <Pressable 
        style={styles.videoListItem}
        onPress={() => router.push({
          pathname: '/video-detail',
          params: { id: item.id }
        } as any)}
      >
        {/* Thumbnail */}
        <View style={styles.videoListThumbnailContainer}>
          {item.thumbnail ? (
            <Image 
              source={{ uri: item.thumbnail }} 
              style={styles.videoListThumbnail}
            />
          ) : (
            <View style={styles.videoListPlaceholder}>
              <Film size={30} color="#666" />
            </View>
          )}
          
          {/* Play button */}
          <View style={styles.videoListPlayButton}>
            <Play size={20} color="#FFF" />
          </View>
        </View>
        
        {/* Video info */}
        <View style={styles.videoListInfo}>
          <Text style={styles.videoListTitle} numberOfLines={2} ellipsizeMode="tail">
            {item.title || 'Untitled Video'}
          </Text>
          
          <View style={styles.videoListStats}>
            <Text style={styles.videoListTimeAgo}>{item.timeAgo}</Text>
            <View style={styles.videoListStat}>
              <Heart size={12} color="#888" />
              <Text style={styles.videoListStatText}>{item.likes}</Text>
            </View>
            <View style={styles.videoListStat}>
              <Award size={12} color="#FFD700" />
              <Text style={styles.videoListStatText}>{item.points}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Content</Text>
          <View style={styles.headerRight} />
        </View>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
          onPress={() => setActiveTab('videos')}
        >
          <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
            Videos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar and Toggle Button */}
      <View style={styles.searchAndToggleContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#777" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by caption or description..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#666"
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                <X size={16} color="#777" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.viewToggleButton}
          onPress={toggleViewType}
        >
          {viewType === 'grid' ? (
            <List size={20} color="#0070F3" />
          ) : (
            <Grid size={20} color="#0070F3" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Content Display */}
      <View style={styles.contentContainer}>
        {/* Loading indicators */}
        {((activeTab === 'posts' && postsLoading) || 
          (activeTab === 'videos' && videosLoading)) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0070F3" />
            <Text style={styles.loadingText}>Loading your content...</Text>
          </View>
        )}
        
        {/* Display message for empty content */}
        {!postsLoading && activeTab === 'posts' && userPosts.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateTitle}>No Posts Yet</Text>
            <Text style={styles.emptyStateMessage}>
              You haven't created any posts yet. Your posts will appear here.
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/newsfeed-upload' as any)}
            >
              <Text style={styles.createButtonText}>Create Post</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Display no search results message */}
        {!postsLoading && activeTab === 'posts' && userPosts.length > 0 && filteredPosts.length === 0 && searchQuery.trim() !== '' && (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateTitle}>No Results</Text>
            <Text style={styles.emptyStateMessage}>
              No posts match your search. Try different keywords.
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={handleClearSearch}
            >
              <Text style={styles.createButtonText}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {!videosLoading && activeTab === 'videos' && userVideos.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateTitle}>No Videos Yet</Text>
            <Text style={styles.emptyStateMessage}>
              You haven't uploaded any videos yet. Your videos will appear here.
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/video-upload' as any)}
            >
              <Text style={styles.createButtonText}>Upload Video</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Display no search results message for videos */}
        {!videosLoading && activeTab === 'videos' && userVideos.length > 0 && filteredVideos.length === 0 && searchQuery.trim() !== '' && (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateTitle}>No Results</Text>
            <Text style={styles.emptyStateMessage}>
              No videos match your search. Try different keywords.
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={handleClearSearch}
            >
              <Text style={styles.createButtonText}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Posts content */}
        {!postsLoading && activeTab === 'posts' && userPosts.length > 0 && (
          <FlatList
            data={filteredPosts}
            numColumns={viewType === 'grid' ? 3 : 1}
            key={viewType === 'grid' ? 'grid' : 'list'} // Force re-render when changing layout
            renderItem={viewType === 'grid' ? renderGridItem : renderListItem}
            keyExtractor={item => item.id}
            contentContainerStyle={
              viewType === 'grid' ? styles.gridContainer : styles.listContainer
            }
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#0070F3"
                colors={["#0070F3"]}
                progressBackgroundColor="#111"
              />
            }
          />
        )}

        {/* Videos content */}
        {!videosLoading && activeTab === 'videos' && userVideos.length > 0 && (
          <FlatList
            data={filteredVideos}
            numColumns={viewType === 'grid' ? 3 : 1}
            key={`videos-${viewType}`} // Force re-render when changing layout
            renderItem={viewType === 'grid' ? renderVideoGridItem : renderVideoListItem}
            keyExtractor={item => item.id}
            contentContainerStyle={
              viewType === 'grid' ? styles.videoGridContainer : styles.listContainer
            }
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#0070F3"
                colors={["#0070F3"]}
                progressBackgroundColor="#111"
              />
            }
          />
        )}
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
    height: 90,
    paddingTop: StatusBar.currentHeight || 40,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 90,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0070F3',
  },
  tabText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  viewToggleContainer: {
    position: 'absolute',
    top: 90 + 16 + 52, // Updated to account for search bar height
    right: 16,
    zIndex: 10,
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyStateMessage: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#0070F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  gridContainer: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  videoGridContainer: {
    paddingTop: 16,
    paddingBottom: 24,
    columnGap: 4,
  },
  listContainer: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  gridItem: {
    width: (SCREEN_WIDTH - 32) / 3,
    height: (SCREEN_WIDTH - 32) / 3,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridItemTextOnly: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
  },
  gridItemContent: {
    color: 'white',
    fontSize: 11,
    textAlign: 'center',
  },
  multipleImagesIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multipleImagesText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  listItem: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 12,
  },
  listItemContent: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  listItemImagesContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  listItemSingleImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  listItemLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  listItemLocationText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 5,
  },
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  listItemActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  listItemActionText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 5,
  },
  videoGridItem: {
    height: '100%',
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  videoThumbnailContainer: {
    height: '65%',
    width: '100%', 
    backgroundColor: '#222',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,112,243,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    padding: 8,
    height: '35%',
    justifyContent: 'center',
  },
  videoTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.25,
    lineHeight: 28,
  },
  videoTimeAgo: {
    color: '#888',
    fontSize: 11,
  },
  videoListItem: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    marginBottom: 12,
  },
  videoListThumbnailContainer: {
    width: 120,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
    position: 'relative',
  },
  videoListThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoListPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoListPlayButton: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,112,243,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }]
  },
  videoListInfo: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'space-between',
  },
  videoListTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  videoListStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoListTimeAgo: {
    color: '#888',
    fontSize: 12,
    marginRight: 12,
  },
  videoListStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  videoListStatText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#111',
    flex: 1,
  },
  searchAndToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    height: 36,
  },
  clearButton: {
    padding: 4,
  },
  videoGridItemContainer: {
    height: ((SCREEN_WIDTH - 32) / 3) * 1.2, // 20% taller than regular grid items
  },
}); 