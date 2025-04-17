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
import * as postService from '@/tunnel-ad-main/services/postService';
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

interface PostLiker {
  id: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  isPostAuthor: boolean;
}

export default function FeedInsightsLikersDetail() {
  const params = useLocalSearchParams();
  const postId = params.postId as string;
  const postContent = params.postContent as string;
  const router = useRouter();
  const { user } = useSanityAuth();
  const [loading, setLoading] = useState(true);
  const [likers, setLikers] = useState<PostLiker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLikers, setFilteredLikers] = useState<PostLiker[]>([]);

  useEffect(() => {
    fetchLikers();
  }, [postId]);

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
      console.log('Fetching likers for post ID:', postId);
      
      // Fetch likers for the post with a flexible query to handle both like structures
      const postData = await sanityClient.fetch(`
        *[_type == "post" && _id == $postId][0] {
          "authorId": author->_id,
          // Try both potential like reference fields
          "likedBy": coalesce(
            likes[]->{ 
              _id,
              username,
              firstName,
              lastName, 
              "avatar": profile.avatar,
              "isVerified": username == "admin" || username == "moderator" || defined(isBlueVerified)
            },
            likedBy[]->{ 
              _id,
              username,
              firstName,
              lastName, 
              "avatar": profile.avatar,
              "isVerified": username == "admin" || username == "moderator" || defined(isBlueVerified)
            },
            []
          )
        }
      `, { postId });
      
      console.log('Post data retrieved:', postData ? 'yes' : 'no');
      console.log('Likers found:', postData?.likedBy?.length || 0);
      
      // If likedBy is empty and likes array exists, try the fallback approach
      if ((!postData?.likedBy || postData.likedBy.length === 0)) {
        console.log('No likedBy users found, trying fallback approach');
        
        // Fallback: Fetch the post to get like references
        const postWithLikes = await sanityClient.fetch(`
          *[_type == "post" && _id == $postId][0] {
            likes,
            "authorId": author->_id
          }
        `, { postId });
        
        if (postWithLikes?.likes && Array.isArray(postWithLikes.likes)) {
          console.log('Found likes array, extracting references');
          
          // Extract user references from likes array
          const likeReferences = postWithLikes.likes
            .filter((like: any) => typeof like === 'object' && like._ref)
            .map((like: any) => like._ref);
          
          console.log('Like references found:', likeReferences.length);
          
          if (likeReferences.length > 0) {
            // Fetch user details for these references
            const likedUsers = await sanityClient.fetch(`
              *[_type == "user" && _id in $refs] {
                _id,
                username,
                firstName,
                lastName, 
                "avatar": profile.avatar,
                "isVerified": username == "admin" || username == "moderator" || defined(isBlueVerified)
              }
            `, { refs: likeReferences });
            
            console.log('Fallback fetched users:', likedUsers?.length || 0);
            
            if (likedUsers && likedUsers.length > 0) {
              const postAuthorId = postWithLikes.authorId;
              
              const processedLikers = likedUsers.map((liker: any) => ({
                id: liker._id,
                username: liker.username || 
                        (liker.firstName ? 
                          `${liker.firstName} ${liker.lastName || ''}` : 
                          'Unknown User'),
                avatar: liker.avatar ? 
                      postService.urlFor(liker.avatar).url() : 
                      null,
                isVerified: liker.isVerified || false,
                isPostAuthor: liker._id === postAuthorId
              }));
              
              // Sort alphabetically by username instead of by like count
              processedLikers.sort((a: any, b: any) => a.username.localeCompare(b.username));
              
              setLikers(processedLikers);
              setFilteredLikers(processedLikers);
              setLoading(false);
              return;
            }
          }
        }
      }
      
      if (postData?.likedBy && postData.likedBy.length > 0) {
        const postAuthorId = postData.authorId;
        
        const processedLikers = postData.likedBy.map((liker: any) => ({
          id: liker._id,
          username: liker.username || 
                  (liker.firstName ? 
                    `${liker.firstName} ${liker.lastName || ''}` : 
                    'Unknown User'),
          avatar: liker.avatar ? 
                postService.urlFor(liker.avatar).url() : 
                null,
          isVerified: liker.isVerified || false,
          isPostAuthor: liker._id === postAuthorId
        }));
        
        // Sort alphabetically by username
        processedLikers.sort((a: any, b: any) => a.username.localeCompare(b.username));
        
        setLikers(processedLikers);
        setFilteredLikers(processedLikers);
      } else {
        // No likers found
        console.log('No likers found for this post');
        setLikers([]);
        setFilteredLikers([]);
      }
    } catch (error) {
      console.error('Error fetching likers:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle back button press
  const handleBackPress = () => {
    router.back();
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
                  <Text style={styles.likerLikesCount}>Liked this post</Text>
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
              <Text style={styles.likersTitle}>Post Likers</Text>
              <Text style={styles.likersSubtitle}>
                {likers.length} {likers.length === 1 ? 'person' : 'people'} liked this post
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Likers</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Main content */}
      <View style={styles.content}>
        {renderLikersList()}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  likersHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  likersTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  likersSubtitle: {
    color: '#ccc',
    fontSize: 14,
  },
  searchContainer: {
    margin: 16,
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    marginVertical: 8,
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
    padding: 4,
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#888',
    fontSize: 14,
  },
  likersListContent: {
    paddingBottom: 24,
  },
  likerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  currentUserItem: {
    backgroundColor: 'rgba(24,119,242,0.1)',
  },
  likerRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  likerRankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  likerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  likerInfo: {
    flex: 1,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  likerUsername: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  youBadge: {
    backgroundColor: '#1877F2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  youBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  likerLikesCount: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 4,
  },
  noDataContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    color: '#888',
    fontSize: 16,
  },
  userDetailButton: {
    padding: 8,
  },
  profileLinkIndicator: {
    marginLeft: 'auto',
    opacity: 0,
  },
  profileLinkText: {
    color: '#1877F2',
    fontSize: 12,
  },
}); 