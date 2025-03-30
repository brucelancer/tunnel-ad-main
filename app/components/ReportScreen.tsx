import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, ArrowLeft, Send, UserCircle, AlertCircle, Clock, Check } from 'lucide-react-native';
import { useSanityAuth } from '../hooks/useSanityAuth';
import { getSanityClient } from '@/tunnel-ad-main/services/postService';

// Define the report document structure
interface ReportDocument {
  _type: string;
  post: { 
    _type: string; 
    _ref: string;
  };
  reason: string;
  status: string;
  createdAt: string;
  reportedBy?: { 
    _type: string; 
    _ref: string;
  };
}

const MIN_CHARS = 10;
const MAX_CHARS = 500;

export default function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { postId } = params;
  const { user } = useSanityAuth();
  
  const [reportReason, setReportReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Focus the input when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleReportReasonChange = (text: string) => {
    if (text.length <= MAX_CHARS) {
      setReportReason(text);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const submitReport = async () => {
    try {
      if (reportReason.trim().length < MIN_CHARS) {
        Alert.alert('Error', 'Please provide a more detailed reason for reporting this post.');
        return;
      }

      if (!postId) {
        Alert.alert('Error', 'Invalid post ID');
        return;
      }

      setIsSubmitting(true);
      
      const client = getSanityClient();
      
      if (!client || typeof client.create !== 'function') {
        throw new Error('Sanity client not properly initialized');
      }
      
      // Create a properly structured report document
      const reportDocument: ReportDocument = {
        _type: 'report',
        post: { 
          _type: 'reference', 
          _ref: postId as string 
        },
        reason: reportReason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      // Add reporter reference if user is authenticated
      if (user && user._id) {
        reportDocument.reportedBy = { 
          _type: 'reference', 
          _ref: user._id 
        };
      }
      
      // Submit the report to Sanity
      const result = await client.create(reportDocument);
      console.log('Report submitted successfully:', result._id);
      
      setIsSubmitting(false);
      setSubmitSuccess(true);
      
      // Navigate back after showing success for a moment
      setTimeout(() => {
        router.back();
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting report:', error);
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const isValidReport = reportReason.trim().length >= MIN_CHARS;
  const charCount = reportReason.length;
  const charactersRemaining = MAX_CHARS - charCount;

  // Render the success view if report was successfully submitted
  if (submitSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.successContainer}>
          <LinearGradient
            colors={['#1a6e36', '#0d4d25']}
            style={styles.successGradient}
          >
            <View style={styles.successIconContainer}>
              <Check size={40} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Report Submitted</Text>
            <Text style={styles.successMessage}>
              Thank you for helping keep our community safe. Our team will review this post.
            </Text>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Report Post</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <LinearGradient
            colors={['#292929', '#1a1a1a']}
            style={styles.infoCard}
          >
            <View style={styles.infoIconContainer}>
              <AlertTriangle size={20} color="#FF3B30" />
            </View>
            <Text style={styles.infoText}>
              Reports are confidential. We'll review this post to determine if it violates our community guidelines.
            </Text>
          </LinearGradient>

          {/* Report Form */}
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <AlertCircle size={18} color="#888" />
              <Text style={styles.formTitle}>Why are you reporting this post?</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                multiline
                placeholder="Please provide a detailed explanation of why you're reporting this post..."
                placeholderTextColor="#666"
                value={reportReason}
                onChangeText={handleReportReasonChange}
                maxLength={MAX_CHARS}
                numberOfLines={8}
                textAlignVertical="top"
              />
              
              <View style={styles.characterCountContainer}>
                <Clock size={12} color={charactersRemaining < 50 ? "#FF3B30" : "#888"} />
                <Text style={[
                  styles.characterCount,
                  charactersRemaining < 50 && styles.characterCountWarning
                ]}>
                  {charactersRemaining} characters remaining
                </Text>
              </View>
            </View>

            <View style={styles.helpContainer}>
              <Text style={styles.helpTitle}>Common reasons for reporting:</Text>
              <View style={styles.helpItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.helpText}>Harassment or bullying</Text>
              </View>
              <View style={styles.helpItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.helpText}>Spam or misleading content</Text>
              </View>
              <View style={styles.helpItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.helpText}>Inappropriate or harmful content</Text>
              </View>
              <View style={styles.helpItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.helpText}>Violence or dangerous organizations</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)', '#000']}
          style={styles.bottomGradient}
        >
          <View style={styles.actionBar}>
            <View style={styles.charRequirementContainer}>
              {charCount < MIN_CHARS ? (
                <Text style={styles.charRequirement}>
                  At least {MIN_CHARS - charCount} more characters required
                </Text>
              ) : (
                <Text style={styles.charRequirementMet}>
                  {submitSuccess ? 'Report submitted!' : 'Ready to submit'}
                </Text>
              )}
            </View>
            
            <Pressable 
              style={[
                styles.submitButton,
                !isValidReport && styles.submitButtonDisabled
              ]}
              onPress={submitReport}
              disabled={!isValidReport || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                  <Send size={16} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </Pressable>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoIconContainer: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  textInput: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    minHeight: 150,
    maxHeight: 300,
  },
  characterCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  characterCount: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  characterCountWarning: {
    color: '#FF3B30',
  },
  helpContainer: {
    marginTop: 16,
  },
  helpTitle: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    marginRight: 8,
  },
  helpText: {
    color: '#999',
    fontSize: 14,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    paddingTop: 60,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  charRequirementContainer: {
    flex: 1,
    marginRight: 16,
  },
  charRequirement: {
    color: '#FF3B30',
    fontSize: 12,
  },
  charRequirementMet: {
    color: '#34C759',
    fontSize: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1877F2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    minWidth: 140,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(24, 119, 242, 0.4)',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  successGradient: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  successMessage: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
}); 