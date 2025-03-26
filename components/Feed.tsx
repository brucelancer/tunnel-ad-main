import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  Pressable, 
  Dimensions, 
  ActivityIndicator,
  Animated,
  Share,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  useWindowDimensions
} from 'react-native';
import { usePointsStore } from '@/store/usePointsStore';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Heart, 
  Bookmark, 
  MessageCircle, 
  Share2, 
  Award, 
  Image as ImageIcon, 
  Send,
  MoreVertical,
  Camera,
  ThumbsUp,
  MapPin
} from 'lucide-react-native';
import { usePostFeed } from '@/app/hooks/usePostFeed';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock data for the social feed
const FEED_POSTS = [
  {
    id: '1',
    user: {
      id: 'user1',
      name: 'Sarah Johnson',
      username: '@dancepro',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      isVerified: true
    },
    content: "Just learned these amazing new dance moves at today's workshop! Can't wait to practice more and share with everyone.",
    images: ['https://images.unsplash.com/photo-1519682337058-a94d519337bc'],
    location: 'Dance Studio 55, New York',
    timeAgo: '15 minutes ago',
    likes: 243,
    comments: 42,
    points: 28,
    hasLiked: false,
    hasSaved: false
  },
  {
    id: '2',
    user: {
      id: 'user2',
      name: 'Mike Chen',
      username: '@musicinsider',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      isVerified: false
    },
    content: "The latest music tech I'm exploring is mind-blowing! Virtual instruments that respond to your emotions? The future is here!",
    images: [
      'https://images.unsplash.com/photo-1518609878373-06d740f60d8b',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d'
    ],
    location: 'Tech Music Conference',
    timeAgo: '2 hours ago',
    likes: 189,
    comments: 23,
    points: 15,
    hasLiked: false,
    hasSaved: false
  },
  {
    id: '3',
    user: {
      id: 'user3',
      name: 'Min Thu',
      username: '@myanmarculture',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
      isVerified: true
    },
    content: "Visited Shwedagon Pagoda today at sunset. The golden stupa shimmers with divine beauty as the sun sets. A sacred place that embodies Myanmar's spiritual heritage. ✨🙏",
    images: [
      'https://res.cloudinary.com/rainforest-cruises/images/c_fill,g_auto/f_auto,q_auto/w_1120,h_650/v1623088422/Shwedagon-Pagoda-Guide-Sunset/Shwedagon-Pagoda-Guide-Sunset.jpg'
    ],
    location: 'Shwedagon Pagoda, Yangon',
    timeAgo: '1 day ago',
    likes: 319,
    comments: 47,
    points: 35,
    hasLiked: false,
    hasSaved: false
  },
  {
    id: '4',
    user: {
      id: 'user4',
      name: 'Alex Rivera',
      username: '@streetlife',
      avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
      isVerified: false
    },
    content: "No photos today, just a thought: Music isn't just what you hear, it's what you feel. The rhythm of the city, the beat of footsteps, the melody of conversations - it's all music if you listen closely.",
    images: [],
    location: '',
    timeAgo: '3 hours ago',
    likes: 98,
    comments: 12,
    points: 8,
    hasLiked: false,
    hasSaved: false
  }
];

