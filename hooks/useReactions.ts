import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const REACTIONS_UPDATED = 'REACTIONS_UPDATED';

interface VideoReactions {
  [videoId: string]: {
    likes: number;
    dislikes: number;
    userAction: 'like' | 'dislike' | null;
  };
}

export const useReactions = () => {
  const [reactions, setReactions] = useState<VideoReactions>({});

  const loadReactions = useCallback(async () => {
    try {
      const savedReactions = await AsyncStorage.getItem('videoReactions');
      if (savedReactions) {
        setReactions(JSON.parse(savedReactions));
      }
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  }, []);

  const resetReactions = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('videoReactions');
      setReactions({});
      DeviceEventEmitter.emit(REACTIONS_UPDATED, { type: 'reset' });
    } catch (error) {
      console.error('Error resetting reactions:', error);
    }
  }, []);

  useEffect(() => {
    loadReactions();
    
    const subscription = DeviceEventEmitter.addListener(REACTIONS_UPDATED, (event) => {
      if (event?.type === 'reset') {
        loadReactions();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [loadReactions]);

  const getVideoReactions = useCallback((videoId: string) => {
    return reactions[videoId] || { likes: 0, dislikes: 0, userAction: null };
  }, [reactions]);

  const updateReaction = useCallback(async (
    videoId: string,
    action: 'like' | 'dislike' | null
  ) => {
    try {
      const currentReactions = { ...reactions };
      const videoReactions = currentReactions[videoId] || { likes: 0, dislikes: 0, userAction: null };
      const previousAction = videoReactions.userAction;

      // Remove previous reaction if exists
      if (previousAction === 'like') {
        videoReactions.likes = Math.max(0, videoReactions.likes - 1);
      } else if (previousAction === 'dislike') {
        videoReactions.dislikes = Math.max(0, videoReactions.dislikes - 1);
      }

      // Add new reaction
      if (action === 'like') {
        videoReactions.likes += 1;
      } else if (action === 'dislike') {
        videoReactions.dislikes += 1;
      }

      videoReactions.userAction = action;
      currentReactions[videoId] = videoReactions;

      // Save to storage first
      await AsyncStorage.setItem('videoReactions', JSON.stringify(currentReactions));
      // Update state
      setReactions(currentReactions);
      // Emit event after successful save
      DeviceEventEmitter.emit(REACTIONS_UPDATED, { type: 'update', videoId });
      
      return true;
    } catch (error) {
      console.error('Error updating reaction:', error);
      return false;
    }
  }, [reactions]);

  return {
    getVideoReactions,
    updateReaction,
    resetReactions,
    loadReactions,
  };
}; 