import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MessageSquare,
  Plus,
  X,
  Search,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FloatingActionButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<{ cancel: () => void } | null>(null);

  // Animation when opening/closing the menu
  useEffect(() => {
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(menuAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();

    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.cancel();
      animationRef.current = null;
    }

    // Reset scale always
    scaleAnim.setValue(1);

    // Only run pulsing animation when button is active/open
    if (isOpen) {
      const pulseAnimation = () => {
        // Store animation reference so we can cancel it later
        const animation = Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]);
        
        // Create cancel function
        animationRef.current = {
          cancel: () => {
            animation.stop();
            scaleAnim.setValue(1);
          }
        };
        
        // Start animation with callback
        animation.start(() => {
          // Only continue if still open and animation wasn't cancelled
          if (isOpen && animationRef.current) {
            pulseAnimation();
          }
        });
      };
      
      pulseAnimation();
    }

    return () => {
      // Clean up animation on unmount
      if (animationRef.current) {
        animationRef.current.cancel();
        animationRef.current = null;
      }
    };
  }, [isOpen]);

  // Listen for chat notifications
  useEffect(() => {
    // Simulating getting notification count from a service
    // In a real app, this would come from your chat/notification service
    const getMessageCount = () => {
      // This is where you would fetch the actual count from your API
      // For demo purposes, we'll use a random number between 0 and 5
      const count = Math.floor(Math.random() * 6);
      setMessageCount(count);
    };
    
    // Initial check
    getMessageCount();
    
    // Set up a listener for new messages
    const subscription = Dimensions.addEventListener('change', getMessageCount);
    
    return () => {
      subscription.remove();
    };
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const navigateToChat = () => {
    setIsOpen(false);
    router.push("/conversations" as any);
    // Clear message count when navigating to chat
    setMessageCount(0);
  };

  const navigateToSearch = () => {
    setIsOpen(false);
    router.push("/search" as any);
  };

  const navigateToCreatePost = () => {
    setIsOpen(false);
    router.push("/newsfeed-upload" as any);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  const translateY = (index: number) => {
    // Calculate position in a circle pattern
    const radius = 80; // Radius of the circle
    const angle = (Math.PI / 2) + (index * (Math.PI / 3)); // Distribute items in a semi-circle (adjusted angle for 3 items)
    
    const x = radius * Math.cos(angle);
    const y = -radius * Math.sin(angle); // Negative to go upward
    
    return {
      x: menuAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, x]
      }),
      y: menuAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, y]
      })
    };
  };

  const opacity = menuAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 0.7, 1]
  });

  const renderActionButton = (
    icon: React.ReactNode,
    onPress: () => void,
    index: number,
    badgeCount?: number
  ) => {
    const position = translateY(index);
    
    return (
      <Animated.View
        style={[
          styles.menuItemContainer,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y }
            ],
            opacity: opacity,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.menuItem}
          onPress={onPress}
          activeOpacity={0.8}
        >
          {icon}
          {(badgeCount ?? 0) > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {isOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={toggleMenu}
        />
      )}

      {renderActionButton(
        <Search color="#FFFFFF" size={22} />,
        navigateToSearch,
        2
      )}

      {renderActionButton(
        <MessageSquare color="#FFFFFF" size={22} />,
        navigateToChat,
        1,
        messageCount
      )}

      {renderActionButton(
        <Plus color="#FFFFFF" size={22} />,
        navigateToCreatePost,
        0
      )}

      <Animated.View
        style={[
          styles.mainButtonContainer,
          {
            transform: [
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.mainButton,
            !isOpen && styles.mainButtonInactive
          ]}
          onPress={toggleMenu}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            {isOpen ? (
              <X color="#FFFFFF" size={24} />
            ) : (
              <Plus color="#FFFFFF" size={24} />
            )}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    alignItems: 'center',
    zIndex: 999,
  },
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 0,
  },
  mainButtonContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  mainButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButtonInactive: {
    backgroundColor: 'rgba(24, 119, 242, 0.5)', // Semi-transparent blue
  },
  menuItemContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
}); 