import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

// Read environment variables
const projectId = process.env.SANITY_PROJECT_ID || '21is7976';
const dataset = process.env.SANITY_DATASET || 'production';
const token = process.env.SANITY_API_TOKEN || 'skfYBXlqcVRszR6D3U2X3hPAMKupissIjK6LehFgtmYRkavBwU49tXYqryhOliJ7mclzM38VivW4vz75T6edrwsmwGPwgFEHxgANwxVnFNDFBq9pWjLhSd6dfB4yJNbVbgfkKlkocZ1VgYpd2ldczW64WNhqiTkclddkAxaTinVBhF9NMme0';

// Initialize the client
const client = createClient({
  projectId,
  dataset,
  useCdn: false, // Set to `false` for real-time data
  apiVersion: '2023-03-01',
  token
})

// Export the client for other uses (like real-time subscriptions)
export const getSanityClient = () => client;

// Helper for image URLs
const builder = imageUrlBuilder(client)
export const urlFor = (source) => {
  return builder.image(source)
}

// Function to upload an image to Sanity
export const uploadImageToSanity = async (imageUri) => {
  console.log('Uploading image to Sanity:', imageUri.substring(0, 30) + '...');
  
  try {
    // Convert the URI to a Blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Get file extension from URI or default to jpg
    const extension = (imageUri.match(/\.([^.]+)$/) || [])[1] || 'jpg';
    const filename = `post-image-${Date.now()}.${extension}`;
    
    // Create a file from the blob
    const imageFile = new File([blob], filename, { type: `image/${extension}` });
    
    // Upload the file to Sanity
    const asset = await client.assets.upload('image', imageFile);
    
    console.log('Image uploaded successfully, asset ID:', asset._id);
    
    // Return the asset reference that Sanity expects
    // Include a _key property to prevent "Missing keys" error in Sanity Studio
    return {
      _type: 'image',
      _key: `image_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Add a unique key
      asset: {
        _type: 'reference',
        _ref: asset._id
      }
    };
  } catch (error) {
    console.error('Error uploading image to Sanity:', error);
    throw error;
  }
};

// Fetch all posts
export const fetchPosts = async (userId = '') => {
  try {
    console.log('Fetching posts, user ID:', userId || 'guest');
    
    const posts = await client.fetch(`
      *[_type == "post"] | order(createdAt desc) {
        _id,
        content,
        location,
        createdAt,
        likesCount,
        commentsCount,
        points,
        "hasLiked": count(likes[_ref == $userId]) > 0,
        "hasSaved": count(savedBy[_ref == $userId]) > 0,
        "author": author->{
          _id,
          username,
          firstName,
          lastName,
          "avatar": profile.avatar,
          "isVerified": username == "admin" || username == "moderator",
          "isBlueVerified": defined(isBlueVerified) && isBlueVerified == true
        },
        pointsAwardedBy[]{
          _key,
          points,
          awardedAt,
          user->{
            _id,
            username,
            firstName,
            lastName
          }
        },
        images
      }
    `, { userId: userId || '' });
    
    console.log(`Fetched ${posts.length} posts`);
    
    // For debugging
    if (posts.length > 0) {
      const firstPost = posts[0];
      console.log('First post images:', JSON.stringify(firstPost.images));
      console.log('First post points:', firstPost.points);
      console.log('First post points awarded by:', firstPost.pointsAwardedBy ? firstPost.pointsAwardedBy.length : 0);
    }
    
    // Calculate time ago for each post
    return posts.map(post => ({
      ...post,
      timeAgo: calculateTimeAgo(post.createdAt)
    }));
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
}

// Create a new post
export const createPost = async (postData, userId) => {
  try {
    const { content, location, images = [] } = postData
    
    console.log(`Starting post creation for user: ${userId}`)
    console.log(`Post has ${images.length} images to upload`)
    
    // Upload images if there are any
    const imageAssets = []
    if (images && images.length > 0) {
      console.log('Beginning image uploads...')
      
      for (let i = 0; i < images.length; i++) {
        console.log(`Uploading image ${i+1}/${images.length}...`)
        const imageAsset = await uploadImageToSanity(images[i])
        // Ensure each image has a unique _key (added in uploadImageToSanity)
        imageAssets.push(imageAsset)
        console.log(`Image ${i+1} uploaded successfully`)
      }
      
      console.log('All images uploaded successfully')
    }
    
    // Create post document
    const newPost = {
      _type: 'post',
      content,
      location: location || '',
      author: {
        _type: 'reference',
        _ref: userId
      },
      images: imageAssets, // These now have _key property
      createdAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
      points: 0
    }
    
    console.log('Creating post document in Sanity...')
    const createdPost = await client.create(newPost)
    console.log('Post created successfully with ID:', createdPost._id)
    
    return createdPost
  } catch (error) {
    console.error('Error creating post:', error)
    throw error
  }
}

// Like or unlike a post
export const toggleLikePost = async (postId, userId) => {
  try {
    if (!postId) {
      console.error('Missing postId in toggleLikePost');
      throw new Error('Missing post ID');
    }
    
    // Only proceed if we have a valid user ID
    if (!userId || userId.trim() === '' || userId === 'guest-user' || userId === 'anonymous') {
      console.warn('Cannot like post: No valid user ID provided');
      return { liked: false, likesCount: 0, error: 'Authentication required' };
    }
    
    console.log(`Toggling like for post ${postId} by user ${userId}`);
    
    // Check if the user has already liked the post
    const post = await client.fetch(`
      *[_type == "post" && _id == $postId] {
        _id,
        "hasLiked": count(likes[_ref == $userId]) > 0,
        likesCount
      }[0]
    `, { postId, userId });
    
    if (!post) {
      console.error(`Post not found: ${postId}`);
      throw new Error('Post not found');
    }
    
    // Toggle like
    if (post.hasLiked) {
      // Unlike: Remove user reference from likes array
      console.log(`User ${userId} unliking post ${postId}`);
      await client
        .patch(postId)
        .unset([`likes[_ref == "${userId}"]`])
        .dec({ likesCount: 1 })
        .commit();
      
      console.log('Unlike successful');
      return { liked: false, likesCount: post.likesCount - 1 };
    } else {
      // Like: Add user reference to likes array
      console.log(`User ${userId} liking post ${postId}`);
      await client
        .patch(postId)
        .setIfMissing({ likes: [] })
        .append('likes', [{ 
          _type: 'reference', 
          _ref: userId,
          _key: `${userId}-${Date.now()}` // Add a unique key using userId and timestamp
        }])
        .inc({ likesCount: 1 })
        .commit();
      
      console.log('Like successful');
      return { liked: true, likesCount: post.likesCount + 1 };
    }
  } catch (error) {
    console.error('Error toggling post like:', error);
    throw error;
  }
}

// Comment on a post
export const addComment = async (postId, text, userId = '', parentCommentId = null) => {
  try {
    if (!postId) {
      console.error('Missing postId in addComment');
      throw new Error('Missing post ID');
    }

    console.log(`Adding comment to post ${postId} by user ${userId || 'anonymous'}: "${text.substring(0, 30)}..."`);
    if (parentCommentId) {
      console.log(`This is a reply to comment: ${parentCommentId}`);
    }
    
    // Create a unique key for the comment
    const commentKey = `comment-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create the base comment object
    let comment = {
      _key: commentKey,
      _type: 'object',
      text,
      _createdAt: new Date().toISOString(),
      likes: []
    };
    
    // Add parent comment reference if this is a reply
    if (parentCommentId) {
      // Store the parent comment key as a string
      comment.parentComment = String(parentCommentId);
    }
    
    // Only proceed with author reference if we have a valid user ID
    if (userId && userId.trim() !== '' && userId !== 'guest-user' && userId !== 'anonymous') {
      // For authenticated users, add a proper reference
      comment.author = {
        _type: 'reference',
        _ref: userId
      };
      
      console.log(`Adding comment with author reference: ${userId}`);
    } else {
      // For anonymous/guest users, don't add any reference
      comment.authorName = 'Guest';
      console.log('Adding comment as Guest (no reference)');
    }
    
    // Add comment to post
    await client
      .patch(postId)
      .setIfMissing({ comments: [] })
      .append('comments', [comment])
      .inc({ commentsCount: 1 })
      .commit();
    
    console.log('Comment added successfully');
    
    // For anonymous users, return a simpler response
    if (!userId || userId.trim() === '' || userId === 'guest-user' || userId === 'anonymous') {
      return {
        id: commentKey,
        text,
        createdAt: comment._createdAt,
        likes: 0,
        timeAgo: 'Just now',
        author: {
          _id: 'anonymous',
          id: 'anonymous',
          name: 'Guest',
          username: '@guest',
          avatar: null,
          isVerified: false
        }
      };
    }
    
    // For authenticated users, fetch their data
    try {
      const user = await client.fetch(`
        *[_type == "user" && _id == $userId][0] {
          _id,
          username,
          firstName,
          lastName,
          "avatar": profile.avatar,
          "isVerified": username == "admin" || username == "moderator"
        }
      `, { userId });
      
      if (user) {
        console.log(`Retrieved user data for comment author: ${user.username || user._id}`);
        
        return {
          id: `${user._id}-${Date.now()}`,
          text,
          createdAt: comment._createdAt,
          likes: 0,
          timeAgo: 'Just now',
          author: {
            _id: user._id,
            id: user._id,
            name: user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
            username: user.username ? `@${user.username}` : '@user',
            avatar: user.avatar ? urlFor(user.avatar).url() : null,
            isVerified: user.isVerified || false
          }
        };
      } else {
        console.warn(`User with ID ${userId} not found, returning generic user info`);
      }
    } catch (userError) {
      console.error('Error fetching user data for comment:', userError);
    }
    
    // Fallback if user fetch fails
    return {
      id: `user-${Date.now()}`,
      text,
      createdAt: comment._createdAt,
      likes: 0,
      timeAgo: 'Just now',
      author: {
        _id: userId,
        id: userId,
        name: 'User',
        username: '@user',
        avatar: null,
        isVerified: false
      }
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

// Toggle save post
export const toggleSavePost = async (postId, userId) => {
  try {
    if (!postId) {
      console.error('Missing postId in toggleSavePost');
      throw new Error('Missing post ID');
    }
    
    // Only proceed if we have a valid user ID
    if (!userId || userId.trim() === '' || userId === 'guest-user' || userId === 'anonymous') {
      console.warn('Cannot save post: No valid user ID provided');
      return { saved: false, error: 'Authentication required' };
    }
    
    console.log(`Toggling save for post ${postId} by user ${userId}`);
    
    // Check if the user has already saved the post
    const post = await client.fetch(`
      *[_type == "post" && _id == $postId] {
        _id,
        "hasSaved": count(savedBy[_ref == $userId]) > 0
      }[0]
    `, { postId, userId });
    
    if (!post) {
      console.error(`Post not found: ${postId}`);
      throw new Error('Post not found');
    }
    
    // Toggle save
    if (post.hasSaved) {
      // Unsave: Remove user reference from savedBy array
      console.log(`User ${userId} unsaving post ${postId}`);
      await client
        .patch(postId)
        .unset([`savedBy[_ref == "${userId}"]`])
        .commit();
      
      console.log('Unsave successful');
      return { saved: false };
    } else {
      // Save: Add user reference to savedBy array
      console.log(`User ${userId} saving post ${postId}`);
      await client
        .patch(postId)
        .setIfMissing({ savedBy: [] })
        .append('savedBy', [{ 
          _type: 'reference', 
          _ref: userId,
          _key: `${userId}-${Date.now()}` // Add a unique key using userId and timestamp 
        }])
        .commit();
      
      console.log('Save successful');
      return { saved: true };
    }
  } catch (error) {
    console.error('Error toggling post save:', error);
    throw error;
  }
}

// Award points to a post
export const awardPoints = async (postId, points, userId = '') => {
  try {
    if (!postId) {
      console.error('Missing postId in awardPoints');
      throw new Error('Missing post ID');
    }
    
    console.log(`Awarding ${points} points to post ${postId}`);
    
    // Record who awarded the points if we have a valid user ID
    let transaction = client.patch(postId).inc({ points: points });
    
    if (userId && userId.trim() !== '' && userId !== 'guest-user' && userId !== 'anonymous') {
      console.log(`User ${userId} is awarding points`);
      
      // Generate a unique key for this points transaction
      const uniqueKey = `points-${userId}-${Date.now()}`;
      
      // Add user to the pointsAwardedBy array if it doesn't exist
      transaction = transaction
        .setIfMissing({ pointsAwardedBy: [] })
        .append('pointsAwardedBy', [{ 
          _key: uniqueKey,
          _type: 'object',
          user: { _type: 'reference', _ref: userId },
          points: points,
          awardedAt: new Date().toISOString()
        }]);
      
      console.log(`Added points transaction with key: ${uniqueKey}`);
    }
    
    await transaction.commit();
    console.log(`Successfully awarded ${points} points to post ${postId}`);
    
    return { success: true, points: points };
  } catch (error) {
    console.error('Error awarding points:', error);
    throw error;
  }
}

// Get a single post by ID with full details
export const getPostById = async (postId, userId = '') => {
  try {
    console.log(`Fetching post ${postId} for user ${userId || 'guest'}`);
    
    const post = await client.fetch(`
      *[_type == "post" && _id == $postId][0] {
        _id,
        content,
        location,
        createdAt,
        likesCount,
        commentsCount,
        points,
        "hasLiked": count(likes[_ref == $userId]) > 0,
        "hasSaved": count(savedBy[_ref == $userId]) > 0,
        pointsAwardedBy[]{
          _key,
          points,
          awardedAt,
          user->{
            _id,
            username,
            firstName,
            lastName,
            "avatar": profile.avatar,
            "isVerified": username == "admin" || username == "moderator",
            "isBlueVerified": defined(isBlueVerified) && isBlueVerified == true
          }
        },
        "author": author->{
          _id,
          username,
          firstName,
          lastName,
          "avatar": profile.avatar,
          "isVerified": username == "admin" || username == "moderator",
          "isBlueVerified": defined(isBlueVerified) && isBlueVerified == true
        },
        images,
        comments[]{
          _key,
          text,
          _createdAt,
          authorName,
          likes,
          parentComment,
          author->{
            _id,
            username,
            firstName,
            lastName,
            profile {
              avatar
            },
            "isVerified": username == "admin" || username == "moderator",
            "isBlueVerified": defined(isBlueVerified) && isBlueVerified == true
          }
        }
      }
    `, { postId, userId: userId || '' });
    
    if (!post) {
      console.log(`Post ${postId} not found`);
      return null;
    }
    
    console.log(`Post ${postId} fetched successfully`);
    console.log(`Points awarded data: ${post.pointsAwardedBy ? post.pointsAwardedBy.length : 0} entries`);
    
    // Add timeAgo
    return {
      ...post,
      timeAgo: calculateTimeAgo(post.createdAt)
    };
  } catch (error) {
    console.error(`Error fetching post ${postId}:`, error);
    throw error;
  }
}

// Helper function to calculate time ago
function calculateTimeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const secondsAgo = Math.floor((now - date) / 1000)
  
  if (secondsAgo < 60) {
    return 'Just now'
  }
  
  const minutesAgo = Math.floor(secondsAgo / 60)
  if (minutesAgo < 60) {
    return `${minutesAgo} ${minutesAgo === 1 ? 'minute' : 'minutes'} ago`
  }
  
  const hoursAgo = Math.floor(minutesAgo / 60)
  if (hoursAgo < 24) {
    return `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago`
  }
  
  const daysAgo = Math.floor(hoursAgo / 24)
  if (daysAgo < 30) {
    return `${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`
  }
  
  const monthsAgo = Math.floor(daysAgo / 30)
  if (monthsAgo < 12) {
    return `${monthsAgo} ${monthsAgo === 1 ? 'month' : 'months'} ago`
  }
  
  const yearsAgo = Math.floor(monthsAgo / 12)
  return `${yearsAgo} ${yearsAgo === 1 ? 'year' : 'years'} ago`
} 