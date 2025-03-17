import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PointsContextType {
  totalPoints: number;
  earnedVideoIds: string[];
  addPoints: (videoId: string, points: number) => Promise<void>;
  hasEarnedPoints: (videoId: string) => boolean;
}

const PointsContext = createContext<PointsContextType | undefined>(undefined);

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
};

export const PointsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [earnedVideoIds, setEarnedVideoIds] = useState<string[]>([]);

  // Load saved points and earned video IDs on startup
  useEffect(() => {
    const loadSavedPoints = async () => {
      try {
        const savedPoints = await AsyncStorage.getItem('totalPoints');
        const savedVideoIds = await AsyncStorage.getItem('earnedVideoIds');
        
        if (savedPoints) {
          setTotalPoints(parseInt(savedPoints, 10));
        }
        if (savedVideoIds) {
          setEarnedVideoIds(JSON.parse(savedVideoIds));
        }
      } catch (error) {
        console.error('Error loading saved points:', error);
      }
    };

    loadSavedPoints();
  }, []);

  const addPoints = async (videoId: string, points: number) => {
    if (!earnedVideoIds.includes(videoId)) {
      const newTotal = totalPoints + points;
      const newEarnedIds = [...earnedVideoIds, videoId];

      try {
        await AsyncStorage.setItem('totalPoints', newTotal.toString());
        await AsyncStorage.setItem('earnedVideoIds', JSON.stringify(newEarnedIds));
        
        setTotalPoints(newTotal);
        setEarnedVideoIds(newEarnedIds);
      } catch (error) {
        console.error('Error saving points:', error);
      }
    }
  };

  const hasEarnedPoints = (videoId: string) => {
    return earnedVideoIds.includes(videoId);
  };

  return (
    <PointsContext.Provider value={{ totalPoints, earnedVideoIds, addPoints, hasEarnedPoints }}>
      {children}
    </PointsContext.Provider>
  );
}; 