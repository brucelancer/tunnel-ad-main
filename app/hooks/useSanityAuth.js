import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as sanityAuthService from '../../tunnel-ad-main/services/sanityAuthService';
import { createClient } from '@sanity/client';

export const useSanityAuth = () => {
  const [authSettings, setAuthSettings] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Sanity client directly in the component
  const sanityClient = createClient({
    projectId: '21is7976',
    dataset: 'production',
    apiVersion: '2023-03-01',
    token: 'skfYBXlqcVRszR6D3U2X3hPAMKupissIjK6LehFgtmYRkavBwU49tXYqryhOliJ7mclzM38VivW4vz75T6edrwsmwGPwgFEHxgANwxVnFNDFBq9pWjLhSd6dfB4yJNbVbgfkKlkocZ1VgYpd2ldczW64WNhqiTkclddkAxaTinVBhF9NMme0', // Replace with your actual token
    useCdn: false,
    permissions: ['read', 'write', 'create', 'delete', 'history']
  });

  // Load auth settings on mount
  useEffect(() => {
    loadAuthSettings();
    checkUserSession();
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
      if (userString) {
        const userData = JSON.parse(userString);
        setUser(userData);
      }
    } catch (err) {
      console.error('Error checking user session:', err);
    } finally {
      setLoading(false);
    }
  };

  // Login with email/password
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Login attempt with:', email);
      const userData = await sanityAuthService.loginUser(email, password);
      
      if (!userData || !userData._id) {
        throw new Error('Authentication failed');
      }
      
      console.log('Login successful, user data:', userData);
      
      // Ensure we have a user object with the correct structure
      const userToStore = userData.user || userData;
      setUser(userToStore);
      await AsyncStorage.setItem('user', JSON.stringify(userToStore));
      return userToStore;
    } catch (err) {
      console.error('Login error in hook:', err);
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login/signup with Google
  const googleLogin = async (googleUserData) => {
    setLoading(true);
    setError(null);
    
    try {
      const userData = await sanityAuthService.googleAuth(googleUserData);
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (err) {
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

  // User logout
  const logout = async () => {
    setLoading(true);
    
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
      return true;
    } catch (err) {
      setError('Logout failed');
      console.error('Logout error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    authSettings,
    login,
    googleLogin,
    signup,
    forgotPassword,
    resetPassword,
    logout,
    isAuthenticated: !!user
  };
}; 