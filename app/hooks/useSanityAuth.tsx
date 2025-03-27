import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as sanityAuthService from '../../tunnel-ad-main/services/sanityAuthService';
import { createClient } from '@sanity/client';
import { DeviceEventEmitter } from 'react-native';

// Define user interface locally
interface SanityUser {
  _id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  points: number;
  profile?: {
    bio?: string;
    avatar?: any;
    interests?: string[];
  };
  createdAt?: string;
  badges?: any[];
  rank?: string;
  likesGiven?: number;
  daysActive?: number;
}

export const useSanityAuth = () => {
  const [authSettings, setAuthSettings] = useState(null);
  const [user, setUser] = useState<SanityUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Sanity client directly in the component
  const sanityClient = createClient({
    projectId: '21is7976',
    dataset: 'production',
    apiVersion: '2023-03-01',
    token: 'skfYBXlqcVRszR6D3U2X3hPAMKupissIjK6LehFgtmYRkavBwU49tXYqryhOliJ7mclzM38VivW4vz75T6edrwsmwGPwgFEHxgANwxVnFNDFBq9pWjLhSd6dfB4yJNbVbgfkKlkocZ1VgYpd2ldczW64WNhqiTkclddkAxaTinVBhF9NMme0', // Replace with your actual token
    useCdn: false
  });

  // Load auth settings on mount
  useEffect(() => {
    loadAuthSettings();
    checkUserSession();
    
    // Add listener for auth state changes
    const subscription = DeviceEventEmitter.addListener('AUTH_STATE_CHANGED', (event) => {
      console.log('useSanityAuth received AUTH_STATE_CHANGED event:', event);
      
      // If user data is included in the event, update the user state
      if (event?.userData) {
        console.log('Updating user state with new user data:', event.userData);
        setUser(event.userData);
      } else if (event?.isAuthenticated === false) {
        // If isAuthenticated is false, clear the user state
        setUser(null);
      }
    });
    
    // Cleanup subscription on unmount
    return () => {
      subscription.remove();
    };
  }, []);

  // Load auth settings from Sanity
  const loadAuthSettings = async () => {
    try {
      const settings = await sanityAuthService.getAuthSettings();
      setAuthSettings(settings);
    } catch (err) {
      console.error('Error loading auth settings:', err);
      setError('Error loading auth settings');
    }
  };

  // Check for existing user session
  const checkUserSession = async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      console.log('Checking AsyncStorage for user data, found:', userString ? 'user data' : 'no data');
      
      if (userString) {
        try {
          const userData = JSON.parse(userString);
          console.log('Parsed user data from AsyncStorage:', userData);
          
          // Validate user data
          if (!userData._id) {
            console.warn('User data missing _id, may be invalid');
          }
          
          // Ensure the user has a profile property
          if (!userData.profile) {
            console.log('Adding missing profile to user data');
            userData.profile = {
              avatar: null,
              bio: '',
              interests: []
            };
          }
          
          // Set user state
          setUser(userData);
          console.log('User session restored from AsyncStorage');
        } catch (parseError) {
          console.error('Failed to parse user data from AsyncStorage:', parseError);
          // Clear invalid data
          await AsyncStorage.removeItem('user');
        }
      }
    } catch (err) {
      console.error('Error checking user session:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load user from storage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('useSanityAuth: Loading user from AsyncStorage...');
        const userString = await AsyncStorage.getItem('sanity_user');
        if (userString) {
          console.log('useSanityAuth: Found user data in AsyncStorage');
          const userData = JSON.parse(userString);
          setUser(userData);
          
          // Emit an event to ensure all components are in sync
          console.log('useSanityAuth: Emitting AUTH_STATE_CHANGED on initial load');
          DeviceEventEmitter.emit('AUTH_STATE_CHANGED', {
            isAuthenticated: true,
            userData: userData
          });
        } else {
          console.log('useSanityAuth: No user data found in AsyncStorage');
          setUser(null);
          
          // Emit an event to ensure all components know there's no authenticated user
          DeviceEventEmitter.emit('AUTH_STATE_CHANGED', {
            isAuthenticated: false,
            userData: null
          });
        }
      } catch (err) {
        console.error('Error loading user from storage:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('useSanityAuth: Attempting login with:', email);
      const userData = await sanityAuthService.loginUser(email, password);
      
      if (userData) {
        console.log('useSanityAuth: Login successful, setting user data');
        setUser(userData);
        
        // Save user to storage
        await AsyncStorage.setItem('sanity_user', JSON.stringify(userData));
        
        // Emit event to notify all components about authentication state change
        DeviceEventEmitter.emit('AUTH_STATE_CHANGED', {
          isAuthenticated: true,
          userData: userData
        });
        
        return userData;
      }
    } catch (err: any) {
      console.error('useSanityAuth: Login error:', err.message);
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login with demo account
  const loginWithDemo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Create a demo user object with all required fields
      const demoUser = {
        _id: 'demo-user',
        email: 'demo@example.com',
        username: 'demouser',
        firstName: 'Demo',
        lastName: 'User',
        phone: '555-123-4567',
        location: 'Demo City',
        points: 250,
        profile: {
          avatar: null, // No avatar for demo user
          bio: 'This is a demo account',
          interests: ['tech', 'travel']
        },
        createdAt: new Date().toISOString()
      };
      
      console.log('Demo login successful, user data:', demoUser);
      
      setUser(demoUser);
      await AsyncStorage.setItem('user', JSON.stringify(demoUser));
      return demoUser;
    } catch (err) {
      console.error('Demo login error:', err);
      setError(err.message || 'Demo login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login/signup with Google
  const googleLogin = async (googleUserData: {
    email: string;
    displayName?: string;
    photoURL?: string | null;
    uid?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Attempting Google login with data:', googleUserData);
      
      // Call the sanityAuthService to create or update the user
      const userData = await sanityAuthService.googleAuth(googleUserData);
      
      if (!userData || !userData._id) {
        throw new Error('Failed to get valid user data from Google authentication');
      }
      
      console.log('Google login successful, user data:', userData);
      
      // Make sure the user data is properly structured
      // Add profile object if it doesn't exist (should already be handled by sanityAuthService)
      if (!userData.profile) {
        userData.profile = {
          avatar: googleUserData.photoURL || null,
          bio: '',
          interests: []
        };
      }
      
      // Update state and storage
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      // Emit auth state change event
      DeviceEventEmitter.emit('AUTH_STATE_CHANGED', { 
        isAuthenticated: true,
        userData: userData
      });
      
      return userData;
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Google login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // User registration
  const signup = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const newUser = await sanityAuthService.registerUser(userData);
      setUser(newUser);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    } catch (err) {
      setError(err.message || 'Signup failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Request password reset
  const forgotPassword = async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      await sanityAuthService.requestPasswordReset(email);
      return true;
    } catch (err) {
      // We don't want to expose if an email exists or not for security
      console.error('Password reset request error:', err);
      return true; // Return true even on error for security
    } finally {
      setLoading(false);
    }
  };

  // Reset password with token
  const resetPassword = async (token, newPassword) => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await sanityAuthService.resetPassword(token, newPassword);
      return success;
    } catch (err) {
      setError(err.message || 'Password reset failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      console.log('useSanityAuth: Logging out user');
      await AsyncStorage.removeItem('sanity_user');
      setUser(null);
      
      // Emit event to notify all components about authentication state change
      DeviceEventEmitter.emit('AUTH_STATE_CHANGED', {
        isAuthenticated: false,
        userData: null
      });
      
      console.log('useSanityAuth: Logout complete');
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  return {
    user,
    loading,
    error,
    authSettings,
    login,
    googleLogin,
    loginWithDemo,
    signup,
    forgotPassword,
    resetPassword,
    logout,
    isAuthenticated: !!user
  };
}; 