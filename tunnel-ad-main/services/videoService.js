import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

// Read environment variables or use defaults
const projectId = process.env.SANITY_PROJECT_ID || '21is7976';
const dataset = process.env.SANITY_DATASET || 'production';
const token = process.env.SANITY_API_TOKEN || 'skfYBXlqcVRszR6D3U2X3hPAMKupissIjK6LehFgtmYRkavBwU49tXYqryhOliJ7mclzM38VivW4vz75T6edrwsmwGPwgFEHxgANwxVnFNDFBq9pWjLhSd6dfB4yJNbVbgfkKlkocZ1VgYpd2ldczW64WNhqiTkclddkAxaTinVBhF9NMme0';

// Initialize the client
const client = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: '2023-03-01',
  token
})

// Helper for image URLs
const builder = imageUrlBuilder(client)
export const urlFor = (source) => {
  return builder.image(source)
}

// Upload video file to Sanity
export const uploadVideoToSanity = async (videoUri) => {
  console.log('Uploading video to Sanity:', videoUri.substring(0, 30) + '...');
  
  try {
    // Convert the URI to a Blob
    const response = await fetch(videoUri);
    const blob = await response.blob();
    
    // Get file extension from URI or default to mp4
    const extension = (videoUri.match(/\.([^.]+)$/) || [])[1] || 'mp4';
    const filename = `video-${Date.now()}.${extension}`;
    
    // Create a file from the blob
    const videoFile = new File([blob], filename, { type: `video/${extension}` });
    
    // Upload the file to Sanity
    const asset = await client.assets.upload('file', videoFile, {
      contentType: `video/${extension}`,
      filename
    });
    
    console.log('Video uploaded successfully, asset ID:', asset._id);
    
    // Return the asset reference that Sanity expects
    return {
      _type: 'file',
      asset: {
        _type: 'reference',
        _ref: asset._id
      }
    };
  } catch (error) {
    console.error('Error uploading video to Sanity:', error);
    throw error;
  }
};

// Generate thumbnail from video
export const generateThumbnail = async (videoUri, thumbnailUri = null) => {
  try {
    console.log('Generating thumbnail for video:', videoUri);
    
    // If a thumbnailUri is directly provided, use it
    if (thumbnailUri) {
      // Upload the thumbnail image to Sanity
      const response = await fetch(thumbnailUri);
      const blob = await response.blob();
      const extension = (thumbnailUri.match(/\.([^.]+)$/) || [])[1] || 'jpg';
      const filename = `thumbnail-${Date.now()}.${extension}`;
      
      // Create a file from the blob
      const thumbnailFile = new File([blob], filename, { type: `image/${extension}` });
      
      // Upload the file to Sanity
      const asset = await client.assets.upload('image', thumbnailFile, {
        contentType: `image/${extension}`,
        filename
      });
      
      console.log('Thumbnail uploaded successfully, asset ID:', asset._id);
      
      return {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: asset._id
        }
      };
    }
    
    // For external videos, create a placeholder or fetch a frame
    if (videoUri.startsWith('http')) {
      // Create a placeholder thumbnail with the default video thumbnail
      const thumbnailUrl = 'https://i.imgur.com/8LWOKjz.png'; // Default placeholder
      const response = await fetch(thumbnailUrl);
      const blob = await response.blob();
      
      // Upload the placeholder to Sanity
      const asset = await client.assets.upload('image', blob, {
        contentType: 'image/png',
        filename: `thumbnail-${Date.now()}.png`
      });
      
      console.log('Placeholder thumbnail uploaded, asset ID:', asset._id);
      
      return {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: asset._id
        }
      };
    }
    
    // If no thumbnail could be generated, return a default reference
    console.warn('Using default thumbnail reference');
    return {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: 'image-4f11cea1ffa8e1cfeb9596dd57dde6cdcbeff04c-600x400-png' // Default thumbnail reference
      }
    };
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    // Return a default reference instead of null
    return {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: 'image-4f11cea1ffa8e1cfeb9596dd57dde6cdcbeff04c-600x400-png' // Default thumbnail reference
      }
    };
  }
};