export default function Feed() {
  // Use the post feed hook for Sanity data
  const { 
    posts: sanityPosts, 
    loading, 
    refreshing: hookRefreshing,
    handleRefresh: handleSanityRefresh,
    handleLike: handleSanityLike,
    handleSave: handleSanitySave,
    handleAwardPoints: handleSanityAwardPoints,
    createPost,
    user
  } = usePostFeed();

  const { addPoints } = usePointsStore();
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  // Use Sanity posts if available, otherwise use mock data
  const [posts, setPosts] = useState(FEED_POSTS);
  const [newPostText, setNewPostText] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Update local posts state when Sanity posts change
  useEffect(() => {
    if (sanityPosts && sanityPosts.length > 0) {
      setPosts(sanityPosts);
    }
  }, [sanityPosts]);

  // Calculate responsive dimensions
  const isTablet = windowWidth > 768;
  const isLargePhone = windowWidth > 428;
  const cardWidth = isTablet ? Math.min((windowWidth * 0.5) - 40, 500) : windowWidth - 32;
  const imageHeight = calculateImageHeight(windowWidth, windowHeight, isTablet);

  function calculateImageHeight(width: number, height: number, isTablet: boolean) {
    // For tablets in landscape, use shorter height to avoid images being too tall
    if (isTablet && width > height) {
      return height * 0.4;
    }
    // For tall phones, limit the image height
    if (width < 500 && height > 700) {
      return width * 0.6;
    }
    // Default ratio
    return width * 0.55;
  }

  // Handle post interactions using Sanity (if user is authenticated) or local state
  const handlePostPress = (post: any) => {
    // Navigate to post detail
    router.push({
      pathname: "/feedpost-detail" as any,
      params: { id: post.id }
    });
  };

  const handleLike = (id: string) => {
    if (user) {
      // Use Sanity like functionality if user is authenticated
      handleSanityLike(id);
    } else {
      // Use local state for demo purposes
      setLikedPosts(prev => {
        const newState = {
          ...prev,
          [id]: !prev[id]
        };
        
        // Update post likes count
        setPosts(currentPosts => 
          currentPosts.map(post => {
            if (post.id === id) {
              return {
                ...post,
                likes: newState[id] ? post.likes + 1 : post.likes - 1,
                hasLiked: newState[id]
              };
            }
            return post;
          })
        );
        
        // Award points for engagement
        if (!prev[id]) {
          addPoints(1);
        }
        
        return newState;
      });
    }
  };

  const handleSave = (id: string) => {
    if (user) {
      // Use Sanity save functionality if user is authenticated
      handleSanitySave(id);
    } else {
      // Use local state for demo purposes
      setSavedPosts(prev => {
        const newState = {
          ...prev,
          [id]: !prev[id]
        };
        
        // Update post saved state
        setPosts(currentPosts => 
          currentPosts.map(post => {
            if (post.id === id) {
              return {
                ...post,
                hasSaved: newState[id]
              };
            }
            return post;
          })
        );
        
        return newState;
      });
    }
  };

  const handleAwardPoints = (id: string, points: number) => {
    if (user) {
      // Use Sanity points functionality if user is authenticated
      handleSanityAwardPoints(id, points);
    } else {
      // Use local state for demo purposes
      setPosts(currentPosts => 
        currentPosts.map(post => {
          if (post.id === id) {
            return {
              ...post,
              points: post.points + points
            };
          }
          return post;
        })
      );
      
      // Subtract points from user
      addPoints(-points);
    }
  };

  // Handle refresh - use Sanity refresh if available
  const handleRefresh = () => {
    if (user) {
      // Use Sanity refresh if user is authenticated
      handleSanityRefresh();
    } else {
      // Use local refresh for demo
      setRefreshing(true);
      setTimeout(() => {
        // Simulate fetching new content
        const newPost = {
          id: `refresh-${Date.now()}`,
          user: {
            id: 'user5',
            name: 'Taylor Swift',
            username: '@taylorswift',
            avatar: 'https://randomuser.me/api/portraits/women/90.jpg',
            isVerified: true
          },
          content: "Just dropped a new song! Check it out on my profile. #NewMusic #SwiftiesForever",
          images: ['https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae'],
          location: 'Recording Studio',
          timeAgo: 'Just now',
          likes: 0,
          comments: 0,
          points: 0,
          hasLiked: false,
          hasSaved: false
        };
        
        setPosts([newPost, ...posts]);
        setRefreshing(false);
      }, 1500);
    }
  };

  // Handle post creation - using Sanity if authenticated
  const handlePostSubmit = async () => {
    if (!newPostText.trim()) return;
    
    if (user) {
      // Use Sanity create post functionality
      await createPost(newPostText);
      setNewPostText('');
    } else {
      // Add new post to the local feed for demo purposes
      const newPost = {
        id: `temp-${Date.now()}`,
        user: {
          id: 'currentUser',
          name: 'You',
          username: '@me',
          avatar: 'https://randomuser.me/api/portraits/men/85.jpg',
          isVerified: false
        },
        content: newPostText,
        images: [],
        location: '',
        timeAgo: 'Just now',
        likes: 0,
        comments: 0,
        points: 0,
        hasLiked: false,
        hasSaved: false
      };
      
      setPosts([newPost, ...posts]);
      setNewPostText('');
      addPoints(5); // Award points for posting
    }
  };

  const handleShare = async (post: typeof FEED_POSTS[0]) => {
    try {
      const result = await Share.share({
        message: `${post.user.name} posted: ${post.content}`,
        title: 'Check out this post!',
      });
      
      if (result.action === Share.sharedAction) {
        addPoints(2);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleComment = (id: string) => {
    // Navigate to comments section of post detail
    router.push({
      pathname: "/feedpost-detail" as any,
      params: { id, showComments: "true" }
    });
  };

  const handleUserProfile = (userId: string) => {
    // Navigate to user profile
    router.push({
      pathname: "/user-profile" as any,
      params: { id: userId }
    });
  };

  const renderPostCard = ({ item }: { item: typeof FEED_POSTS[0] }) => {
    const isLiked = likedPosts[item.id] || item.hasLiked;
    const isSaved = savedPosts[item.id] || item.hasSaved;
    
    return (
      <View style={[styles.postContainer, { width: cardWidth }]}>
        {/* User info row */}
        <Pressable 
          style={styles.userContainer}
          onPress={() => handleUserProfile(item.user.id)}
        >
          <Image 
            source={{ uri: item.user.avatar }} 
            style={styles.userAvatar} 
          />
          <View style={styles.userInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{item.user.name}</Text>
              {item.user.isVerified ? (
                <View style={styles.verifiedBadge}>
                  <ThumbsUp size={8} color="#fff" />
                </View>
              ) : null}
            </View>
            <View style={styles.userHandleContainer}>
              <Text style={styles.userHandle}>{item.user.username}</Text>
              <Text style={styles.timeAgo}> • {item.timeAgo}</Text>
            </View>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Pressable style={styles.moreButton} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <MoreVertical size={16} color="#888" />
            </Pressable>
          </View>
        </Pressable>
        
        {/* Post content */}
        <Pressable onPress={() => handlePostPress(item)}>
          <Text style={styles.postContent}>{item.content}</Text>
        </Pressable>
        
        {/* Location */}
        {item.location ? (
          <View style={styles.locationContainer}>
            <MapPin size={12} color="#888" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
        ) : null}
        
        {/* Images - handle multiple images with improved responsiveness */}
        {item.images.length > 0 ? (
          <Pressable
            style={[
              styles.imageContainer,
              item.images.length > 1 ? styles.multipleImagesContainer : null
            ]}
            onPress={() => handlePostPress(item)}
          >
            {item.images.length === 1 ? (
              <Image 
                source={{ uri: item.images[0] }} 
                style={[
                  styles.singleImage, 
                  { 
                    height: imageHeight,
                    borderRadius: isTablet ? 16 : 12
                  }
                ]}
              />
            ) : item.images.length === 2 ? (
              // Special layout for exactly 2 images - side by side
              <View style={styles.twoImagesGrid}>
                <Image 
                  source={{ uri: item.images[0] }} 
                  style={[
                    styles.halfImage, 
                    { height: imageHeight, marginRight: 2 }
                  ]}
                />
                <Image 
                  source={{ uri: item.images[1] }} 
                  style={[
                    styles.halfImage, 
                    { height: imageHeight, marginLeft: 2 }
                  ]}
                />
              </View>
            ) : item.images.length === 3 ? (
              // Special layout for exactly 3 images
              <View style={styles.threeImagesGrid}>
                <Image 
                  source={{ uri: item.images[0] }} 
                  style={[
                    styles.mainImageThree, 
                    { height: imageHeight }
                  ]}
                />
                <View style={styles.secondaryImagesContainerThree}>
                  <Image 
                    source={{ uri: item.images[1] }} 
                    style={[
                      styles.secondaryImageThree,
                      { height: imageHeight / 2 - 2, marginBottom: 4 }
                    ]}
                  />
                  <Image 
                    source={{ uri: item.images[2] }} 
                    style={[
                      styles.secondaryImageThree,
                      { height: imageHeight / 2 - 2 }
                    ]}
                  />
                </View>
              </View>
            ) : (
              // Layout for 4+ images
              <View style={styles.imageGrid}>
                <Image 
                  source={{ uri: item.images[0] }} 
                  style={[styles.mainImage, { height: imageHeight }]}
                />
                <View style={styles.secondaryImagesContainer}>
                  <Image 
                    source={{ uri: item.images[1] }} 
                    style={[styles.secondaryImage, { height: imageHeight }]}
                  />
                  {item.images.length > 2 ? (
                    <View style={styles.moreImagesOverlay}>
                      <Text style={styles.moreImagesText}>+{item.images.length - 2}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
            
            {/* Video play indicator if needed */}
            {item.images[0]?.includes('video') && (
              <View style={styles.videoIndicator}>
                <View style={styles.playButton}>
                  <LinearGradient
                    colors={['rgba(0,112,243,0.8)', 'rgba(0,112,243,0.6)']}
                    style={styles.playButtonGradient}
                  >
                    <Text style={styles.playButtonIcon}>▶</Text>
                  </LinearGradient>
                </View>
              </View>
            )}
          </Pressable>
        ) : null}
        
        {/* Points badge */}
        <View style={styles.pointsBadgeContainer}>
          <View style={styles.pointsBadge}>
            <Award size={14} color="#FFD700" />
            <Text style={styles.pointsText}>{item.points} pts</Text>
          </View>
        </View>
        
        {/* Engagement actions */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionGroup}>
            <Pressable 
              style={styles.actionButton} 
              onPress={() => handleLike(item.id)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Heart 
                size={20} 
                color={isLiked ? '#FF3B30' : '#888'} 
                fill={isLiked ? '#FF3B30' : 'transparent'} 
              />
              <Text style={[styles.actionText, isLiked ? styles.actionTextActive : null]}>
                {item.likes}
              </Text>
            </Pressable>
            
            <Pressable 
              style={styles.actionButton}
              onPress={() => handleComment(item.id)} 
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <MessageCircle size={20} color="#888" />
              <Text style={styles.actionText}>{item.comments}</Text>
            </Pressable>
            
            <Pressable 
              style={styles.actionButton}
              onPress={() => handleShare(item)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Share2 size={20} color="#888" />
            </Pressable>
          </View>
          
          <View style={styles.actionGroup}>
            <Pressable 
              style={styles.actionButton} 
              onPress={() => handleAwardPoints(item.id, 1)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Award size={20} color="#FFD700" />
            </Pressable>
            
            <Pressable 
              style={styles.actionButton} 
              onPress={() => handleSave(item.id)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Bookmark 
                size={20} 
                color={isSaved ? '#0070F3' : '#888'} 
                fill={isSaved ? '#0070F3' : 'transparent'} 
              />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  // Create post component
  const CreatePostComponent = () => (
    <View style={[styles.createPostContainer, { width: cardWidth }]}>
      <View style={styles.createPostHeader}>
        <Image 
          source={{ uri: 'https://randomuser.me/api/portraits/men/85.jpg' }} 
          style={styles.currentUserAvatar} 
        />
        <Pressable
          style={styles.postInputContainer}
          onPress={() => router.push("/newsfeed-upload" as any)}
        >
          <View style={styles.postInput}>
            <Text style={styles.postInputPlaceholder}>What's on your mind?</Text>
          </View>
        </Pressable>
      </View>
      
      <View style={styles.createPostActions}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.createPostButtonsScroll}>
          <View style={styles.createPostButtons}>
            <Pressable 
              style={styles.mediaButton} 
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              onPress={() => router.push("/newsfeed-upload" as any)}
            >
              <ImageIcon size={16} color="#0070F3" />
              <Text style={styles.mediaButtonText}>Photo</Text>
            </Pressable>
            
            <Pressable 
              style={styles.mediaButton} 
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              onPress={() => router.push("/newsfeed-upload" as any)}
            >
              <Camera size={16} color="#0070F3" />
              <Text style={styles.mediaButtonText}>Camera</Text>
            </Pressable>
          </View>
        </ScrollView>
        
        <Pressable 
          style={styles.postButton}
          onPress={() => router.push("/newsfeed-upload" as any)}
        >
          <Text style={styles.postButtonText}>Post</Text>
        </Pressable>
      </View>
    </View>
  );

  // Animated header based on scroll position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Determine number of columns based on screen size
  const numColumns = isTablet ? 2 : 1;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Animated.FlatList
        data={posts}
        renderItem={renderPostCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          isTablet && styles.tabletListContent
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshing={refreshing || hookRefreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={CreatePostComponent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#0070F3" />
            <Text style={styles.emptyText}>Loading posts...</Text>
          </View>
        }
        key={isTablet ? 'grid' : 'list'}
        numColumns={numColumns}
        columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContent: {
    paddingBottom: 80,
    paddingTop: Platform.OS === 'ios' ? 30 : 10,
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  tabletListContent: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  columnWrapper: {
    justifyContent: 'space-around',
    width: '100%',
  },
  // Create post styling
  createPostContainer: {
    backgroundColor: '#111',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    alignSelf: 'center',
    maxWidth: 700,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currentUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postInputContainer: {
    flex: 1,
    position: 'relative',
  },
  postInput: {
    flex: 1,
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    minHeight: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    paddingRight: 40,
    justifyContent: 'center',
  },
  postInputPlaceholder: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  createPostActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createPostButtonsScroll: {
    flex: 1,
  },
  createPostButtons: {
    flexDirection: 'row',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,112,243,0.1)',
    borderRadius: 20,
  },
  mediaButtonText: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 6,
  },
  postButton: {
    backgroundColor: '#0070F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    backgroundColor: 'rgba(0,112,243,0.5)',
  },
  postButtonText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  // Post card styling
  postContainer: {
    marginVertical: 8,
    marginHorizontal: 8,
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    maxWidth: 700,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 10,
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
    marginBottom: 2,
  },
  userName: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  userHandleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0070F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  userHandle: {
    color: '#777',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  timeAgo: {
    color: '#666',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  moreButton: {
    padding: 8,
    marginLeft: 4,
  },
  postContent: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  locationText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 4,
  },
  // Image styling
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  singleImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 16/9,
    resizeMode: 'cover',
  },
  multipleImagesContainer: {
    aspectRatio: 16/9,
  },
  twoImagesGrid: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  halfImage: {
    flex: 1,
    height: '100%',
    resizeMode: 'cover',
  },
  threeImagesGrid: {
    flexDirection: 'row',
    height: '100%',
  },
  mainImageThree: {
    flex: 2,
    height: '100%',
    resizeMode: 'cover',
    marginRight: 4,
  },
  secondaryImagesContainerThree: {
    flex: 1,
    height: '100%',
  },
  secondaryImageThree: {
    width: '100%',
    height: '50%',
    resizeMode: 'cover',
  },
  imageGrid: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  mainImage: {
    flex: 2,
    height: '100%',
    resizeMode: 'cover',
    marginRight: 2,
  },
  secondaryImagesContainer: {
    flex: 1,
    height: '100%',
    position: 'relative',
    marginLeft: 2,
  },
  secondaryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  moreImagesOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: 'white',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  // Video indicator styling
  videoIndicator: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  playButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonIcon: {
    color: 'white',
    fontSize: 24,
  },
  // Points badge
  pointsBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  pointsText: {
    color: '#FFD700',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginLeft: 6,
  },
  actionTextActive: {
    color: '#FF3B30',
  },
  // Empty state
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginTop: 16,
  },
}); 