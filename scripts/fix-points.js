// Script to fix points discrepancy between app and Sanity
// Usage: node fix-points.js <userId> <correctPoints>

const fetch = require('node-fetch');

async function fixPoints(userId, correctPoints) {
  if (!userId) {
    console.error('Error: User ID is required');
    console.log('Usage: node fix-points.js <userId> <correctPoints>');
    process.exit(1);
  }

  if (!correctPoints || isNaN(correctPoints)) {
    console.error('Error: Correct points value is required and must be a number');
    console.log('Usage: node fix-points.js <userId> <correctPoints>');
    process.exit(1);
  }

  try {
    console.log(`Fetching current points for user ${userId}...`);
    
    // First get the current points
    const getResponse = await fetch(`http://localhost:3333/api/debug-user?userId=${userId}`);
    const getCurrentData = await getResponse.json();
    
    if (!getCurrentData.success) {
      console.error('Error fetching user data:', getCurrentData.error);
      process.exit(1);
    }
    
    console.log(`Current points in Sanity: ${getCurrentData.user.points}`);
    console.log(`Target points to set: ${correctPoints}`);
    
    // Now update the points to the correct value
    const updateResponse = await fetch('http://localhost:3333/api/debug-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        points: parseInt(correctPoints)
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

// Get command line arguments
const userId = process.argv[2];
const correctPoints = process.argv[3];

fixPoints(userId, correctPoints); 