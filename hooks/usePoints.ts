import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const POINTS_UPDATED = 'POINTS_UPDATED';

interface DailyPoints {
  date: string;
  points: number;
}

export const usePoints = () => {
  const [points, setPoints] = useState(0);
  const [watchedVideos, setWatchedVideos] = useState<string[]>([]);
  const [dailyPoints, setDailyPoints] = useState<DailyPoints[]>([]);

  const loadPoints = useCallback(async () => {
    try {
      const [savedPoints, savedWatchedVideos, savedDailyPoints] = await Promise.all([
        AsyncStorage.getItem('userPoints'),
        AsyncStorage.getItem('watchedVideos'),
        AsyncStorage.getItem('dailyPoints')
      ]);
      
      if (savedPoints) {
        setPoints(parseInt(savedPoints, 10));
      }
      if (savedWatchedVideos) {
        setWatchedVideos(JSON.parse(savedWatchedVideos));
      }
      if (savedDailyPoints) {
        setDailyPoints(JSON.parse(savedDailyPoints));
      } else {
        // Initialize with past 7 days if no data
        const initialDailyPoints = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            date: date.toISOString().split('T')[0],
            points: 0
          };
        });
        await AsyncStorage.setItem('dailyPoints', JSON.stringify(initialDailyPoints));
        setDailyPoints(initialDailyPoints);
      }
    } catch (error) {
      console.error('Error loading points:', error);
    }
  }, []);

  const updateDailyPoints = useCallback(async (earnedPoints: number) => {
    const today = new Date().toISOString().split('T')[0];
    let updatedDailyPoints = [...dailyPoints];
    
    const todayIndex = updatedDailyPoints.findIndex(day => day.date === today);
    
    if (todayIndex >= 0) {
      // Update today's points
      updatedDailyPoints[todayIndex].points += earnedPoints;
    } else {
      // Add new day and remove oldest if more than 7 days
      updatedDailyPoints.push({ date: today, points: earnedPoints });
      if (updatedDailyPoints.length > 7) {
        updatedDailyPoints = updatedDailyPoints.slice(-7);
      }
    }

    await AsyncStorage.setItem('dailyPoints', JSON.stringify(updatedDailyPoints));
    setDailyPoints(updatedDailyPoints);
  }, [dailyPoints]);

  const resetPoints = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('userPoints'),
        AsyncStorage.removeItem('watchedVideos'),
        AsyncStorage.removeItem('dailyPoints')
      ]);
      setPoints(0);
      setWatchedVideos([]);
      setDailyPoints([]);
      // Emit reset event before loading points
      DeviceEventEmitter.emit(POINTS_UPDATED, { type: 'reset' });
      // Load points after reset to ensure all components update
      await loadPoints();
    } catch (error) {
      console.error('Error resetting points:', error);
    }
  }, [loadPoints]);

  useEffect(() => {
    loadPoints();
    
    // Listen for points updates
    const subscription = DeviceEventEmitter.addListener(POINTS_UPDATED, (event) => {
      if (event?.type === 'reset') {
        // Reload points after reset
        loadPoints();
      } else if (event?.type === 'earned') {
        // Reload points after earning
        loadPoints();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [loadPoints]);

  const addPoints = useCallback(async (amount: number, videoId: string) => {
    try {
      // Check if video was already watched
      if (watchedVideos.includes(videoId)) {
        return false;
      }

      const newPoints = points + amount;
      const newWatchedVideos = [...watchedVideos, videoId];

      await Promise.all([
        AsyncStorage.setItem('userPoints', newPoints.toString()),
        AsyncStorage.setItem('watchedVideos', JSON.stringify(newWatchedVideos)),
        updateDailyPoints(amount)
      ]);

      setPoints(newPoints);
      setWatchedVideos(newWatchedVideos);
      
      // Emit points earned event
      DeviceEventEmitter.emit(POINTS_UPDATED, { type: 'earned' });
      return true;
    } catch (error) {
      console.error('Error saving points:', error);
      return false;
    }
  }, [points, watchedVideos, updateDailyPoints]);

  const hasWatchedVideo = useCallback((videoId: string) => {
    return watchedVideos.includes(videoId);
  }, [watchedVideos]);

  return { points, addPoints, loadPoints, hasWatchedVideo, resetPoints, dailyPoints };
}; 