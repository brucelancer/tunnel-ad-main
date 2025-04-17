import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Heart, 
  User, 
  Search,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { useSanityAuth } from '../app/hooks/useSanityAuth';
import * as videoService from '@/tunnel-ad-main/services/videoService';
import { createClient } from '@sanity/client';
import Svg, { Path } from 'react-native-svg';

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

interface VideoLiker {
  id: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  likeCount: number;
  isVideoAuthor: boolean;
}

export default function InsightsLikersDetail() {
  const params = useLocalSearchParams();
  const videoId = params.videoId as string;
  const videoTitle = params.videoTitle as string;
  const router = useRouter();
  const { user } = useSanityAuth();
  const [loading, setLoading] = useState(true);
  const [likers, setLikers] = useState<VideoLiker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLikers, setFilteredLikers] = useState<VideoLiker[]>([]);

  useEffect(() => {
    fetchLikers();
  }, [videoId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLikers(likers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = likers.filter(liker => 
        liker.username.toLowerCase().includes(query)
      );
      setFilteredLikers(filtered);
    }
  }, [searchQuery, likers]);

  const fetchLikers = async () => {
    try {
      setLoading(true);
      
      // Fetch likers for the video
      const videoData = await sanityClient.fetch(`
        *[_type == "video" && _id == $videoId][0] {
          "authorId": author._ref,
          "likedBy": likedBy[]-> {
            _id,
            username,
            firstName,
            lastName,
            "avatar": profile.avatar,
            "isVerified": username == "admin" || username == "moderator" || defined(isBlueVerified),
            "likeCount": count(*[_type == "video" && references(^._id) && count(likedBy[_ref == ^._id]) > 0])
          }
        }
      `, { videoId });
      
      if (videoData?.likedBy && videoData.likedBy.length > 0) {
        const videoAuthorId = videoData.authorId;
        
        const processedLikers = videoData.likedBy.map((liker: any) => ({
          id: liker._id,
          username: liker.username || 
                  (liker.firstName ? 
                    `${liker.firstName} ${liker.lastName || ''}` : 
                    'Unknown User'),
          avatar: liker.avatar ? 
                videoService.urlFor(liker.avatar).url() : 
                null,
          isVerified: liker.isVerified || false,
          likeCount: liker.likeCount || 1,
          isVideoAuthor: liker._id === videoAuthorId
        }));
        
        // Sort by like count (highest first)
        processedLikers.sort((a: any, b: any) => b.likeCount - a.likeCount);
        
        setLikers(processedLikers);
        setFilteredLikers(processedLikers);
      }
    } catch (error) {
      console.error('Error fetching likers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render the likers list
  const renderLikersList = () => {
    return (
      <FlatList
        data={filteredLikers}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isCurrentUser = user && item.id === user._id;
          return (
            <TouchableOpacity 
              style={[styles.likerItem, isCurrentUser && styles.currentUserItem]}
              onPress={() => router.push({
                pathname: "/user-profile",
                params: { id: item.id }
              } as any)}
            >
              <View style={styles.likerRank}>
                <Text style={styles.likerRankText}>{index + 1}</Text>
              </View>
              
              <Image 
                source={{ 
                  uri: item.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' 
                }} 
                style={styles.likerAvatar} 
              />
              
              <View style={styles.likerInfo}>
                <View style={styles.usernameContainer}>
                  <Text style={styles.likerUsername}>
                    {item.username}
                  </Text>
                  {item.isVerified && <TunnelVerifiedMark size={12} />}
                  {isCurrentUser && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  )}
                  <View style={styles.profileLinkIndicator}>
                    <Text style={styles.profileLinkText}>View Profile</Text>
                  </View>
                </View>
                
                <View style={styles.likesRow}>
                  <Heart color="#FF4D67" size={12} fill="#FF4D67" />
                  <Text style={styles.likerLikesCount}>{item.likeCount} {item.likeCount === 1 ? 'like' : 'likes'}</Text>
                </View>
              </View>
              
              <View style={styles.userDetailButton}>
                <ChevronRight color="#888" size={18} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.likersHeader}>
              <Text style={styles.likersTitle}>Video Likers</Text>
              <Text style={styles.likersSubtitle}>
                {likers.length} {likers.length === 1 ? 'user' : 'users'} liked this video
              </Text>
            </View>
            
            <View style={styles.searchContainer}>
              <View style={styles.searchIconContainer}>
                <Search color="#888" size={18} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <X color="#888" size={16} />
                </TouchableOpacity>
              )}
            </View>
            
            {searchQuery.length > 0 && filteredLikers.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No users found matching "{searchQuery}"</Text>
              </View>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.likersListContent}
        ListEmptyComponent={
          searchQuery.length > 0 ? null : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No likers found</Text>
            </View>
          )
        }
      />
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877F2" />
        <Text style={styles.loadingText}>Loading likers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color="#FFF" size={24} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Video Likers</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{videoTitle}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>
      
      {/* Empty state if no likers */}
      {likers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Heart color="#333" size={40} />
          <Text style={styles.emptyText}>No Likes Yet</Text>
          <Text style={styles.emptySubtext}>
            When users like your video, they'll appear here.
          </Text>
        </View>
      ) : (
        renderLikersList()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '70%',
  },
  likersHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  likersTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  likersSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  likersListContent: {
    paddingBottom: 20,
  },
  likerItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  likerRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  likerRankText: {
    color: '#1877F2',
    fontSize: 14,
    fontWeight: '600',
  },
  likerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  likerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  likerUsername: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likerLikesCount: {
    color: '#999',
    fontSize: 14,
    marginLeft: 4,
  },
  userDetailButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 12,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIconContainer: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#fff',
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  noResultsText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  noDataContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noDataText: {
    color: '#999',
    fontSize: 16,
  },
  profileLinkIndicator: {
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  profileLinkText: {
    color: '#1877F2',
    fontSize: 10,
    fontWeight: '500',
  },
  currentUserItem: {
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
  },
  youBadge: {
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  youBadgeText: {
    color: '#1877F2',
    fontSize: 10,
    fontWeight: '500',
  },
});