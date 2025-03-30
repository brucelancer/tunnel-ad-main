import sanityClient from '@sanity/client'
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
  useCdn: false, // set to `false` for authentication operations
  apiVersion: '2023-03-01', // Use a more recent API version
  token
})

// Helper for image URLs
const builder = imageUrlBuilder(client)
export const urlFor = (source) => {
  return builder.image(source)
}

// Function to upload an image to Sanity
const uploadImageToSanity = async (imageUri) => {
  console.log('Uploading image to Sanity:', imageUri.substring(0, 30) + '...');
  
  try {
    // Convert the URI to a Blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Get file extension from URI or default to jpg
    const extension = (imageUri.match(/\.([^.]+)$/) || [])[1] || 'jpg';
    const filename = `profile-image-${Date.now()}.${extension}`;
    
    // Create a file from the blob
    const imageFile = new File([blob], filename, { type: `image/${extension}` });
    
    // Upload the file to Sanity
    const asset = await client.assets.upload('image', imageFile);
    
    console.log('Image uploaded successfully, asset ID:', asset._id);
    
    // Return the asset reference that Sanity expects
    return {
      _type: 'image',
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

// Get Authentication Settings
export const getAuthSettings = async () => {
  try {
    // Fetch single authSettings document
    return await client.fetch(`*[_type == "authSettings"][0]{
      loginScreen,
      signupScreen,
      forgotPasswordScreen,
      passwordRequirements,
      branding
    }`)
  } catch (error) {
    console.error('Error fetching auth settings:', error)
    throw error
  }
}

// User Registration
export const registerUser = async (userData) => {
  try {
    // Check if user already exists
    const existingUser = await client.fetch(`*[_type == "user" && email == $email][0]`, {
      email: userData.email
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const existingUsername = await client.fetch(`*[_type == "user" && username == $username][0]`, {
      username: userData.username
    });

    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Create new user document
    
    // In a real app, we would hash the password here
    const newUser = {
      _type: 'user',
      email: userData.email,
      username: userData.username,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      phone: userData.phone || '',
      location: userData.location || '',
      // Store password directly (not secure for production)
      password: userData.password,
      createdAt: new Date().toISOString(),
      points: 0,
      profile: {
        bio: userData.bio || '',
        avatar: userData.avatar || null,
        interests: userData.interests || []
      }
    };

    // Create the user in Sanity
    const createdUser = await client.create(newUser);
    
    // Return the new user object without sensitive info
    return {
      _id: createdUser._id,
      email: createdUser.email,
      username: createdUser.username,
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
      phone: createdUser.phone,
      location: createdUser.location,
      points: createdUser.points,
      isBlueVerified: createdUser.isBlueVerified || false,
      profile: createdUser.profile
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// User Login
export const loginUser = async (email, password) => {
  try {
    console.log('Attempting login with:', email);
    
    // Find user with matching email
    const user = await client.fetch(`*[_type == "user" && email == $email][0]{
      _id,
      email,
      username,
      firstName,
      lastName,
      phone,
      location,
      points,
      isBlueVerified,
      password,
      profile,
      createdAt
    }`, {
      email
    });

    console.log('User found:', user ? 'Yes' : 'No');

    // Check if user exists
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Special case: User exists but has no password set (created directly in Sanity)
    if (!user.password || user.password === '') {
      console.log('User exists but has no password set');
      throw new Error('User account exists but no password set');
    }

    // Verify password
    if (user.password !== password) {
      console.log('Password mismatch');
      throw new Error('Invalid email or password');
    }
    
    console.log('Login successful');
    
    // Successful login - return user data without sensitive info
    // Explicitly include isBlueVerified property with default false
    const userData = {
      _id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      location: user.location || '',
      points: user.points || 0,
      isBlueVerified: user.isBlueVerified || false,
      profile: user.profile || {},
      createdAt: user.createdAt
    };
    
    console.log('User data with isBlueVerified:', userData.isBlueVerified);
    
    return userData;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Password Reset Request
export const requestPasswordReset = async (email) => {
  try {
    // Find user with email
    const user = await client.fetch(`*[_type == "user" && email == $email][0]._id`, {
      email
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Generate random token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    // Set expiration time (1 hour from now)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString()

    // Create password reset document
    const resetRequest = {
      _type: 'passwordReset',
      email,
      token,
      createdAt: now.toISOString(),
      expiresAt,
      isUsed: false,
      user: {
        _type: 'reference',
        _ref: user
      }
    }

    // Store reset request
    await client.create(resetRequest)

    // In a real app, you would send an email with the reset link
    return { success: true, message: 'Password reset link sent' }
  } catch (error) {
    console.error('Error requesting password reset:', error)
    throw error
  }
}

// Reset Password
export const resetPassword = async (token, newPassword) => {
  try {
    // Find valid token
    const resetRequest = await client.fetch(`*[_type == "passwordReset" && token == $token && isUsed == false && expiresAt > now()][0]{
      _id,
      user->{_id}
    }`, {
      token
    })

    if (!resetRequest) {
      throw new Error('Invalid or expired token')
    }

    // In a real app, you would update the user's password in a secure way
    // Here we just mark the token as used

    // Mark token as used
    await client.patch(resetRequest._id).set({
      isUsed: true,
      usedAt: new Date().toISOString()
    }).commit()

    return { success: true, message: 'Password has been reset' }
  } catch (error) {
    console.error('Error resetting password:', error)
    throw error
  }
}

// Google Auth
export const googleAuth = async (googleUserData) => {
  try {
    console.log('Authenticating with Google data:', googleUserData);
    
    // Check if user with email exists
    let user = await client.fetch(`*[_type == "user" && email == $email][0]{
      _id,
      username,
      email,
      firstName,
      lastName,
      phone,
      location,
      points,
      isBlueVerified,
      profile,
      createdAt,
      updatedAt,
      needsPasswordReset
    }`, {
      email: googleUserData.email
    });

    if (user) {
      console.log('Found existing user with email:', googleUserData.email);
      
      // Prepare update object
      const updateObj = {
        updatedAt: new Date().toISOString(),
        loginMethod: 'google'
      };
      
      // Update names if not already set
      if (!user.firstName && googleUserData.displayName) {
        updateObj.firstName = googleUserData.displayName.split(' ')[0] || '';
        updateObj.lastName = googleUserData.displayName.split(' ').slice(1).join(' ') || '';
      }
      
      // Ensure profile object exists
      if (!user.profile) {
        updateObj.profile = {
          bio: '',
          interests: []
        };
        
        // Add Google photo if available
        if (googleUserData.photoURL) {
          updateObj.profile.avatar = googleUserData.photoURL;
        }
      }
      
      // Update user
      console.log('Updating user with Google data:', updateObj);
      await client.patch(user._id).set(updateObj).commit();
      
      // Fetch the updated user
      user = await client.fetch(`*[_type == "user" && _id == $id][0]{
        _id,
        email,
        username,
        firstName,
        lastName,
        phone,
        location,
        points,
        isBlueVerified,
        profile,
        createdAt,
        updatedAt,
        needsPasswordReset
      }`, {
        id: user._id
      });
    } else {
      console.log('Creating new user from Google data');
      
      // Create new user from Google data
      const doc = {
        _type: 'user',
        email: googleUserData.email,
        username: googleUserData.email.split('@')[0], // Generate username from email
        firstName: googleUserData.displayName?.split(' ')[0] || '',
        lastName: googleUserData.displayName?.split(' ').slice(1).join(' ') || '',
        loginMethod: 'google',
        points: 0,
        profile: {
          bio: '',
          interests: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add Google photo if available
      if (googleUserData.photoURL) {
        doc.profile.avatar = googleUserData.photoURL;
      }

      // Create user in Sanity
      user = await client.create(doc);
      console.log('Created new user with ID:', user._id);
    }

    // Return sanitized user data without sensitive information
    return {
      _id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      location: user.location || '',
      points: user.points || 0,
      isBlueVerified: user.isBlueVerified || false,
      profile: {
        bio: user.profile?.bio || '',
        interests: user.profile?.interests || [],
        avatar: user.profile?.avatar || null
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      needsPasswordReset: user.needsPasswordReset || false
    };
  } catch (error) {
    console.error('Error with Google auth:', error);
    throw error;
  }
}

// Find User by Email (without password validation)
export const findUserByEmail = async (email) => {
  try {
    console.log('Searching for user by email:', email);
    
    // Find user with matching email
    const user = await client.fetch(`*[_type == "user" && email == $email][0]`, {
      email
    });

    console.log('User found:', user ? 'Yes' : 'No');

    // Check if user exists
    if (!user) {
      throw new Error('User not found');
    }
    
    // Determine if this user needs to set a password
    const hasPassword = user.password && user.password !== '';
    const needsPasswordReset = !hasPassword;
    
    console.log('User password status - Has password:', hasPassword, 'Needs reset:', needsPasswordReset);
    
    // If user has a password, they shouldn't use this method to login
    if (hasPassword) {
      console.log('This user has a password and should use normal login');
    }
    
    // Return user data without sensitive info, but with a flag indicating this user needs to set a password
    return {
      _id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      location: user.location || '',
      points: user.points || 0,
      profile: user.profile || {},
      createdAt: user.createdAt,
      // Add a flag to indicate this user needs to set a password
      needsPasswordReset: needsPasswordReset
    };
  } catch (error) {
    console.error('Find user by email error:', error);
    throw error;
  }
}

// Update User Profile
export const updateUserProfile = async (userId, userData, imageAsset = null) => {
  try {
    console.log('Updating user profile for ID:', userId);

    // If there's an image to upload, process it first
    let profileImageUpdate = {};
    if (imageAsset) {
      console.log('Processing image for upload');
      
      try {
        let imageRef = null;
        
        // Detect if it's a base64 string or a URI
        if (imageAsset.startsWith('data:image')) {
          console.log('Image is a base64 string');
          // Convert base64 to blob and upload to Sanity
          imageRef = await uploadImageToSanity(imageAsset);
        } else if (imageAsset.startsWith('file:') || imageAsset.startsWith('http')) {
          console.log('Image is a URI:', imageAsset.substring(0, 30) + '...');
          // Upload file to Sanity from URI
          imageRef = await uploadImageToSanity(imageAsset);
        }
        
        if (imageRef) {
          // Set the image reference in the proper Sanity format
          profileImageUpdate = {
            "profile.avatar": imageRef
          };
          console.log('Image processed and uploaded successfully');
        }
      } catch (imageError) {
        console.error('Failed to process image:', imageError);
        // Continue with other updates even if image fails
      }
    }

    // Prepare update payload - only include properties that have values
    const updates = {
      ...(userData.firstName && { firstName: userData.firstName }),
      ...(userData.lastName && { lastName: userData.lastName }),
      ...(userData.email && { email: userData.email }),
      ...(userData.username && { username: userData.username }),
      ...(userData.phone && { phone: userData.phone }),
      ...(userData.location && { location: userData.location }),
      ...(userData.bio !== undefined && { "profile.bio": userData.bio }),
      ...(userData.interests && { "profile.interests": userData.interests }),
      updatedAt: new Date().toISOString(),
      ...profileImageUpdate
    };
    
    // Add password update if provided
    if (userData.password) {
      updates.password = userData.password;
      updates.needsPasswordReset = false;
    }

    console.log('Updating Sanity document with keys:', Object.keys(updates));
    
    // Update the user document in Sanity
    const updatedUser = await client.patch(userId)
      .set(updates)
      .commit();
    
    console.log('User updated in Sanity:', updatedUser._id);
    
    // Fetch the complete updated user to return
    const freshUser = await client.fetch(`*[_type == "user" && _id == $id][0]`, {
      id: updatedUser._id
    });
    
    // Return the updated user data without sensitive information
    return {
      _id: freshUser._id,
      email: freshUser.email,
      username: freshUser.username,
      firstName: freshUser.firstName || '',
      lastName: freshUser.lastName || '',
      phone: freshUser.phone || '',
      location: freshUser.location || '',
      points: freshUser.points || 0,
      profile: {
        bio: freshUser.profile?.bio || '',
        interests: freshUser.profile?.interests || [],
        avatar: freshUser.profile?.avatar || null
      },
      createdAt: freshUser.createdAt,
      updatedAt: freshUser.updatedAt,
      needsPasswordReset: freshUser.needsPasswordReset || false
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Export all functions
export default {
  getAuthSettings,
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
  googleAuth,
  urlFor,
  findUserByEmail,
  updateUserProfile
} 