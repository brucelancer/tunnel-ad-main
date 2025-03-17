import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  Alert,
  ScrollView,
  Dimensions,
  Switch,
} from 'react-native';
import {
  Image as ImageIcon,
  X,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  HelpCircle,
  Plus,
  Minus,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenContainer from './ScreenContainer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ArticleTunnellingProps {
  onSubmit: (data: any) => void;
}

interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment: 'left' | 'center' | 'right';
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctOption: number;
}

export default function ArticleTunnelling({ onSubmit }: ArticleTunnellingProps) {
  const [articleContent, setArticleContent] = useState('');
  const [articleImageUri, setArticleImageUri] = useState<string | null>(null);
  const [includeQuiz, setIncludeQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    { question: '', options: ['', '', ''], correctOption: 0 }
  ]);
  const [textStyle, setTextStyle] = useState<TextStyle>({
    bold: false,
    italic: false,
    underline: false,
    alignment: 'left'
  });
  const [selectedText, setSelectedText] = useState({ start: 0, end: 0 });

  const handleArticleImageUpload = async () => {
    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To upload images, please enable media library access in your device settings.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 1,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets[0].uri) {
        setArticleImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleSubmit = () => {
    if (!articleContent || !articleImageUri) {
      Alert.alert('Error', 'Please provide both article content and cover image');
      return;
    }

    if (includeQuiz) {
      // Validate quiz questions
      const invalidQuestions = quizQuestions.filter(q => 
        !q.question.trim() || q.options.some(opt => !opt.trim())
      );
      
      if (invalidQuestions.length > 0) {
        Alert.alert('Error', 'Please complete all quiz questions and options');
        return;
      }
    }

    onSubmit({
      type: 'article',
      content: articleContent,
      imageUri: articleImageUri,
      quiz: includeQuiz ? quizQuestions : null,
    });
  };

  const handleTextSelection = (event: any) => {
    setSelectedText({
      start: event.nativeEvent.selection.start,
      end: event.nativeEvent.selection.end
    });
  };

  const applyStyle = (style: keyof TextStyle) => {
    if (style === 'alignment') return; // Handle alignment separately
    setTextStyle(prev => ({
      ...prev,
      [style]: !prev[style]
    }));
  };

  const setAlignment = (align: 'left' | 'center' | 'right') => {
    setTextStyle(prev => ({
      ...prev,
      alignment: align
    }));
  };

  const clearContent = () => {
    Alert.alert(
      'Clear Content',
      'Are you sure you want to clear all content?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setArticleContent('');
            setTextStyle({
              bold: false,
              italic: false,
              underline: false,
              alignment: 'left'
            });
          }
        }
      ]
    );
  };

  const renderFormatButton = (
    Icon: any,
    style: keyof TextStyle | 'alignment',
    value?: 'left' | 'center' | 'right'
  ) => (
    <Pressable
      style={[
        styles.formatButton,
        ((style === 'alignment' && textStyle.alignment === value) ||
         (style !== 'alignment' && textStyle[style])) && styles.formatButtonActive
      ]}
      onPress={() => value ? setAlignment(value) : applyStyle(style)}
    >
      <Icon size={20} color={
        (style === 'alignment' && textStyle.alignment === value) ||
        (style !== 'alignment' && textStyle[style])
          ? '#0070F3'
          : '#fff'
      } />
    </Pressable>
  );

  const addQuizQuestion = () => {
    setQuizQuestions([
      ...quizQuestions, 
      { question: '', options: ['', '', ''], correctOption: 0 }
    ]);
  };

  const removeQuizQuestion = (index: number) => {
    if (quizQuestions.length > 1) {
      setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
    } else {
      Alert.alert('Info', 'You need at least one question for the quiz');
    }
  };

  const updateQuizQuestion = (index: number, field: 'question' | 'correctOption', value: string | number) => {
    const updatedQuestions = [...quizQuestions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setQuizQuestions(updatedQuestions);
  };

  const updateQuizOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...quizQuestions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuizQuestions(updatedQuestions);
  };

  const addQuizOption = (questionIndex: number) => {
    if (quizQuestions[questionIndex].options.length < 5) {
      const updatedQuestions = [...quizQuestions];
      updatedQuestions[questionIndex].options.push('');
      setQuizQuestions(updatedQuestions);
    }
  };

  const removeQuizOption = (questionIndex: number, optionIndex: number) => {
    if (quizQuestions[questionIndex].options.length > 2) {
      const updatedQuestions = [...quizQuestions];
      updatedQuestions[questionIndex].options.splice(optionIndex, 1);
      
      // Adjust correctOption if needed
      if (updatedQuestions[questionIndex].correctOption >= updatedQuestions[questionIndex].options.length) {
        updatedQuestions[questionIndex].correctOption = 0;
      }
      
      setQuizQuestions(updatedQuestions);
    } else {
      Alert.alert('Info', 'You need at least two options for each question');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.articleContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Content</Text>
          <View style={styles.editorContainer}>
            <View style={styles.toolbar}>
              <View style={styles.formatGroup}>
                {renderFormatButton(Bold, 'bold')}
                {renderFormatButton(Italic, 'italic')}
                {renderFormatButton(Underline, 'underline')}
              </View>
              <View style={styles.formatGroup}>
                {renderFormatButton(AlignLeft, 'alignment', 'left')}
                {renderFormatButton(AlignCenter, 'alignment', 'center')}
                {renderFormatButton(AlignRight, 'alignment', 'right')}
              </View>
              <Pressable
                style={[styles.formatButton, styles.clearButton]}
                onPress={clearContent}
              >
                <Trash2 size={20} color="#FF4444" />
              </Pressable>
            </View>
            <TextInput
              style={[
                styles.input,
                styles.articleContent,
                {
                  fontWeight: textStyle.bold ? 'bold' : 'normal',
                  fontStyle: textStyle.italic ? 'italic' : 'normal',
                  textDecorationLine: textStyle.underline ? 'underline' : 'none',
                  textAlign: textStyle.alignment,
                }
              ]}
              value={articleContent}
              onChangeText={setArticleContent}
              onSelectionChange={handleTextSelection}
              placeholder="Write your article..."
              placeholderTextColor="#666"
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cover Image</Text>
          {!articleImageUri ? (
            <Pressable 
              style={[styles.uploadZone, { aspectRatio: 16/9 }]} 
              onPress={handleArticleImageUpload}
            >
              <LinearGradient
                colors={['rgba(0,112,243,0.1)', 'rgba(0,223,216,0.1)']}
                style={styles.uploadGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.uploadContent}>
                  <ImageIcon size={40} color="#0070F3" />
                  <Text style={[styles.uploadText, { color: '#0070F3' }]}>Upload Cover Image</Text>
                  <Text style={styles.uploadSubtext}>JPG, PNG up to 5MB</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={[styles.previewContainer, { aspectRatio: 16/9 }]}>
              <Image source={{ uri: articleImageUri }} style={styles.imagePreview} />
              <Pressable
                style={styles.removeButton}
                onPress={() => setArticleImageUri(null)}
              >
                <LinearGradient
                  colors={['#0070F3', '#00DFD8']}
                  style={styles.removeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <X size={24} color="white" />
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.quizHeaderContainer}>
            <Text style={styles.label}>Include Quiz</Text>
            <View style={styles.quizToggleContainer}>
              <Text style={styles.quizToggleLabel}>
                {includeQuiz ? 'Yes' : 'No'}
              </Text>
              <Switch
                value={includeQuiz}
                onValueChange={setIncludeQuiz}
                trackColor={{ false: '#3e3e3e', true: 'rgba(0,112,243,0.3)' }}
                thumbColor={includeQuiz ? '#0070F3' : '#f4f3f4'}
              />
            </View>
          </View>
          
          {includeQuiz && (
            <View style={styles.quizContainer}>
              <LinearGradient
                colors={['rgba(0,112,243,0.05)', 'rgba(0,223,216,0.05)']}
                style={styles.quizGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.quizContent}>
                  <View style={styles.quizHeader}>
                    <Text style={styles.quizTitle}>Quiz Questions</Text>
                    <Pressable
                      style={styles.quizInfoButton}
                      onPress={() => Alert.alert(
                        'Quiz Information', 
                        'Add quiz questions to test your readers. Each question must have at least 2 options. Select the correct answer by tapping the radio button.'
                      )}
                    >
                      <HelpCircle size={20} color="#0070F3" />
                    </Pressable>
                  </View>
                  
                  {quizQuestions.map((question, qIndex) => (
                    <View key={qIndex} style={styles.questionContainer}>
                      <View style={styles.questionHeader}>
                        <Text style={styles.questionLabel}>Question {qIndex + 1}</Text>
                        <Pressable
                          style={styles.removeQuestionButton}
                          onPress={() => removeQuizQuestion(qIndex)}
                        >
                          <X size={16} color="#FF4444" />
                        </Pressable>
                      </View>
                      
                      <TextInput
                        style={styles.questionInput}
                        value={question.question}
                        onChangeText={(text) => updateQuizQuestion(qIndex, 'question', text)}
                        placeholder="Enter your question"
                        placeholderTextColor="#666"
                      />
                      
                      {question.options.map((option, oIndex) => (
                        <View key={oIndex} style={styles.optionContainer}>
                          <Pressable
                            style={[
                              styles.radioButton,
                              question.correctOption === oIndex && styles.radioButtonSelected
                            ]}
                            onPress={() => updateQuizQuestion(qIndex, 'correctOption', oIndex)}
                          >
                            {question.correctOption === oIndex && (
                              <View style={styles.radioButtonInner} />
                            )}
                          </Pressable>
                          
                          <TextInput
                            style={styles.optionInput}
                            value={option}
                            onChangeText={(text) => updateQuizOption(qIndex, oIndex, text)}
                            placeholder={`Option ${oIndex + 1}`}
                            placeholderTextColor="#666"
                          />
                          
                          <Pressable
                            style={styles.removeOptionButton}
                            onPress={() => removeQuizOption(qIndex, oIndex)}
                          >
                            <Minus size={16} color="#FF4444" />
                          </Pressable>
                        </View>
                      ))}
                      
                      <Pressable
                        style={styles.addOptionButton}
                        onPress={() => addQuizOption(qIndex)}
                      >
                        <Plus size={16} color="#0070F3" />
                        <Text style={styles.addOptionText}>Add Option</Text>
                      </Pressable>
                    </View>
                  ))}
                  
                  <Pressable
                    style={styles.addQuestionButton}
                    onPress={addQuizQuestion}
                  >
                    <LinearGradient
                      colors={['rgba(0,112,243,0.2)', 'rgba(0,223,216,0.2)']}
                      style={styles.addQuestionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Plus size={20} color="#0070F3" />
                      <Text style={styles.addQuestionText}>Add Question</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </LinearGradient>
            </View>
          )}
        </View>

        <Pressable
          style={[
            styles.submitButton,
            (!articleContent || !articleImageUri) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
        >
          <LinearGradient
            colors={['#0070F3', '#00DFD8']}
            style={styles.submitGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.submitButtonText}>Share article</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  articleContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 32,
  },
  label: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
    opacity: 0.9,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editorContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  toolbar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formatGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  formatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatButtonActive: {
    backgroundColor: 'rgba(0,112,243,0.2)',
  },
  clearButton: {
    backgroundColor: 'rgba(255,68,68,0.1)',
  },
  articleContent: {
    minHeight: 400,
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    textAlignVertical: 'top',
    borderWidth: 0,
  },
  uploadZone: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0,112,243,0.3)',
    borderStyle: 'dashed',
  },
  uploadGradient: {
    flex: 1,
    padding: 24,
  },
  uploadContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    gap: 12,
  },
  uploadText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  uploadSubtext: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  previewContainer: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  removeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  quizToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quizToggleLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  quizContainer: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  quizGradient: {
    borderRadius: 24,
    padding: 2,
  },
  quizContent: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    padding: 20,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  quizTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  quizInfoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,112,243,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionLabel: {
    color: '#0070F3',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  removeQuestionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#0070F3',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0070F3',
  },
  optionInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  removeOptionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  addOptionText: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  addQuestionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  addQuestionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  addQuestionText: {
    color: '#0070F3',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  submitButton: {
    marginTop: 32,
    borderRadius: 24,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    padding: 24,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
  },
}); 