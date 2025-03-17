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
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SignupScreenProps {
  onAuthenticated: () => void;
  onSwitchToLogin: () => void;
}

export default function SignupScreen({ onAuthenticated, onSwitchToLogin }: SignupScreenProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Start fade-in animation when component mounts
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSignup = async () => {
    setError('');
    setIsLoading(true);

    // Basic validation
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

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      
      // Emit auth state change event
      DeviceEventEmitter.emit('AUTH_STATE_CHANGED', { isAuthenticated: true });
      onAuthenticated();
    }, 1500);
  };

  const handleGoogleSignUp = () => {
    setIsLoading(true);
    
    // Simulate Google sign-up
    setTimeout(() => {
      setIsLoading(false);
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

  // Responsive styles
  const dynamicStyles = {
    logoSize: SCREEN_WIDTH < 380 ? 70 : SCREEN_WIDTH < 600 ? 90 : 110,
    titleSize: SCREEN_WIDTH < 380 ? 26 : SCREEN_WIDTH < 600 ? 30 : 34,
    subtitleSize: SCREEN_WIDTH < 380 ? 14 : SCREEN_WIDTH < 600 ? 16 : 18,
    buttonPadding: SCREEN_WIDTH < 380 ? 14 : SCREEN_WIDTH < 600 ? 18 : 22,
    contentPadding: SCREEN_WIDTH < 380 ? 20 : SCREEN_WIDTH < 600 ? 28 : 36,
    formWidth: SCREEN_WIDTH > 600 ? 500 : SCREEN_WIDTH * 0.9,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { fontSize: dynamicStyles.titleSize + 10 }]}>
                tunnel
              </Text>
              <Text style={[styles.headerSubtitle, { fontSize: dynamicStyles.subtitleSize }]}>
                Connect, Share, Earn
              </Text>
            </View>

            <View 
              style={[styles.formContainer, { padding: dynamicStyles.contentPadding, width: dynamicStyles.formWidth }]}
            >
              <Text style={[styles.title, { fontSize: dynamicStyles.titleSize }]}>
                Create Account
              </Text>
              <Text style={[styles.subtitle, { fontSize: dynamicStyles.subtitleSize }]}>
                Join our community and start earning
              </Text>

              {renderInputField(
                <User size={22} color="#0070F3" />,
                'Username',
                username,
                setUsername
              )}

              {renderInputField(
                <Mail size={22} color="#0070F3" />,
                'Email',
                email,
                setEmail
              )}

              {renderInputField(
                <Lock size={22} color="#0070F3" />,
                'Password',
                password,
                setPassword,
                !showPassword,
                true,
                () => setShowPassword(!showPassword)
              )}

              {renderInputField(
                <Lock size={22} color="#0070F3" />,
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
                onPress={handleSignup}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#0070F3', '#00DFD8']}
                  style={[styles.authButtonGradient, { padding: dynamicStyles.buttonPadding }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.authButtonText}>
                    Sign Up
                  </Text>
                  <ArrowRight size={22} color="white" />
                </LinearGradient>
              </Pressable>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <Pressable
                style={[styles.googleButton, isLoading && styles.authButtonDisabled]}
                onPress={handleGoogleSignUp}
                disabled={isLoading}
              >
                <View style={styles.googleButtonContent}>
                  <Image 
                    source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }} 
                    style={styles.googleIcon} 
                    resizeMode="contain"
                  />
                  <Text style={styles.googleButtonText}>Sign up with Google</Text>
                </View>
              </Pressable>

              <View style={styles.switchContainer}>
                <Text style={[styles.switchText, { fontSize: dynamicStyles.subtitleSize }]}>
                  Already have an account?
                </Text>
                <TouchableOpacity onPress={onSwitchToLogin}>
                  <Text style={[styles.switchButton, { fontSize: dynamicStyles.subtitleSize }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { fontSize: dynamicStyles.subtitleSize - 2 }]}>
                By continuing, you agree to our{' '}
                <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 100,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SCREEN_HEIGHT,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.05,
  },
  logo: {
    marginBottom: 16,
  },
  appName: {
    color: 'white',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    color: '#888',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    marginBottom: 24,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: 'white',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888',
    fontFamily: 'Inter_400Regular',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 60,
    overflow: 'hidden',
  },
  iconContainer: {
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    height: '100%',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: 'white',
    fontFamily: 'Inter_400Regular',
    padding: 16,
    height: '100%',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 16,
    height: '100%',
    justifyContent: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
    textAlign: 'center',
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
    gap: 8,
  },
  authButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: '#888',
    marginHorizontal: 10,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 4,
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 24,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  googleButtonText: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    letterSpacing: 0.25,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  switchText: {
    color: '#888',
    fontFamily: 'Inter_400Regular',
  },
  switchButton: {
    color: '#0070F3',
    fontFamily: 'Inter_600SemiBold',
  },
  footer: {
    marginTop: 30,
    marginBottom: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: SCREEN_WIDTH > 600 ? 500 : SCREEN_WIDTH * 0.9,
    paddingHorizontal: 20,
  },
  footerText: {
    color: '#666',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  footerLink: {
    color: '#0070F3',
    fontFamily: 'Inter_500Medium',
  },
  headerTextContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitle: {
    color: '#0070F3',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,112,243,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    color: '#888',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
}); 