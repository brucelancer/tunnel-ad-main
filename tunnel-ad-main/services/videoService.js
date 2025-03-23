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
export const generateThumbnail = async (videoUri) => {
  // In a real app, you would generate a thumbnail from the video
  // For now, we'll use a placeholder method
  try {
    // Return a placeholder image
    return {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: 'image-placeholder-reference' // This would be a real image reference in production
      }
    };
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
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
      "thumbnail": thumbnail.asset->url,
      createdAt
    }`;
    
    console.log('Fetching videos with query:', query);
    const videos = await client.fetch(query, params);
    
    // Process videos to ensure we have a URL field
    return videos.map(video => ({
      ...video,
      id: video._id, // Add id field to match existing interface
      url: video.videoUrl || video.url // Use file URL if available, otherwise use provided URL
    }));
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw error;
  }
};

// Update video statistics (views, likes, dislikes)
export const updateVideoStats = async (videoId, stats) => {
  try {
    // Create patch object with only the provided stats
    const patch = {};
    if (stats.views !== undefined) patch.views = stats.views;
    if (stats.likes !== undefined) patch.likes = stats.likes;
    if (stats.dislikes !== undefined) patch.dislikes = stats.dislikes;
    
    // Update the video document
    await client.patch(videoId).inc(patch).commit();
    console.log('Video stats updated:', videoId);
    return true;
  } catch (error) {
    console.error('Error updating video stats:', error);
    throw error;
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