/**
 * Script to fix missing _key properties in image arrays of post documents
 * 
 * This script fixes the "Missing keys" error in Sanity Studio by adding a unique _key
 * property to each image in the images array of all post documents.
 */

// Import the Sanity client
const { createClient } = require('@sanity/client');

// Initialize the Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN, // You need a token with write permissions
  apiVersion: '2023-10-01', // Use a recent API version
  useCdn: false // We need to write data, so we can't use the CDN
});

// Function to generate a unique key
const generateKey = () => `image_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

// Main function to process all posts
async function fixImageKeys() {
  console.log('Starting to fix missing image keys in post documents...');

  try {
    // 1. Fetch all posts with images
    const posts = await client.fetch(`
      *[_type == "post" && defined(images) && count(images) > 0] {
        _id,
        _rev,
        images
      }
    `);

    console.log(`Found ${posts.length} posts with images to process`);

    // 2. Process each post
    let successCount = 0;
    let errorCount = 0;

    for (const post of posts) {
      try {
        // Check if the images already have _key property
        const needsUpdate = post.images.some(image => !image._key);
        
        if (!needsUpdate) {
          console.log(`Post ${post._id} already has keys for all images, skipping`);
          continue;
        }

        // Add _key to each image that doesn't have it
        const updatedImages = post.images.map(image => {
          // If image already has a _key, keep it
          if (image._key) return image;
          
          // Otherwise, add a unique _key
          return {
            ...image,
            _key: generateKey()
          };
        });

        // Update the post with the fixed images
        await client
          .patch(post._id)
          .set({ images: updatedImages })
          .commit();

        console.log(`✅ Successfully updated post ${post._id}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error updating post ${post._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Total posts processed: ${posts.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed to update: ${errorCount}`);
    console.log('\nProcess complete. You can now refresh Sanity Studio and try the "Add missing keys" button again.');

  } catch (error) {
    console.error('Error fetching posts:', error);
  }
}

// Run the fix function
fixImageKeys().catch(console.error); 