// Direct fix script for tunnel user's points
// This script will set the points for the user "tunnel" to 879

const fetch = require('node-fetch');

async function directFix() {
  try {
    // User ID for tunnel user (from the URL in the screenshot)
    const userId = "MBs86ihGgxetNe5QowItmT";
    const correctPoints = 879;
    
    console.log(`Starting direct fix for user ${userId}`);
    console.log(`Setting points to ${correctPoints}`);
    
    // Get current points first
    const getResponse = await fetch(`http://localhost:3333/api/debug-user?userId=${userId}`);
    const userData = await getResponse.json();
    
    if (!userData.success) {
      console.error('Error fetching user data:', userData.error);
      process.exit(1);
    }
    
    console.log(`Current points in Sanity: ${userData.user.points}`);
    
    // Update to correct points
    const updateResponse = await fetch('http://localhost:3333/api/debug-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        points: correctPoints
      })
    });
    
    const updateData = await updateResponse.json();
    
    if (!updateData.success) {
      console.error('Error updating points:', updateData.error);
      process.exit(1);
    }
    
    console.log('Points updated successfully!');
    console.log(`Previous points: ${updateData.updatedUser.previousPoints}`);
    console.log(`New points: ${updateData.updatedUser.newPoints}`);
    
    // Verify the update
    const verifyResponse = await fetch(`http://localhost:3333/api/debug-user?userId=${userId}`);
    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      console.log(`Verified points in Sanity: ${verifyData.user.points}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the direct fix
directFix(); 