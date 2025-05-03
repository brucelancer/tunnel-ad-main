// Direct fix script using Sanity client
// This script updates the points for the user directly in Sanity

const { createClient } = require('@sanity/client');

// Sanity configuration (copied from your existing API)
const projectId = '21is7976';
const dataset = 'production';
const token = 'skfYBXlqcVRszR6D3U2X3hPAMKupissIjK6LehFgtmYRkavBwU49tXYqryhOliJ7mclzM38VivW4vz75T6edrwsmwGPwgFEHxgANwxVnFNDFBq9pWjLhSd6dfB4yJNbVbgfkKlkocZ1VgYpd2ldczW64WNhqiTkclddkAxaTinVBhF9NMme0';

// Initialize the client with token
const client = createClient({
  projectId,
  dataset,
  useCdn: false, 
  apiVersion: '2023-03-01',
  token
});

async function fixPoints() {
  try {
    // User ID for tunnel user (from the URL in the screenshot)
    const userId = "MBs86ihGgxetNe5QowItmT";
    const correctPoints = 879;
    
    console.log(`Starting direct fix for user ${userId} in Sanity`);
    
    // First check if user exists and get current points
    const userData = await client.fetch(`*[_type == "user" && _id == $userId][0]`, { userId });
    
    if (!userData) {
      console.error('Error: User not found');
      process.exit(1);
    }
    
    console.log(`Found user: ${userData.username || userData.email}`);
    console.log(`Current points in Sanity: ${userData.points || 0}`);
    console.log(`Setting points to: ${correctPoints}`);
    
    // Update user points
    const updatedUser = await client
      .patch(userId)
      .set({ points: correctPoints })
      .commit();
    
    console.log('Points updated successfully!');
    console.log(`User rev: ${updatedUser._rev}`);
    
    // Verify the update by fetching again
    const verifiedUser = await client.fetch(`*[_type == "user" && _id == $userId][0]`, { userId });
    
    console.log('Verification:');
    console.log(`Username: ${verifiedUser.username || verifiedUser.email}`);
    console.log(`Current points in Sanity: ${verifiedUser.points}`);
    
    if (verifiedUser.points === correctPoints) {
      console.log('✅ Points updated successfully!');
    } else {
      console.log('❌ Points update verification failed!');
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the direct fix
fixPoints(); 