// Create a new video document
export const createVideo = async (videoData, userId) => {
  try {
    console.log('Creating video document for user:', userId);
    
    // Prepare the document
    const doc = {
      _type: 'video',
      title: videoData.title || 'Untitled Video',
      description: videoData.description || '',
      author: {
        _type: 'reference',
        _ref: userId
      },
      type: videoData.videoOrientation || 'horizontal',
      contentType: videoData.contentType || 'personal',
      points: 10, // Default points value
      createdAt: new Date().toISOString()
    };
    
    // Add URL if provided (for external videos)
    if (videoData.videoLink) {
      doc.url = videoData.videoLink;
    }
    
    // Add aspect ratio if available
    if (videoData.aspectRatio) {
      doc.aspectRatio = videoData.aspectRatio;
    } else {
      // Set default aspect ratio based on orientation
      doc.aspectRatio = doc.type === 'horizontal' ? 16/9 : 9/16;
    }
    
    // Generate and add thumbnail
    try {
      const thumbnailAsset = await generateThumbnail(
        videoData.videoUri || videoData.videoLink, 
        videoData.thumbnailUri
      );
      if (thumbnailAsset) {
        doc.thumbnail = thumbnailAsset;
      }
    } catch (thumbnailError) {
      console.error('Error creating thumbnail:', thumbnailError);
      // Continue without thumbnail
    }
    
    // If we have a video file, upload it
    if (videoData.videoUri) {
      try {
        const videoAsset = await uploadVideoToSanity(videoData.videoUri);
        doc.videoFile = videoAsset;
      } catch (uploadError) {
        console.error('Error uploading video file:', uploadError);
        // Continue without the video file - might have URL instead
      }
    }
    
    // Create the document in Sanity
    const createdVideo = await client.create(doc);
    console.log('Video created with ID:', createdVideo._id);
    
    // Return the created video document
    return createdVideo;
  } catch (error) {
    console.error('Error creating video:', error);
    throw error;
  }
};

// Mock videos for testing/fallback
const MOCK_VIDEOS = [
  {
    _id: 'mock-video-1',
    title: 'Beautiful Myanmar Landscapes',
    description: 'Explore the stunning landscapes of Myanmar in this breathtaking video.',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-white-sand-beach-and-palm-trees-1564-large.mp4',
    thumbnail: 'https://i.imgur.com/8LWOKjz.png',
    type: 'horizontal',
    points: 15,
    views: 1254,
    likes: 241,
    dislikes: 4,
    author: 'Min Thu',
    authorId: 'auth-123',
    authorAvatar: null,
    isVerified: true,
    isBlueVerified: false,
    createdAt: '2024-02-01T12:00:00.000Z'
  },
  {
    _id: 'mock-video-2',
    title: 'Traditional Dance Performance',
    description: 'Watch this amazing traditional Myanmar dance performance.',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-in-a-forest-with-a-flashlight-32809-large.mp4',
    thumbnail: 'https://i.imgur.com/6kYnVGf.png',
    type: 'vertical',
    points: 10,
    views: 867,
    likes: 125,
    dislikes: 2,
    author: 'Aung San',
    authorId: 'auth-456',
    authorAvatar: null,
    isVerified: false,
    isBlueVerified: true,
    createdAt: '2024-02-10T14:30:00.000Z'
  },
  {
    _id: 'mock-video-3',
    title: 'Yangon Street Food Tour',
    description: 'Join me on a tour of the best street food in Yangon!',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-going-down-a-curved-highway-through-a-mountain-range-41576-large.mp4',
    thumbnail: 'https://i.imgur.com/ZJvTpCM.png',
    type: 'horizontal',
    points: 20,
    views: 3421,
    likes: 532,
    dislikes: 12,
    author: 'May Zin',
    authorId: 'auth-789',
    authorAvatar: null,
    isVerified: true,
    isBlueVerified: false,
    createdAt: '2024-02-20T09:15:00.000Z'
  }
];

