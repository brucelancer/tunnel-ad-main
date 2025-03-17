import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';

type AuthScreen = 'login' | 'signup' | 'forgotPassword';

interface AuthManagerProps {
  onAuthenticated: () => void;
}

export default function AuthManager({ onAuthenticated }: AuthManagerProps) {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginScreen
            onAuthenticated={onAuthenticated}
            onSwitchToSignup={() => setCurrentScreen('signup')}
            onForgotPassword={() => setCurrentScreen('forgotPassword')}
          />
        );
      case 'signup':
        return (
          <SignupScreen
            onAuthenticated={onAuthenticated}
            onSwitchToLogin={() => setCurrentScreen('login')}
          />
        );
      case 'forgotPassword':
        return (
          <ForgotPasswordScreen
            onBack={() => setCurrentScreen('login')}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 