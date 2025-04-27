import { useState, useEffect, useCallback } from 'react';
import * as postService from '../../tunnel-ad-main/services/postService';
import { urlFor } from '../../tunnel-ad-main/services/postService';
import { useSanityAuth } from './useSanityAuth';
import { usePointsStore } from '@/store/usePointsStore';

export const usePostFeed = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSanityAuth();
  const { addPoints } = usePointsStore();

  // Format posts from Sanity to match our component structure
  const formatPost = useCallback((post: any) => {
    // Handle image URLs - check both formats
    let imageUrls: string[] = [];
    if (post.images && post.images.length > 0) {
      // Try to handle both formats of image data
      imageUrls = post.images.map((img: any) => {
        if (typeof img === 'string') {
          return img;
        } else if (img.url) {
          return img.url;
        } else if (img.asset && img.asset._ref) {
          // Convert Sanity image reference to URL
          return urlFor(img).url();
        }
        return '';
      }).filter((url: string) => url);
    }

    // Format the post data
    return {
      id: post._id,
      _id: post._id, // Include both formats for compatibility
      content: post.content || '',
      location: post.location || '',
      timeAgo: post.timeAgo || calculateTimeAgo(post.createdAt),
      likes: post.likesCount || 0,
      comments: post.commentsCount || 0,
      points: post.points || 0,
      hasLiked: post.hasLiked || false,
      hasSaved: post.hasSaved || false,
      user: {
        id: post.author?._id || 'unknown',
        _id: post.author?._id || 'unknown',
        name: post.author?.username || (post.author?.firstName ? `${post.author.firstName} ${post.author.lastName || ''}` : 'Unknown User'),
        username: '@' + (post.author?.username || 'unknown'),
        avatar: post.author?.avatar ? urlFor(post.author.avatar).url() : 'https://randomuser.me/api/portraits/men/32.jpg',
        isVerified: post.author?.isVerified || false,
        isBlueVerified: post.author?.isBlueVerified || false
      },
      images: imageUrls,
      // Preserve the raw comments array if present for detail views
      rawComments: post.comments || []
    };
  }, []);

  // Helper function to calculate time ago for consistent formatting
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
      return `${minutesAgo} ${minutesAgo === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) {
      return `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago`;
    }
    
    const daysAgo = Math.floor(hoursAgo / 24);
    if (daysAgo < 30) {
      return `${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
    }
    
    const monthsAgo = Math.floor(daysAgo / 30);
    if (monthsAgo < 12) {
      return `${monthsAgo} ${monthsAgo === 1 ? 'month' : 'months'} ago`;
    }
    
    const yearsAgo = Math.floor(monthsAgo / 12);
    return `${yearsAgo} ${yearsAgo === 1 ? 'year' : 'years'} ago`;
  };

  // Load posts from Sanity
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading posts with user:', user?._id || 'guest');
      
      // Pass user ID to get personalized like/save status
      const fetchedPosts = await postService.fetchPosts(user?._id);
      
      // Transform to our component format
      const formattedPosts = fetchedPosts.map(formatPost);
      
      console.log(`Transformed ${formattedPosts.length} posts for UI`);
      
      setPosts(formattedPosts);
    } catch (err: any) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [formatPost, user]);

  // Initial load
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
  };

  // Handle like
  const handleLike = useCallback(async (postId: string) => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }

    try {
      // Find post in our local state
      const postIndex = posts.findIndex((p: any) => p.id === postId);
      if (postIndex === -1) return;

      const post = posts[postIndex];
      const currentlyLiked = post.hasLiked;

      // Optimistically update UI
      const updatedPosts = [...posts];
      updatedPosts[postIndex] = {
        ...post,
        hasLiked: !currentlyLiked,
        likes: currentlyLiked ? post.likes - 1 : post.likes + 1
      };
      
      setPosts(updatedPosts);

      // Update on server
      const result = await postService.toggleLikePost(postId, user._id);
      
      // Award points for liking (only if not previously liked)
      if (!currentlyLiked) {
        addPoints(1);
      }
      
      // If server responds differently than expected, revert
      if (result.liked !== !currentlyLiked) {
        loadPosts(); // Reload to get server state
      }
    } catch (err) {
      console.error('Error liking post:', err);
      loadPosts(); // Reload to get correct state
    }
  }, [posts, user, addPoints, loadPosts]);

  // Handle save
  const handleSave = useCallback(async (postId: string) => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }

    try {
      // Find post in our local state
      const postIndex = posts.findIndex((p: any) => p.id === postId);
      if (postIndex === -1) return;

      const post = posts[postIndex];
      const currentlySaved = post.hasSaved;

      // Optimistically update UI
      const updatedPosts = [...posts];
      updatedPosts[postIndex] = {
        ...post,
        hasSaved: !currentlySaved
      };
      
      setPosts(updatedPosts);

      // Update on server
      const result = await postService.toggleSavePost(postId, user._id);
      
      // If server responds differently than expected, revert
      if (result.saved !== !currentlySaved) {
        loadPosts(); // Reload to get server state
      }
    } catch (err) {
      console.error('Error saving post:', err);
      loadPosts(); // Reload to get correct state
    }
  }, [posts, user, loadPosts]);

  // Handle award points
  const handleAwardPoints = useCallback(async (postId: string, points: number) => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }

    try {
      // Find post in our local state
      const postIndex = posts.findIndex((p: any) => p.id === postId);
      if (postIndex === -1) return;

      const post = posts[postIndex];

      // Optimistically update UI
      const updatedPosts = [...posts];
      updatedPosts[postIndex] = {
        ...post,
        points: post.points + points
      };
      
      setPosts(updatedPosts);

      // Update on server - this already creates the pointsAwardedBy entry
      const result = await postService.awardPoints(postId, points, user._id);
      
      // Subtract points from user
      addPoints(-points);
      
      console.log(`User ${user._id} awarded ${points} points to post ${postId} owned by ${post.user.id}`);
      
      // The pointsTransaction document is only needed if your schema requires a separate document
      // Uncomment this section if you need a separate document in addition to the postAwardedBy array
      /* 
      try {
        const pointsRecordData = {
          _type: 'pointsTransaction',
          postId: postId,
          awardedBy: {
            _type: 'reference',
            _ref: user._id
          },
          awardedTo: {
            _type: 'reference',
            _ref: post.user.id
          },
          points: points,
          awardedAt: new Date().toISOString()
        };
        
        // Create a standalone record for points analytics
        await postService.getSanityClient().create(pointsRecordData);
      } catch (analyticsErr) {
        console.error('Error recording points analytics:', analyticsErr);
        // Don't fail the main function if analytics recording fails
      }
      */
    } catch (err) {
      console.error('Error awarding points:', err);
      loadPosts(); // Reload to get correct state
    }
  }, [posts, user, addPoints, loadPosts]);

  // Create new post
  const createPost = useCallback(async (content: string, location = '', images: string[] = []) => {
    if (!user) {
      console.log('User not authenticated');
      return null;
    }

    try {
      setLoading(true);
      
      const postData = {
        content,
        location,
        images
      };
      
      console.log(`Creating post with ${images.length} images`);
      
      // Upload to Sanity
      const newPost = await postService.createPost(postData, user._id);
      
      // Award points for posting
      addPoints(5);
      
      // Reload posts to include the new one
      await loadPosts();
      
      return newPost;
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
      throw err; // Propagate error to caller
    } finally {
      setLoading(false);
    }
  }, [user, addPoints, loadPosts]);

  // Helper function for fetching a single post by ID
  const getPost = useCallback(async (postId: string) => {
    if (!postId) {
      console.error('getPost called without a postId');
      return null;
    }
    
    try {
      console.log(`Getting post ${postId} with user ID: ${user?._id || 'guest'}`);
      const post = await postService.getPostById(postId, user?._id);
      
      if (!post) {
        console.log(`No post found with ID: ${postId}`);
        return null;
      }
      
      return formatPost(post);
    } catch (error) {
      console.error(`Error fetching post ${postId}:`, error);
      throw error;
    }
  }, [user, formatPost]);

  return {
    posts,
    loading,
    refreshing,
    error,
    handleRefresh,
    handleLike,
    handleSave,
    handleAwardPoints,
    createPost,
    user,
    getPost
  };
}; 