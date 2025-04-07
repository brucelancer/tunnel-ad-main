import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function ScreenContainer({ children, style }: ScreenContainerProps) {
  return (
    <SafeAreaView style={[styles.container, style]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1A1A1A', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    width: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
    width: '100%',
  },
}); 