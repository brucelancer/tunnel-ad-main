import { useEffect } from 'react';
import { Platform } from 'react-native';

// For React Native, we need a different approach as window is not available
// We'll create a no-op function since the frameworkReady concept is browser-specific

export function useFrameworkReady() {
  useEffect(() => {
    // This is a no-op in React Native
    // Add any React Native specific initialization if needed
    console.log('Framework ready called in React Native environment');
  }, []);
} 