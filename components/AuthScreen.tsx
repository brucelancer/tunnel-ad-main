import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, ChevronLeft } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const toggleAuthMode = () => {
    // Reset form fields and errors
    setError('');
    
    // Animate transition
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: isLogin ? 1 : 0,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsLogin(!isLogin);
  };

  const handleAuth = async () => {
    setError('');
    setIsLoading(true);

    // Basic validation
    if (isLogin) {
      if (!email || !password) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }
    } else {
      if (!email || !password || !confirmPassword || !username) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }
    }

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      
      // Emit auth state change event
      DeviceEventEmitter.emit('AUTH_STATE_CHANGED', { isAuthenticated: true });
      onAuthenticated();
    }, 1500);
  };

  const renderInputField = (
    icon: React.ReactNode,
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    secureTextEntry: boolean = false,
    showPasswordToggle: boolean = false,
    togglePasswordVisibility: () => void = () => {}
  ) => (
    <View style={styles.inputContainer}>
      <View style={styles.iconContainer}>{icon}</View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#666"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
      {showPasswordToggle && (
        <Pressable style={styles.eyeIcon} onPress={togglePasswordVisibility}>
          {secureTextEntry ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
        </Pressable>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <LinearGradient
        colors={['#1A1A1A', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://i.imgur.com/6bFoQdh.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Tunnel</Text>
          <Text style={styles.tagline}>Connect, Share, Earn</Text>
        </View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -SCREEN_WIDTH * 0.1]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {isLogin 
              ? 'Sign in to continue your journey' 
              : 'Join our community and start earning'}
          </Text>

          {!isLogin && renderInputField(
            <User size={20} color="#0070F3" />,
            'Username',
            username,
            setUsername
          )}

          {renderInputField(
            <Mail size={20} color="#0070F3" />,
            'Email',
            email,
            setEmail
          )}

          {renderInputField(
            <Lock size={20} color="#0070F3" />,
            'Password',
            password,
            setPassword,
            !showPassword,
            true,
            () => setShowPassword(!showPassword)
          )}

          {!isLogin && renderInputField(
            <Lock size={20} color="#0070F3" />,
            'Confirm Password',
            confirmPassword,
            setConfirmPassword,
            !showConfirmPassword,
            true,
            () => setShowConfirmPassword(!showConfirmPassword)
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.authButton, isLoading && styles.authButtonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#0070F3', '#00DFD8']}
              style={styles.authButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.authButtonText}>
                {isLogin ? 'Sign In' : 'Sign Up'}
              </Text>
              <ArrowRight size={20} color="white" />
            </LinearGradient>
          </Pressable>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={styles.switchButton}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {isLogin && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    color: 'white',
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  tagline: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    padding: 16,
  },
  eyeIcon: {
    padding: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  authButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 24,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  authButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  switchText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  switchButton: {
    color: '#0070F3',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#0070F3',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  footerLink: {
    color: '#0070F3',
    fontFamily: 'Inter_500Medium',
  },
}); 