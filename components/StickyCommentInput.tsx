import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Send, UserCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { urlFor } from '@/tunnel-ad-main/services/postService';

interface StickyCommentInputProps {
  user: any;
  commentText: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  autoFocus?: boolean;
}

const StickyCommentInput = ({
  user,
  commentText,
  onChangeText,
  onSubmit,
  autoFocus = false,
}: StickyCommentInputProps) => {
  const router = useRouter();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Add keyboard listeners to track keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      style={[
        styles.container,
        keyboardVisible && Platform.OS === 'android' && { position: 'relative' }
      ]}
    >
      <View style={styles.inputWrapper}>
        {user && user.profile?.avatar ? (
          <Image 
            source={{ uri: urlFor(user.profile.avatar).url() }} 
            style={styles.avatar} 
          />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <UserCircle size={18} color="#666" />
          </View>
        )}
        
        <TextInput
          style={styles.input}
          placeholder={user ? "Add a comment..." : "Login to comment..."}
          placeholderTextColor="#666"
          value={commentText}
          onChangeText={onChangeText}
          multiline
          autoFocus={autoFocus}
          editable={!!user}
        />
        
        {user ? (
          <Pressable 
            style={[
              styles.sendButton,
              !commentText.trim() && styles.sendButtonDisabled
            ]} 
            onPress={onSubmit}
            disabled={!commentText.trim()}
          >
            <Send size={20} color={commentText.trim() ? '#0070F3' : '#444'} />
          </Pressable>
        ) : (
          <Pressable 
            style={styles.loginButton}
            onPress={() => Alert.alert(
              "Authentication Required", 
              "You need to login to comment. Would you like to go to the login screen?",
              [
                {text: "Cancel", style: "cancel"},
                {text: "Login", onPress: () => router.push('/login' as any)}
              ]
            )}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 100,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    bottom: 12,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  placeholderAvatar: {
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    minHeight: 24,
    maxHeight: 100,
    padding: 0,
    marginLeft: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,112,243,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  loginButton: {
    backgroundColor: '#0070F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});

export default StickyCommentInput; 