// Fetch videos from Sanity
export const fetchVideos = async (limit = 20, lastId = null, contentType = null) => {
  try {
    let query = `*[_type == "video"]`;
    const params = {};
    
    // Add content type filter if provided
    if (contentType) {
      query += ` && contentType == $contentType`;
      params.contentType = contentType;
    }
    
    // Add pagination if lastId provided
    if (lastId) {
      query += ` && _id > $lastId`;
      params.lastId = lastId;
    }
    
    // Add ordering and limit
    query += ` | order(createdAt desc) [0...${limit}] {
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
      "thumbnail": thumbnail.asset->url,
      createdAt
    }`;
    
    console.log('Fetching videos with query:', query);
    const videos = await client.fetch(query, params) || [];
    
    // Process videos to ensure we have a URL field and convert Sanity image to URL
    return videos.map(video => ({
      ...video,
      id: video._id, // Add id field to match existing interface
      url: video.videoUrl || video.url, // Use file URL if available, otherwise use provided URL
      authorAvatar: video.authorAvatar ? urlFor(video.authorAvatar).url() : null // Convert Sanity image to URL
    }));
  } catch (error) {
    console.error('Error fetching videos from Sanity, using mock data:', error);
    // Return mock videos when Sanity fails
    return MOCK_VIDEOS.map(video => ({
      ...video,
      id: video._id
    })).slice(0, limit);
  }
};

// Update video statistics (views, likes, dislikes)
export const updateVideoStats = async (videoId, stats) => {
  try {
    console.log('Updating stats for video:', videoId, stats);
    
    // First check if this is a mock video id
    const mockIndex = MOCK_VIDEOS.findIndex(v => v._id === videoId);
    if (mockIndex >= 0) {
      // Update the mock video data
      if (stats.views !== undefined) {
        MOCK_VIDEOS[mockIndex].views = (MOCK_VIDEOS[mockIndex].views || 0) + stats.views;
      }
      if (stats.likes !== undefined) {
        MOCK_VIDEOS[mockIndex].likes = (MOCK_VIDEOS[mockIndex].likes || 0) + stats.likes;
      }
      if (stats.dislikes !== undefined) {
        MOCK_VIDEOS[mockIndex].dislikes = (MOCK_VIDEOS[mockIndex].dislikes || 0) + stats.dislikes;
      }
      console.log('Mock video stats updated:', videoId);
      return true;
    }
    
    // If not a mock video, proceed with Sanity update
    // First check if video exists
    const video = await client.fetch(
      `*[_type == "video" && _id == $videoId][0]`,
      { videoId }
    );
    
    if (!video) {
      console.error('Video not found:', videoId);
      return false;
    }
    
    // Create patch object with only the provided stats
    const patch = {};
    if (stats.views !== undefined) {
      patch.views = (video.views || 0) + stats.views;
    }
    if (stats.likes !== undefined) {
      patch.likes = (video.likes || 0) + stats.likes;
    }
    if (stats.dislikes !== undefined) {
      patch.dislikes = (video.dislikes || 0) + stats.dislikes;
    }
    
    // Update the video document using set instead of inc to handle undefined fields
    await client.patch(videoId).set(patch).commit();
    console.log('Video stats updated:', videoId);
    return true;
  } catch (error) {
    console.error('Error updating video stats:', error);
    return false; // Return false instead of throwing to prevent app crashes
  }
};

// Delete a video
export const deleteVideo = async (videoId, userId) => {
  try {
    // First check if the user is the author of the video
    const video = await client.fetch(
      `*[_type == "video" && _id == $videoId && author._ref == $userId][0]`,
      { videoId, userId }
    );
    
    if (!video) {
      throw new Error('Video not found or you do not have permission to delete it');
    }
    
    // Delete the video document
    await client.delete(videoId);
    console.log('Video deleted:', videoId);
    return true;
  } catch (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
};

// Export all functions
export default {
  createVideo,
  fetchVideos,
  updateVideoStats,
  deleteVideo,
  uploadVideoToSanity,
  urlFor
}; 