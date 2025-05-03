import { createClient } from '@sanity/client';
import { NextRequest, NextResponse } from 'next/server';

// Read environment variables
const projectId = process.env.SANITY_PROJECT_ID || '21is7976';
const dataset = process.env.SANITY_DATASET || 'production';
const token = process.env.SANITY_API_TOKEN || 'skfYBXlqcVRszR6D3U2X3hPAMKupissIjK6LehFgtmYRkavBwU49tXYqryhOliJ7mclzM38VivW4vz75T6edrwsmwGPwgFEHxgANwxVnFNDFBq9pWjLhSd6dfB4yJNbVbgfkKlkocZ1VgYpd2ldczW64WNhqiTkclddkAxaTinVBhF9NMme0';

// Initialize the client with token
const client = createClient({
  projectId,
  dataset,
  useCdn: false, 
  apiVersion: '2023-03-01',
  token
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Fetch user data
    const userData = await client.fetch(`*[_type == "user" && _id == $userId][0]`, { userId });
    
    if (!userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      user: {
        _id: userData._id,
        username: userData.username,
        points: userData.points,
        hasPointsHistory: !!userData.pointsHistory,
        pointsHistoryCount: userData.pointsHistory?.length || 0
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error fetching user data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, points } = body;
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Check if user exists
    const userData = await client.fetch(`*[_type == "user" && _id == $userId][0]`, { userId });
    
    if (!userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get user's current points
    const currentPoints = userData.points || 0;
    console.log(`Current points: ${currentPoints}, Adding: ${points || 10}`);
    
    // Update user's points directly
    const updatedUser = await client.patch(userId)
      .set({ points: (points !== undefined ? points : currentPoints + 10) })
      .commit();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Points updated successfully',
      updatedUser: {
        _id: updatedUser._id,
        rev: updatedUser._rev,
        previousPoints: currentPoints,
        newPoints: points !== undefined ? points : currentPoints + 10
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error updating user points:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: JSON.stringify(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 