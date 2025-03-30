import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Search as SearchIcon, X, Play, Clock, TrendingUp, History, ArrowLeft, User, FileText, Video } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getSanityClient, urlFor } from '@/tunnel-ad-main/services/postService';
import { useSanityAuth } from '../hooks/useSanityAuth';
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

// Recent searches - this would be stored in user preferences in a real app
const RECENT_SEARCHES = [
  'dance tutorials',
  'hip hop music',
  'street performance',
];

// Trending searches - this would be dynamically generated in a real app
const TRENDING_SEARCHES = [
  'contemporary dance',
  'breakdance basics',
  'ballet techniques',
  'jazz dance',
];

type SearchFilter = 'feed' | 'videos' | 'users';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('feed');
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    feed: any[],
    videos: any[],
    users: any[]
  }>({
    feed: [],
    videos: [],
    users: []
  });
  
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const { user: currentUser } = useSanityAuth();

  useEffect(() => {
    // Auto focus the search input when component mounts
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Perform search when query changes
  useEffect(() => {
    if (searchQuery.length > 2) {
      setShowResults(true);
      performSearch(searchQuery);
    } else {
      setShowResults(false);
    }
  }, [searchQuery]);

  // Search function to fetch results from Sanity
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 3) return;
    
    setIsLoading(true);
    
    try {
      const client = getSanityClient();
      if (!client) {
        console.error('Failed to get Sanity client');
        return;
      }
      
      // Search for posts (feed)
      const posts = await client.fetch(`
        *[_type == "post" && (content match $query || location match $query)] | order(createdAt desc)[0...10] {
          _id,
          content,
          location,
          createdAt,
          "author": author->{
            _id,
            username,
            firstName,
            lastName,
            "avatar": profile.avatar,
            "isVerified": username == "admin" || username == "moderator",
            "isBlueVerified": defined(isBlueVerified) && isBlueVerified == true
          },
          "imageUrl": images[0].asset->url
        }
      `, { query: `*${query}*` });
      
      // Search for videos
      const videos = await client.fetch(`
        *[_type == "video" && (title match $query || description match $query)] | order(createdAt desc)[0...10] {
          _id,
          title,
          description,
          duration,
          "views": viewCount,
          "author": author->{
            _id,
            username,
            "avatar": profile.avatar,
            "isVerified": username == "admin" || username == "moderator",
            "isBlueVerified": isBlueVerified
          },
          "thumbnail": thumbnail.asset->url
        }
      `, { query: `*${query}*` });
      
      // Search for users
      const users = await client.fetch(`
        *[_type == "user" && (username match $query || firstName match $query || lastName match $query)] | order(createdAt desc)[0...10] {
          _id,
          username,
          firstName,
          lastName,
          "bio": profile.bio,
          "avatar": profile.avatar,
          "isVerified": username == "admin" || username == "moderator",
          "isBlueVerified": isBlueVerified
        }
      `, { query: `*${query}*` });
      
      // Format results to include time ago and other formatted fields
      const formattedPosts = posts.map((post: any) => ({
        ...post,
        timeAgo: calculateTimeAgo(post.createdAt),
        avatarUrl: post.author?.avatar ? urlFor(post.author.avatar).url() : null,
        imageUrl: post.imageUrl || null,
      }));
      
      const formattedVideos = videos.map((video: any) => ({
        ...video,
        thumbnailUrl: video.thumbnail || null,
        avatarUrl: video.author?.avatar ? urlFor(video.author.avatar).url() : null,
      }));
      
      const formattedUsers = users.map((user: any) => ({
        ...user,
        avatarUrl: user.avatar ? urlFor(user.avatar).url() : null,
        displayName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.username,
      }));
      
      setResults({
        feed: formattedPosts,
        videos: formattedVideos,
        users: formattedUsers
      });
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to calculate time ago
  const calculateTimeAgo = (dateString: string) => {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (secondsAgo < 60) {
      return 'Just now';
    }
    
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) {
      return `${minutesAgo}m ago`;
    }
    
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) {
      return `${hoursAgo}h ago`;
    }
    
    const daysAgo = Math.floor(hoursAgo / 24);
    if (daysAgo < 7) {
      return `${daysAgo}d ago`;
    }
    
    return new Date(dateString).toLocaleDateString();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
  };

  const goBack = () => {
    router.back();
  };

  const renderSearchSuggestion = (suggestion: string, icon: React.ReactNode) => (
    <Pressable
      key={suggestion}
      style={styles.suggestionItem}
      onPress={() => handleSearch(suggestion)}
    >
      {icon}
      <Text style={styles.suggestionText}>{suggestion}</Text>
    </Pressable>
  );

  // Render a feed post result
  const renderFeedItem = ({ item }: { item: any }) => (
    <Pressable
      style={styles.feedItem}
      onPress={() => router.push({
        pathname: "/feedpost-detail" as any,
        params: { id: item._id }
      })}
    >
      <View style={styles.feedItemHeader}>
        <Image 
          source={{ uri: item.avatarUrl || 'https://via.placeholder.com/40' }} 
          style={styles.userAvatar} 
        />
        <View style={styles.userInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.userName}>
              {item.author?.username || 'Unknown User'}
            </Text>
            {(item.author?.isVerified || item.author?.isBlueVerified) && (
              <View style={styles.verifiedBadge}>
                <TunnelVerifiedMark size={12} />
              </View>
            )}
          </View>
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
        </View>
      </View>
      
      <Text style={styles.postContent} numberOfLines={2}>
        {item.content}
      </Text>
      
      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
    </Pressable>
  );

  // Render a video result
  const renderVideoItem = ({ item }: { item: any }) => (
    <Pressable
      style={styles.videoItem}
      onPress={() => router.push({
        pathname: "/video-player" as any,
        params: { id: item._id }
      })}
    >
      <View style={styles.thumbnailContainer}>
        <Image 
          source={{ uri: item.thumbnailUrl || 'https://via.placeholder.com/120x68' }} 
          style={styles.thumbnail}
        />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration || '0:00'}</Text>
        </View>
        <View style={styles.playButton}>
          <Play size={16} color="white" fill="white" />
        </View>
      </View>
      
      <View style={styles.videoContent}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.videoMeta}>
          <Text style={styles.videoAuthor}>
            {item.author?.username || 'Unknown'} 
            {' • '}
            {item.views || 0} views
          </Text>
        </View>
      </View>
    </Pressable>
  );

  // Render a user result
  const renderUserItem = ({ item }: { item: any }) => (
    <Pressable
      style={styles.userItem}
      onPress={() => router.push({
        pathname: "/user-profile" as any,
        params: { id: item._id }
      })}
    >
      <Image 
        source={{ uri: item.avatarUrl || 'https://via.placeholder.com/48' }} 
        style={styles.userProfileAvatar}
      />
      
      <View style={styles.userProfileInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userProfileName}>
            {item.displayName}
          </Text>
          {(item.isVerified || item.isBlueVerified) && (
            <View style={styles.verifiedBadge}>
              <TunnelVerifiedMark size={12} />
            </View>
          )}
        </View>
        
        <Text style={styles.username}>@{item.username}</Text>
        
        {item.bio && (
          <Text style={styles.userBio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>
    </Pressable>
  );

  // Get current results based on selected filter
  const currentResults = results[filter];

  // Render content based on the state
  const renderContent = () => {
    if (!showResults) {
      return (
        <ScrollView style={styles.suggestionsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.suggestionsSection}>
            <View style={styles.sectionHeader}>
              <History size={18} color="#888" />
              <Text style={styles.sectionTitle}>Recent Searches</Text>
            </View>
            {RECENT_SEARCHES.map((search) => 
              renderSearchSuggestion(search, <Clock size={18} color="#888" style={styles.suggestionIcon} />)
            )}
          </View>

          <View style={styles.suggestionsSection}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={18} color="#888" />
              <Text style={styles.sectionTitle}>Trending Searches</Text>
            </View>
            {TRENDING_SEARCHES.map((search) => 
              renderSearchSuggestion(search, <TrendingUp size={18} color="#888" style={styles.suggestionIcon} />)
            )}
          </View>
        </ScrollView>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1877F2" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            <Pressable
              style={[styles.filterButton, filter === 'feed' && styles.activeFilter]}
              onPress={() => setFilter('feed')}
            >
              <FileText size={16} color={filter === 'feed' ? "white" : "#888"} />
              <Text style={[styles.filterText, filter === 'feed' && styles.activeFilterText]}>Feed</Text>
            </Pressable>
            
            <Pressable
              style={[styles.filterButton, filter === 'videos' && styles.activeFilter]}
              onPress={() => setFilter('videos')}
            >
              <Video size={16} color={filter === 'videos' ? "white" : "#888"} />
              <Text style={[styles.filterText, filter === 'videos' && styles.activeFilterText]}>Videos</Text>
            </Pressable>
            
            <Pressable
              style={[styles.filterButton, filter === 'users' && styles.activeFilter]}
              onPress={() => setFilter('users')}
            >
              <User size={16} color={filter === 'users' ? "white" : "#888"} />
              <Text style={[styles.filterText, filter === 'users' && styles.activeFilterText]}>Users</Text>
            </Pressable>
          </ScrollView>
        </View>

        <FlatList
          data={currentResults}
          keyExtractor={(item) => item._id}
          renderItem={
            filter === 'feed' ? renderFeedItem :
            filter === 'videos' ? renderVideoItem :
            renderUserItem
          }
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyResultsContainer}>
              <Text style={styles.emptyResultsText}>No {filter} found matching "{searchQuery}"</Text>
            </View>
          }
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color="white" />
        </Pressable>
        
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search videos, posts, users..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={clearSearch} style={styles.clearButton}>
              <X size={18} color="#888" />
            </Pressable>
          )}
        </View>
      </View>

      {renderContent()}
    </View>
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
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#0A0A0A',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  suggestionsSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  resultsContainer: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  activeFilter: {
    backgroundColor: '#1877F2',
  },
  filterText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
  activeFilterText: {
    color: 'white',
  },
  resultsContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding at bottom for better scrolling
  },
  emptyResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyResultsText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  // Feed item styles
  feedItem: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  feedItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  verifiedBadge: {
    marginLeft: 6,
    backgroundColor: 'transparent',
  },
  timeAgo: {
    color: '#777',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  postContent: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  // Video item styles
  videoItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  thumbnailContainer: {
    width: 120,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  videoTitle: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoAuthor: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  // User item styles
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  userProfileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
  },
  userProfileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userProfileName: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  username: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  userBio: {
    color: '#AAA',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
}); 