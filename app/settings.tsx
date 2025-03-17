import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  Moon,
  Shield,
  ChevronRight,
  ArrowLeft,
  Globe,
  Volume2,
  Lock,
  HelpCircle,
  Info,
  LogOut,
  Trash2,
  Languages,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { usePoints } from '@/hooks/usePoints';
import { useReactions } from '@/hooks/useReactions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SettingSection = {
  title: string;
  items: {
    icon: React.ReactNode;
    title: string;
    value?: React.ReactNode;
    onPress?: () => void;
    danger?: boolean;
  }[];
};

export default function SettingsScreen() {
  const router = useRouter();
  const { resetPoints } = usePoints();
  const { resetReactions } = useReactions();
  const [notifications, setNotifications] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [autoplay, setAutoplay] = useState(true);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Handle account deletion
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // Handle logout
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset Data',
      'Are you sure you want to reset all your data? This includes points, reactions, and preferences.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([resetPoints(), resetReactions()]);
            Alert.alert('Success', 'All data has been reset');
          },
        },
      ]
    );
  };

  const settingSections: SettingSection[] = [
    {
      title: 'Preferences',
      items: [
        {
          icon: <Bell color="#1877F2" size={22} />,
          title: 'Push Notifications',
          value: (
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#333', true: '#1877F2' }}
              thumbColor="white"
            />
          ),
        },
        {
          icon: <Moon color="#1877F2" size={22} />,
          title: 'Dark Mode',
          value: (
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ false: '#333', true: '#1877F2' }}
              thumbColor="white"
            />
          ),
        },
        {
          icon: <Volume2 color="#1877F2" size={22} />,
          title: 'Autoplay Videos',
          value: (
            <Switch
              value={autoplay}
              onValueChange={setAutoplay}
              trackColor={{ false: '#333', true: '#1877F2' }}
              thumbColor="white"
            />
          ),
        },
        {
          icon: <Languages color="#1877F2" size={22} />,
          title: 'Language',
          value: <Text style={styles.settingValue}>English</Text>,
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          icon: <Shield color="#1877F2" size={22} />,
          title: 'Privacy Settings',
          onPress: () => {},
        },
        {
          icon: <Lock color="#1877F2" size={22} />,
          title: 'Security Settings',
          onPress: () => {},
        },
        {
          icon: <Globe color="#1877F2" size={22} />,
          title: 'Content Preferences',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: <HelpCircle color="#1877F2" size={22} />,
          title: 'Help Center',
          onPress: () => {},
        },
        {
          icon: <Info color="#1877F2" size={22} />,
          title: 'About',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: <Trash2 color="#FF3B30" size={22} />,
          title: 'Reset All Data',
          onPress: handleResetData,
          danger: true,
        },
        {
          icon: <LogOut color="#FF3B30" size={22} />,
          title: 'Logout',
          onPress: handleLogout,
          danger: true,
        },
        {
          icon: <Trash2 color="#FF3B30" size={22} />,
          title: 'Delete Account',
          onPress: handleDeleteAccount,
          danger: true,
        },
      ],
    },
  ];

  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    value?: React.ReactNode,
    onPress?: () => void,
    danger?: boolean
  ) => (
    <Pressable
      key={title}
      style={styles.settingItem}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
    >
      <View style={styles.settingLeft}>
        {icon}
        <Text style={[styles.settingTitle, danger && styles.dangerText]}>
          {title}
        </Text>
      </View>
      {value || (onPress && <ChevronRight color="#888" size={20} />)}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={20}
          >
            <ArrowLeft color="white" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {settingSections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={item.title}>
                  {renderSettingItem(
                    item.icon,
                    item.title,
                    item.value,
                    item.onPress,
                    item.danger
                  )}
                  {itemIndex < section.items.length - 1 && (
                    <View style={styles.separator} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    height: 90,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: '#111',
    borderRadius: 15,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  settingValue: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  separator: {
    height: 1,
    backgroundColor: '#222',
    marginHorizontal: 15,
  },
  dangerText: {
    color: '#FF3B30',
  },
}); 