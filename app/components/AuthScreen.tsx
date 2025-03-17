import React from 'react';
import AuthManager from './AuthManager';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  return <AuthManager onAuthenticated={onAuthenticated} />;
} 