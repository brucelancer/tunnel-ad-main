import { useState, useEffect } from 'react';
import { loginUser, registerUser, requestPasswordReset, getAuthSettings } from '@/tunnel-ad-main/services/sanityAuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// User type definition
interface SanityUser {
  _id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  points: number;
  phone?: string;
  location?: string;
  isBlueVerified?: boolean;
  profile?: {
    bio?: string;
    avatar?: any;
    interests?: string[];
  };
}

export const useSanityAuth = () => {
  const [user, setUser] = useState<SanityUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authSettings, setAuthSettings] = useState<any>(null);

  // Load user from storage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userString = await AsyncStorage.getItem('sanity_user');
        if (userString) {
          const userData = JSON.parse(userString);
          // Ensure isBlueVerified is preserved when loading from storage
          setUser({
            ...userData,
            isBlueVerified: userData.isBlueVerified || false
          });
        }
        
        // Fetch auth settings
        const settings = await getAuthSettings();
        setAuthSettings(settings);
      } catch (err) {
        console.error('Error loading user from storage:', err);
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
      
      const userData = await loginUser(email, password);
      
      if (userData) {
        setUser(userData);
        // Save user to storage
        await AsyncStorage.setItem('sanity_user', JSON.stringify(userData));
        return userData;
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const newUser = await registerUser(userData);
      
      if (newUser) {
        setUser(newUser);
        // Save user to storage
        await AsyncStorage.setItem('sanity_user', JSON.stringify(newUser));
        return newUser;
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Forgot password function
  const forgotPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await requestPasswordReset(email);
      return result;
    } catch (err: any) {
      setError(err.message || 'Password reset request failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('sanity_user');
      setUser(null);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  // Update user data
  const updateUserData = async (updatedUser: SanityUser) => {
    try {
      setUser(updatedUser);
      await AsyncStorage.setItem('sanity_user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Error updating user data:', err);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUserData,
    forgotPassword,
    authSettings
  };
}; 