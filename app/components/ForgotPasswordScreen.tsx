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
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ArrowLeft, Send } from 'lucide-react-native';
import { useSanityAuth } from '../hooks/useSanityAuth';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  // Get auth functions and settings from Sanity
  const { forgotPassword, loading, authSettings } = useSanityAuth();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Start animations when component mounts
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Get Sanity settings for forgot password screen
  const branding = authSettings?.branding || {
    appName: 'tunnel',
    tagline: 'Connect, Share, Earn',
    primaryColor: '#0070F3',
    secondaryColor: '#00DFD8',
  };
  
  const forgotPasswordScreenSettings = authSettings?.forgotPasswordScreen || {
    headerTitle: 'tunnel',
    title: 'Reset Password',
    subtitle: 'Enter your email address and we\'ll send you instructions to reset your password',
    successTitle: 'Check Your Email',
    successMessage: 'We\'ve sent password reset instructions to your email address. Please check your inbox.',
    buttonText: 'Send Reset Link',
    resendText: 'Didn\'t receive the email? Send again'
  };

  const handleResetPassword = async () => {
    setError('');

    // Basic validation
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      // Call Sanity forgot password function
      await forgotPassword(email);
      setIsEmailSent(true);
    } catch (err: any) {
      // For security reasons, we don't want to reveal if an email exists or not
      // So we show success message even if there's an error (but we log it)
      console.error('Error requesting password reset:', err);
      setIsEmailSent(true);
    }
  };

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
            style={[
              styles.contentContainer,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={onBack}
              >
                <ArrowLeft size={24} color="#0070F3" />
              </TouchableOpacity>
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { fontSize: dynamicStyles.titleSize + 10 }]}>
                {forgotPasswordScreenSettings.headerTitle}
              </Text>
              <Text style={[styles.headerSubtitle, { fontSize: dynamicStyles.subtitleSize }]}>
                {branding.tagline}
              </Text>
            </View>

            <View 
              style={[
                styles.formContainer,
                { 
                  padding: dynamicStyles.contentPadding,
                  width: dynamicStyles.formWidth,
                }
              ]}
            >
              <Text style={[styles.title, { fontSize: dynamicStyles.titleSize }]}>
                {forgotPasswordScreenSettings.title}
              </Text>
              <Text style={[styles.subtitle, { fontSize: dynamicStyles.subtitleSize }]}>
                {forgotPasswordScreenSettings.subtitle}
              </Text>

              {!isEmailSent ? (
                <>
                  <View style={styles.inputContainer}>
                    <View style={styles.iconContainer}>
                      <Mail size={22} color="#0070F3" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#666"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                    />
                  </View>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  <Pressable
                    style={[styles.resetButton, loading && styles.resetButtonDisabled]}
                    onPress={handleResetPassword}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={[branding.primaryColor, branding.secondaryColor]}
                      style={[styles.resetButtonGradient, { padding: dynamicStyles.buttonPadding }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {loading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          <Text style={styles.resetButtonText}>
                            {forgotPasswordScreenSettings.buttonText}
                          </Text>
                          <Send size={22} color="white" />
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </>
              ) : (
                <View style={styles.successContainer}>
                  <View style={styles.successIconContainer}>
                    <LinearGradient
                      colors={[`${branding.primaryColor}20`, `${branding.secondaryColor}20`]}
                      style={styles.successIconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Send size={32} color={branding.primaryColor} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.successTitle}>{forgotPasswordScreenSettings.successTitle}</Text>
                  <Text style={styles.successMessage}>
                    {forgotPasswordScreenSettings.successMessage}
                  </Text>
                  <TouchableOpacity 
                    style={styles.resendButton}
                    onPress={() => setIsEmailSent(false)}
                  >
                    <Text style={styles.resendButtonText}>{forgotPasswordScreenSettings.resendText}</Text>
                  </TouchableOpacity>
                </View>
              )}
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
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,112,243,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    marginBottom: 16,
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
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    marginBottom: 24,
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
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
    textAlign: 'center',
  },
  resetButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
  },
  successMessage: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  resendButton: {
    padding: 12,
  },
  resendButtonText: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
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