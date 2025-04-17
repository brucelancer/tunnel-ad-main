import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  BarChart2, 
  Eye, 
  ThumbsUp, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  ChevronRight,
  Clock,
  Users,
  MapPin,
  Smartphone,
  BarChart,
  PieChart,
  TrendingUp,
  Calendar,
  Heart,
  Award,
} from 'lucide-react-native';
import { useSanityAuth } from '../app/hooks/useSanityAuth';
import * as videoService from '@/tunnel-ad-main/services/videoService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { createClient } from '@sanity/client';
import { DeviceEventEmitter } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Initialize Sanity client for direct queries
const sanityClient = createClient({
  projectId: '21is7976',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-03-01'
});

// Helper function to format numbers for display
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Tunnel verification mark component
const TunnelVerifiedMark = ({ size = 10 }) => (
  <Svg width={size * 1.5} height={size * 1.5} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 2L14 5.1L17.5 3.5L17 7.3L21 8L18.9 11L21 14L17 14.7L17.5 18.5L14 16.9L12 20L10 16.9L6.5 18.5L7 14.7L3 14L5.1 11L3 8L7 7.3L6.5 3.5L10 5.1L12 2Z" 
      fill="#1877F2" 
    />
    <Path 
      d="M10 13.17l-2.59-2.58L6 12l4 4 8-8-1.41-1.42L10 13.17z" 
      fill="#FFFFFF" 
      strokeWidth="0"
    />
  </Svg>
);

interface VideoInsights {
  viewsTotal: number;
  viewsToday: number;
  viewsWeek: number;
  likesTotal: number;
  likesToday: number;
  commentsTotal: number;
  commentsTrend: number;
  saveCount: number;
  shareCount: number;
  watchTime: number;
  completionRate: number;
  audience: {
    male: number;
    female: number;
    other: number;
  };
  locations: { 
    [location: string]: number;
  };
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
    other: number;
  };
  viewsOverTime: { date: string; count: number }[];
  topLikers: {
    userId: string;
    username: string;
    avatar: string;
    likeCount: number;
  }[];
  commentsByDay: number[];
  pointsDistribution: {
    points: number;
    userCount: number;
  }[];
  comments: {
    id: string;
    text: string;
    createdAt: string;
    user: {
      id: string;
      username: string;
      avatar: string | null;
      isVerified: boolean;
    };
    likes: number;
  }[];
}

export default function VideoInsights() {
  const params = useLocalSearchParams();
  const videoId = params.id as string;
  const router = useRouter();
  const { user } = useSanityAuth();
  const [loading, setLoading] = useState(true);
  const [videoData, setVideoData] = useState<any>(null);
  const [insights, setInsights] = useState<VideoInsights | null>(null);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showCommentsScreen, setShowCommentsScreen] = useState(false);

  useEffect(() => {
    fetchVideoData();
    fetchInsights();
  }, [videoId, timeframe]);

  const fetchVideoData = async () => {
    try {
      const data = await fetchVideoDetails(videoId);
      setVideoData(data);
    } catch (error) {
      console.error('Error fetching video data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoDetails = async (id: string) => {
    try {
      // Fetch a single video by ID using the Sanity client directly
      const videoData = await sanityClient.fetch(`
        *[_type == "video" && _id == $videoId][0] {
          _id,
          title,
          description,
          url,
          "videoUrl": videoFile.asset->url,
          type,
          contentType,
          aspectRatio,
          points,
          views,
          likes,
          dislikes,
          comments,
          "author": author->username,
          "authorId": author->_id,
          "authorAvatar": author->profile.avatar,
          "isVerified": author->username == "admin" || author->username == "moderator",
          "isBlueVerified": author->isBlueVerified,
          "thumbnail": thumbnail.asset->url,
          createdAt
        }
      `, { videoId: id });
      
      if (!videoData) {
        console.error(`Video not found with ID: ${id}`);
        return null;
      }
      
      // Format the data to match our expected format
      return {
        ...videoData,
        id: videoData._id,
        url: videoData.videoUrl || videoData.url,
        authorAvatar: videoData.authorAvatar ? videoService.urlFor(videoData.authorAvatar).url() : null,
        thumbnail: videoData.thumbnail || 'https://via.placeholder.com/400x225'
      };
    } catch (error) {
      console.error('Error in fetchVideoDetails:', error);
      return null;
    }
  };

  const fetchInsights = async () => {
    try {
      setLoading(true);
      
      // Real data approach - query Sanity for insights
      const videoStats = await sanityClient.fetch(`
        *[_type == "video" && _id == $videoId][0] {
          _id,
          views,
          likes,
          dislikes,
          "commentsCount": count(comments),
          "watchedByCount": count(watchedBy),
          "likedByUsers": likedBy[]->{ 
            _id, 
            username, 
            "avatar": profile.avatar,
            "likeCount": count(*[_type == "video" && $userId in likedBy[]._ref])
          },
          "pointsData": *[_type == "user" && $videoId in watchedVideos[]._ref] {
            points
          },
          "deviceData": *[_type == "viewEvent" && video._ref == $videoId] {
            deviceType
          },
          "viewsOverTime": *[_type == "viewEvent" && video._ref == $videoId] | order(_createdAt asc) {
            _createdAt,
            timestamp
          },
          "comments": comments[] {
            _key,
            text,
            createdAt,
            likes,
            "user": author-> {
              _id,
              username,
              firstName,
              lastName,
              "avatar": profile.avatar,
              "isVerified": username == "admin" || username == "moderator" || defined(isBlueVerified)
            }
          }
        }
      `, { 
        videoId, 
        userId: user?._id || "none"
      });
      
      // Get recent comments data for time series
      const commentsData = await sanityClient.fetch(`
        *[_type == "video" && _id == $videoId][0] {
          comments[] {
            _createdAt,
            createdAt
          }
        }
      `, { videoId });
      
      // Generate daily comments data for the last 7 days
      const commentsByDay = [0, 0, 0, 0, 0, 0, 0];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (commentsData && commentsData.comments) {
        commentsData.comments.forEach((comment: any) => {
          const commentDate = new Date(comment._createdAt || comment.createdAt);
          commentDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - commentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 0 && diffDays < 7) {
            commentsByDay[6 - diffDays]++;
          }
        });
      }
      
      // Process real view count data from Sanity
      const viewsOverTime: { date: string; count: number }[] = [];
      let usedMockData = false;
      
      if (videoStats?.viewsOverTime && videoStats.viewsOverTime.length > 0) {
        console.log(`Processing ${videoStats.viewsOverTime.length} view events from Sanity`);
        
        // Group views by day
        const viewsByDay = new Map<string, number>();
        
        videoStats.viewsOverTime.forEach((view: any) => {
          // Try to get timestamp from either explicit timestamp field or document creation date
          const timeValue = view.timestamp || view._createdAt;
          if (!timeValue) return;
          
          const date = new Date(timeValue);
          const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
          
          viewsByDay.set(dateString, (viewsByDay.get(dateString) || 0) + 1);
        });
        
        // Convert map to array
        Array.from(viewsByDay.entries()).sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([date, count]) => {
            viewsOverTime.push({ date, count });
          });
        
        // If we have more than 14 days of data, limit to the most recent 14
        if (viewsOverTime.length > 14) {
          viewsOverTime.splice(0, viewsOverTime.length - 14);
        }
        
        console.log(`Processed ${viewsOverTime.length} days of view data`);
      } else {
        console.log('No real view data available, using mock data');
        usedMockData = true;
        
        // Generate realistic mock data for the last 14 days
        const today = new Date();
        for (let i = 13; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateString = date.toISOString().split('T')[0];
          
          // Generate view count - higher for recent days
          const recencyFactor = 1 + ((14 - i) / 14);
          const totalViews = videoStats?.views || 100;
          const baseViewCount = Math.max(1, Math.floor(totalViews / 30)); // Reasonable daily views
          const randomViews = Math.floor(baseViewCount * recencyFactor * (0.5 + Math.random()));
          
          viewsOverTime.push({
            date: dateString,
            count: randomViews
          });
        }
      }
      
      // Process points distribution from watched users
      const pointsDistribution: { points: number, userCount: number }[] = [];
      if (videoStats?.pointsData) {
        const pointsMap = new Map<number, number>();
        
        // Group users by points earned
        videoStats.pointsData.forEach((userData: any) => {
          const points = userData.points || 0;
          // Round points to nearest 5 for better grouping
          const roundedPoints = Math.round(points / 5) * 5;
          pointsMap.set(roundedPoints, (pointsMap.get(roundedPoints) || 0) + 1);
        });
        
        // Convert map to array of objects
        pointsMap.forEach((userCount, points) => {
          pointsDistribution.push({ points, userCount });
        });
        
        // Sort by points
        pointsDistribution.sort((a, b) => a.points - b.points);
      }
      
      // If no real data is available, generate some reasonable mock data
      if (!pointsDistribution.length) {
        pointsDistribution.push(
          { points: 5, userCount: Math.floor(Math.random() * 100) + 20 },
          { points: 10, userCount: Math.floor(Math.random() * 80) + 10 },
          { points: 15, userCount: Math.floor(Math.random() * 40) + 5 },
          { points: 20, userCount: Math.floor(Math.random() * 20) + 1 }
        );
      }
      
      // Format the top likers
      let topLikers = [];
      if (videoStats?.likedByUsers && videoStats.likedByUsers.length > 0) {
        topLikers = videoStats.likedByUsers
          .map((user: any) => ({
            userId: user._id,
            username: user.username || 'User',
            avatar: user.avatar ? videoService.urlFor(user.avatar).url() : 'https://randomuser.me/api/portraits/lego/1.jpg',
            likeCount: user.likeCount || 1
          }));
      }
      
      // Calculate today's views and weekly views (mocked for demo)
      const viewsToday = Math.floor((videoStats?.views || 100) * 0.1);
      const viewsWeek = Math.floor((videoStats?.views || 100) * 0.7);
      
      // Calculate location distribution (mocked for demo)
      const locations: Record<string, number> = {
        'United States': 42,
        'United Kingdom': 18,
        'Canada': 12,
        'Australia': 8,
        'Germany': 5,
        'Other': 15,
      };
      
      // Process device distribution from actual data
      let deviceData = {
        mobile: 78,
        desktop: 14,
        tablet: 6,
        other: 2,
      };
      
      if (videoStats?.deviceData && videoStats.deviceData.length > 0) {
        // Count the occurrences of each device type
        const deviceCounts: Record<string, number> = {};
        let totalViews = 0;
        
        videoStats.deviceData.forEach((item: any) => {
          const deviceType = item.deviceType?.toLowerCase() || 'other';
          deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;
          totalViews++;
        });
        
        // Map device types to our categories and calculate percentages
        if (totalViews > 0) {
          // Count mobile devices (smartphones, etc)
          const mobileCount = (deviceCounts.mobile || 0) + 
                             (deviceCounts.smartphone || 0) + 
                             (deviceCounts.iphone || 0) + 
                             (deviceCounts.android || 0);
          
          // Count desktop devices (laptops, PCs)
          const desktopCount = (deviceCounts.desktop || 0) + 
                              (deviceCounts.laptop || 0) + 
                              (deviceCounts.pc || 0) + 
                              (deviceCounts.mac || 0);
          
          // Count tablet devices
          const tabletCount = (deviceCounts.tablet || 0) + 
                             (deviceCounts.ipad || 0);
          
          // Calculate percentages
          deviceData = {
            mobile: Math.round((mobileCount / totalViews) * 100),
            desktop: Math.round((desktopCount / totalViews) * 100),
            tablet: Math.round((tabletCount / totalViews) * 100),
            other: 0 // will calculate below
          };
          
          // Other devices (smart TVs, consoles, etc)
          const calculatedSum = deviceData.mobile + deviceData.desktop + deviceData.tablet;
          deviceData.other = 100 - calculatedSum;
          
          // Ensure other is not negative
          if (deviceData.other < 0) deviceData.other = 0;
        }
      }
      
      // Process comments from the video document
      const comments = [];
      if (videoStats?.comments && videoStats.comments.length > 0) {
        comments.push(...videoStats.comments.map((comment: any) => ({
          id: comment._key,
          text: comment.text || '',
          createdAt: comment.createdAt || new Date().toISOString(),
          user: {
            id: comment.user?._id || 'unknown',
            username: comment.user?.username || 
                     (comment.user?.firstName ? 
                      `${comment.user.firstName} ${comment.user.lastName || ''}` : 
                      'Unknown User'),
            avatar: comment.user?.avatar ? 
                   videoService.urlFor(comment.user.avatar).url() : 
                   null,
            isVerified: comment.user?.isVerified || false
          },
          likes: comment.likes || 0
        })));
        
        // Sort comments by date - newest first
        comments.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      
      // Build the complete insights object
      const insightsData: VideoInsights = {
        viewsTotal: videoStats?.views || 0,
        viewsToday,
        viewsWeek,
        likesTotal: videoStats?.likes || 0,
        likesToday: Math.floor((videoStats?.likes || 0) * 0.12),
        commentsTotal: videoStats?.commentsCount || 0,
        commentsTrend: Math.floor((videoStats?.commentsCount || 0) * 0.18),
        saveCount: Math.floor((videoStats?.views || 100) * 0.02),
        shareCount: Math.floor((videoStats?.views || 100) * 0.01),
        watchTime: 76, // percentage
        completionRate: 68, // percentage
        audience: {
          male: 58,
          female: 37,
          other: 5,
        },
        locations,
        devices: deviceData,
        viewsOverTime,
        topLikers,
        commentsByDay,
        pointsDistribution,
        comments,
      };

      setInsights(insightsData);
      console.log('Insights data loaded for video:', videoId);
    } catch (error) {
      console.error('Error fetching insights:', error);
      
      // If Sanity query fails, fall back to mock data
      const mockInsights: VideoInsights = {
        viewsTotal: 1248,
        viewsToday: 126,
        viewsWeek: 876,
        likesTotal: 342,
        likesToday: 43,
        commentsTotal: 68,
        commentsTrend: 12,
        saveCount: 27,
        shareCount: 15,
        watchTime: 76, // percentage
        completionRate: 68, // percentage
        audience: {
          male: 58,
          female: 37,
          other: 5,
        },
        locations: {
          'United States': 42,
          'United Kingdom': 18,
          'Canada': 12,
          'Australia': 8,
          'Germany': 5,
          'Other': 15,
        },
        devices: {
          mobile: 78,
          desktop: 14,
          tablet: 6,
          other: 2,
        },
        viewsOverTime: [
          { date: '2024-04-01', count: 100 },
          { date: '2024-03-31', count: 90 },
          { date: '2024-03-30', count: 80 },
          { date: '2024-03-29', count: 70 },
          { date: '2024-03-28', count: 60 },
          { date: '2024-03-27', count: 50 },
          { date: '2024-03-26', count: 40 },
          { date: '2024-03-25', count: 30 },
          { date: '2024-03-24', count: 20 },
          { date: '2024-03-23', count: 10 },
          { date: '2024-03-22', count: 5 },
          { date: '2024-03-21', count: 3 },
          { date: '2024-03-20', count: 2 },
          { date: '2024-03-19', count: 1 },
        ],
        topLikers: [],
        commentsByDay: [3, 5, 8, 12, 10, 15, 14],
        pointsDistribution: [
          { points: 5, userCount: 120 },
          { points: 10, userCount: 85 },
          { points: 15, userCount: 42 },
          { points: 20, userCount: 18 },
          { points: 25, userCount: 5 },
        ],
        comments: [
          {
            id: 'comment1',
            text: 'This is such an interesting video! I learned so much.',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            user: {
              id: 'user1',
              username: 'JohnDoe',
              avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
              isVerified: false
            },
            likes: 5
          },
          {
            id: 'comment2',
            text: 'Great content as always! Looking forward to more.',
            createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
            user: {
              id: 'user2',
              username: 'JaneSmith',
              avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
              isVerified: true
            },
            likes: 8
          },
          {
            id: 'comment3',
            text: 'Could you make a follow-up on this topic?',
            createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
            user: {
              id: 'user3',
              username: 'TechFan',
              avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
              isVerified: false
            },
            likes: 2
          }
        ]
      };
      
      setInsights(mockInsights);
    } finally {
      setLoading(false);
    }
  };

  // Generate bar chart from view count data
  const renderBarChart = () => {
    if (!insights) return null;
    
    const maxValue = Math.max(...insights.viewsOverTime.map(item => item.count));
    const barCount = insights.viewsOverTime.length;
    // Calculate dynamic bar width based on number of bars
    const barWidth = Math.min(24, Math.max(8, Math.floor((SCREEN_WIDTH - 64) / barCount)));
    const barSpacing = Math.max(2, Math.min(8, Math.floor((SCREEN_WIDTH - 64 - barWidth * barCount) / (barCount - 1))));
    
    return (
      <View style={styles.barChartWrapper}>
        <View style={styles.barChartContainer}>
          {/* Y-axis labels */}
          <View style={styles.yAxisLabels}>
            <Text style={styles.axisLabel}>{formatNumber(maxValue)}</Text>
            <Text style={styles.axisLabel}>{formatNumber(Math.floor(maxValue * 0.75))}</Text>
            <Text style={styles.axisLabel}>{formatNumber(Math.floor(maxValue * 0.5))}</Text>
            <Text style={styles.axisLabel}>{formatNumber(Math.floor(maxValue * 0.25))}</Text>
            <Text style={styles.axisLabel}>0</Text>
          </View>
          
          {/* Grid lines */}
          <View style={styles.gridLines}>
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
          </View>
          
          {/* Bars */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.barsContainer,
              { paddingHorizontal: 8, gap: barSpacing }
            ]}
          >
            {insights.viewsOverTime.map((item, index) => {
              const height = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
              // Format date to display as Mon dd (Apr 15)
              const date = new Date(item.date);
              const dateLabel = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              });
              
              // Check if this is today's date
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <View key={index} style={styles.barChartBarWrapper}>
                  <View style={styles.barChartValueContainer}>
                    <Text style={styles.barChartValue}>
                      {formatNumber(item.count)}
                    </Text>
                  </View>
                  
                  <View 
                    style={[
                      styles.barChartBar,
                      { width: barWidth }
                    ]}
                  >
                    <View 
                      style={[
                        styles.barChartFill, 
                        { 
                          height: `${height}%`,
                          width: barWidth,
                          backgroundColor: isToday
                            ? '#1877F2' 
                            : index % 2 === 0 
                              ? 'rgba(24, 119, 242, 0.7)' 
                              : 'rgba(24, 119, 242, 0.4)',
                        }
                      ]} 
                    />
                  </View>
                  
                  <Text style={[
                    styles.barChartLabel,
                    isToday && styles.barChartLabelToday
                  ]}>
                    {dateLabel}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
        
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#1877F2' }]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: 'rgba(24, 119, 242, 0.7)' }]} />
            <Text style={styles.legendText}>Previous Days</Text>
          </View>
        </View>
      </View>
    );
  };

  // Time selector component
  const TimeSelector = () => (
    <View style={styles.timeSelector}>
      <Pressable
        style={[styles.timeButton, timeframe === 'day' && styles.activeTimeButton]}
        onPress={() => setTimeframe('day')}
      >
        <Text style={[styles.timeButtonText, timeframe === 'day' && styles.activeTimeButtonText]}>Day</Text>
      </Pressable>
      <Pressable
        style={[styles.timeButton, timeframe === 'week' && styles.activeTimeButton]}
        onPress={() => setTimeframe('week')}
      >
        <Text style={[styles.timeButtonText, timeframe === 'week' && styles.activeTimeButtonText]}>Week</Text>
      </Pressable>
      <Pressable
        style={[styles.timeButton, timeframe === 'month' && styles.activeTimeButton]}
        onPress={() => setTimeframe('month')}
      >
        <Text style={[styles.timeButtonText, timeframe === 'month' && styles.activeTimeButtonText]}>Month</Text>
      </Pressable>
      <Pressable
        style={[styles.timeButton, timeframe === 'all' && styles.activeTimeButton]}
        onPress={() => setTimeframe('all')}
      >
        <Text style={[styles.timeButtonText, timeframe === 'all' && styles.activeTimeButtonText]}>All</Text>
      </Pressable>
    </View>
  );

  // Simple pie chart component
  const PieChartComponent = ({ data }: { data: { [key: string]: number } }) => {
    const colors = ['#1877F2', '#4267B2', '#6A8FD1', '#8FB6F5', '#C6D9F9', '#D8E6FB'];
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    
    let startAngle = 0;
    
    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChart}>
          {Object.entries(data).map(([key, value], index) => {
            const percentage = (value / total) * 100;
            const angle = (percentage / 100) * 360;
            const endAngle = startAngle + angle;
            
            // Create the pie slice (simplified)
            const result = (
              <View key={key} style={[
                styles.pieSlice,
                {
                  backgroundColor: colors[index % colors.length],
                  transform: [
                    { rotate: `${startAngle}deg` },
                    { translateX: 0 },
                    { translateY: 0 },
                  ],
                  width: percentage > 10 ? '100%' : `${percentage * 2}%`,
                  height: percentage > 10 ? '100%' : `${percentage * 2}%`,
                  borderRadius: percentage > 50 ? 0 : percentage > 10 ? 50 : 5,
                  opacity: percentage / 100,
                  position: 'absolute',
                  top: percentage < 10 ? `${50 - percentage}%` : 0,
                  left: percentage < 10 ? `${50 - percentage}%` : 0,
                  zIndex: Math.floor(percentage),
                }
              ]} />
            );
            
            startAngle = endAngle;
            return result;
          })}
        </View>
        
        <View style={styles.pieChartLegend}>
          {Object.entries(data).map(([key, value], index) => {
            const percentage = (value / total) * 100;
            return (
              <View key={key} style={styles.pieLegendItem}>
                <View style={[styles.pieLegendColor, { backgroundColor: colors[index % colors.length] }]} />
                <Text style={styles.legendLabel}>{key}</Text>
                <Text style={styles.legendValue}>{percentage.toFixed(1)}%</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Add a component to render the comments chart
  const renderCommentsChart = () => {
    if (!insights) return null;
    
    const maxValue = Math.max(...insights.commentsByDay);
    
    return (
      <View style={styles.commentsChartContainer}>
        {insights.commentsByDay.map((value, index) => {
          const height = (value / maxValue) * 100;
          return (
            <View key={index} style={styles.commentsChartColumn}>
              <View style={styles.commentsChartBarWrapper}>
                <View 
                  style={[
                    styles.commentsChartBar, 
                    { 
                      height: `${height}%`,
                      backgroundColor: '#1877F2',
                    }
                  ]} 
                />
              </View>
              <Text style={styles.commentsChartLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  // Add a component to render points distribution
  const renderPointsDistribution = () => {
    if (!insights) return null;
    
    return (
      <View style={styles.pointsDistributionContainer}>
        {insights.pointsDistribution.map((item, index) => (
          <View key={index} style={styles.pointsDistributionItem}>
            <View style={styles.pointsDistributionInfo}>
              <Text style={styles.pointsValue}>{item.points} points</Text>
              <Text style={styles.pointsUserCount}>{item.userCount} users</Text>
            </View>
            <View style={styles.pointsBarContainer}>
              <View 
                style={[
                  styles.pointsBar, 
                  { 
                    width: `${(item.userCount / Math.max(...insights.pointsDistribution.map(i => i.userCount))) * 100}%`,
                    backgroundColor: getPointsColor(item.points),
                  }
                ]} 
              />
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Helper function to get color based on points value
  const getPointsColor = (points: number): string => {
    if (points >= 20) return '#00C853';
    if (points >= 15) return '#2196F3';
    if (points >= 10) return '#FFC107';
    return '#FF9800';
  };

  // Format relative time for comments
  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffMonth / 12);
    
    if (diffYear > 0) return `${diffYear}y ago`;
    if (diffMonth > 0) return `${diffMonth}mo ago`;
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHour > 0) return `${diffHour}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'Just now';
  };
  
  // Helper to navigate to the Comments Detail page instead of showing a modal
  const handleViewComments = () => {
    // If we have no comments, don't navigate
    if (!insights?.comments || insights.comments.length === 0) return;
    
    // Navigate to the insights-comment-detail page with the videoId and insights data
    router.push({
      pathname: '/insights-comment-detail' as any,
      params: { 
        videoId,
        videoTitle: videoData?.title || 'Video'
      }
    });
  };
  
  // Close the comments screen
  const handleCloseCommentsScreen = () => {
    setShowCommentsScreen(false);
    // Reset selected user when closing
    setSelectedUser(null);
  };

  // Render the Comments Screen as a modal
  const renderCommentsScreen = () => {
    if (!showCommentsScreen || !insights) return null;
    
    return (
      <View style={styles.commentsScreenContainer}>
        <SafeAreaView style={styles.commentsScreenSafeArea}>
          <View style={styles.commentsScreenHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleCloseCommentsScreen}
            >
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Comment Details</Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
        
        {!selectedUser ? (
          // User list view
          <FlatList
            data={getUsersList()}
            keyExtractor={(item) => item.user.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.commentUserItem}
                onPress={() => setSelectedUser(item.user.id)}
              >
                <Image 
                  source={{ 
                    uri: item.user.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' 
                  }} 
                  style={styles.commentAvatar} 
                />
                
                <View style={styles.commentUserInfo}>
                  <View style={styles.userNameContainer}>
                    <Text style={styles.commentUsername}>{item.user.username}</Text>
                    {item.user.isVerified && <TunnelVerifiedMark size={12} />}
                  </View>
                  <Text style={styles.commentCountText}>
                    {item.count} {item.count === 1 ? 'comment' : 'comments'}
                  </Text>
                </View>
                
                <View style={styles.userDetailButton}>
                  <ChevronRight color="#888" size={18} />
                </View>
              </TouchableOpacity>
            )}
            ListHeaderComponent={
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Users who commented</Text>
                <Text style={styles.commentsSubtitle}>
                  {getUsersList().length} {getUsersList().length === 1 ? 'user' : 'users'} left {insights.comments.length} {insights.comments.length === 1 ? 'comment' : 'comments'}
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.commentsListContent}
          />
        ) : (
          // User's comments view
          <FlatList
            data={getUserComments()}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentTime}>
                      {formatRelativeTime(item.createdAt)}
                    </Text>
                  </View>
                  
                  <Text style={styles.commentText}>{item.text}</Text>
                  
                  <View style={styles.commentActions}>
                    <View style={styles.commentAction}>
                      <Heart size={14} color="#888" />
                      <Text style={styles.commentActionText}>{item.likes}</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.replyButton}
                      onPress={() => {
                        DeviceEventEmitter.emit('SHOW_TOAST', {
                          message: 'Reply feature coming soon',
                          type: 'info'
                        });
                      }}
                    >
                      <Text style={styles.replyButtonText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            ListHeaderComponent={
              <View style={styles.userCommentsHeader}>
                <TouchableOpacity 
                  style={styles.backToUsersButton}
                  onPress={() => setSelectedUser(null)}
                >
                  <ArrowLeft color="#1877F2" size={18} />
                  <Text style={styles.backToUsersText}>All Users</Text>
                </TouchableOpacity>
                
                <View style={styles.selectedUserInfo}>
                  <Image 
                    source={{ 
                      uri: getUserComments()[0]?.user.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' 
                    }} 
                    style={styles.selectedUserAvatar} 
                  />
                  <View style={styles.selectedUserNameContainer}>
                    <Text style={styles.selectedUserName}>{getUserComments()[0]?.user.username}</Text>
                    {getUserComments()[0]?.user.isVerified && <TunnelVerifiedMark size={14} />}
                  </View>
                  <Text style={styles.selectedUserCommentsCount}>
                    {getUserComments().length} {getUserComments().length === 1 ? 'comment' : 'comments'}
                  </Text>
                </View>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.commentsListContent}
          />
        )}
      </View>
    );
  };
  
  // Helper to get comments for selected user
  const getUserComments = () => {
    if (!insights || !selectedUser) return [];
    return insights.comments.filter(comment => comment.user.id === selectedUser);
  };
  
  // Helper to get the list of users who commented
  const getUsersList = () => {
    if (!insights) return [];
    
    // Group comments by user
    const commentsByUser = new Map<string, {
      user: {
        id: string;
        username: string;
        avatar: string | null;
        isVerified: boolean;
      },
      count: number
    }>();
    
    // Count comments per user
    insights.comments.forEach(comment => {
      const userId = comment.user.id;
      if (commentsByUser.has(userId)) {
        const userData = commentsByUser.get(userId)!;
        userData.count += 1;
        commentsByUser.set(userId, userData);
      } else {
        commentsByUser.set(userId, {
          user: comment.user,
          count: 1
        });
      }
    });
    
    // Convert to array and sort by comment count (most active first)
    return Array.from(commentsByUser.values())
      .sort((a, b) => b.count - a.count);
  };
  
  // Simplified version for the main ScrollView - just shows users who commented
  const renderCommentsPreview = () => {
    if (!insights || !insights.comments || insights.comments.length === 0) {
      return (
        <View style={styles.emptyCommentsContainer}>
          <MessageCircle color="#333" size={40} />
          <Text style={styles.emptyCommentsText}>No Comments Yet</Text>
          <Text style={styles.emptyCommentsSubtext}>
            Comments on your video will appear here.
          </Text>
        </View>
      );
    }
    
    // Show a simpler preview with a call to action
    const usersList = getUsersList().slice(0, 5); // Just show top 5 users
    const totalCommenters = getUsersList().length;
    
    return (
      <View style={styles.commentsDetailContainer}>
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>Users who commented</Text>
          <Text style={styles.commentsSubtitle}>
            {totalCommenters} users left {insights.comments.length} comments
          </Text>
        </View>
        
        {usersList.map(item => (
          <View key={item.user.id} style={styles.commentUserItem}>
            <Image 
              source={{ 
                uri: item.user.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' 
              }} 
              style={styles.commentAvatar} 
            />
            
            <View style={styles.commentUserInfo}>
              <View style={styles.userNameContainer}>
                <Text style={styles.commentUsername}>{item.user.username}</Text>
                {item.user.isVerified && <TunnelVerifiedMark size={12} />}
              </View>
              <Text style={styles.commentCountText}>
                {item.count} {item.count === 1 ? 'comment' : 'comments'}
              </Text>
            </View>
          </View>
        ))}
        
        <TouchableOpacity 
          style={styles.viewAllCommentsButton}
          onPress={handleViewComments}
        >
          <Text style={styles.viewAllCommentsText}>
            {totalCommenters > 5 ? `View All Comments (${totalCommenters})` : 'View All Comments'}
          </Text>
          <ChevronRight color="#1877F2" size={16} />
        </TouchableOpacity>
      </View>
    );
  };
  
  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877F2" />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#FFF" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Video Insights</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Video preview */}
        {videoData && (
          <View style={styles.videoPreview}>
            <Image 
              source={{ uri: videoData.thumbnail || 'https://via.placeholder.com/400x225' }} 
              style={styles.videoThumbnail}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              style={styles.thumbnailOverlay}
            />
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle} numberOfLines={2}>{videoData.title}</Text>
              <View style={styles.videoMetaRow}>
                <View style={styles.authorInfo}>
                  <Image 
                    source={{ uri: videoData.authorAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
                    style={styles.authorAvatar} 
                  />
                  <View style={styles.authorNameContainer}>
                    <Text style={styles.authorName}>{videoData.author || 'You'}</Text>
                    <TunnelVerifiedMark size={14} />
                  </View>
                </View>
                <Text style={styles.uploadDate}>
                  {videoData.createdAt ? new Date(videoData.createdAt).toLocaleDateString() : 'Recently'}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Time period selector */}
        <TimeSelector />
        
        {/* Key metrics grid */}
        {insights && (
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Eye color="#1877F2" size={20} />
              </View>
              <Text style={styles.metricValue}>{formatNumber(insights.viewsTotal)}</Text>
              <Text style={styles.metricLabel}>Views</Text>
              <View style={styles.metricTrend}>
                <TrendingUp color="#00C853" size={14} />
                <Text style={[styles.trendText, styles.trendPositive]}>
                  +{formatNumber(insights.viewsToday)} today
                </Text>
              </View>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <ThumbsUp color="#1877F2" size={20} />
              </View>
              <Text style={styles.metricValue}>{formatNumber(insights.likesTotal)}</Text>
              <Text style={styles.metricLabel}>Likes</Text>
              <View style={styles.metricTrend}>
                <TrendingUp color="#00C853" size={14} />
                <Text style={[styles.trendText, styles.trendPositive]}>
                  +{formatNumber(insights.likesToday)} today
                </Text>
              </View>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <MessageCircle color="#1877F2" size={20} />
              </View>
              <Text style={styles.metricValue}>{formatNumber(insights.commentsTotal)}</Text>
              <Text style={styles.metricLabel}>Comments</Text>
              <View style={styles.metricTrend}>
                <TrendingUp color="#00C853" size={14} />
                <Text style={[styles.trendText, styles.trendPositive]}>
                  +{formatNumber(insights.commentsTrend)} new
                </Text>
              </View>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Clock color="#1877F2" size={20} />
              </View>
              <Text style={styles.metricValue}>{insights.watchTime}%</Text>
              <Text style={styles.metricLabel}>Watch Time</Text>
              <View style={styles.metricTrend}>
                <Text style={styles.avgText}>Avg. completion</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Engagement chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>View Count by Date</Text>
            <Calendar color="#1877F2" size={20} />
          </View>
          
          {insights && renderBarChart()}
          
          <Text style={styles.chartCaption}>Daily views for the last 14 days</Text>
        </View>
        
        {/* User Likes Section */}
        {insights && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Likers</Text>
              <Heart color="#1877F2" size={20} />
            </View>
            
            <View style={styles.likersContainer}>
              {insights.topLikers.length > 0 ? (
                <>
                  {insights.topLikers.slice(0, 5).map((liker, index) => (
                    <View key={liker.userId} style={styles.likerItem}>
                      <View style={styles.likerRank}>
                        <Text style={styles.likerRankText}>{index + 1}</Text>
                      </View>
                      <Image source={{ uri: liker.avatar }} style={styles.likerAvatar} />
                      <View style={styles.likerInfo}>
                        <Text style={styles.likerUsername}>{liker.username}</Text>
                        <View style={styles.likesRow}>
                          <Heart color="#FF4D67" size={12} fill="#FF4D67" />
                          <Text style={styles.likerLikesCount}>{liker.likeCount} likes</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  
                  <TouchableOpacity 
                    style={styles.viewAllLikersButton}
                    onPress={() => router.push({
                      pathname: "/insights-likers-detail",
                      params: { 
                        videoId: videoId,
                        videoTitle: videoData?.title || "Video"
                      }
                    } as any)}
                  >
                    <Text style={styles.viewAllLikersText}>
                      {insights.topLikers.length > 5 ? `View All (${insights.topLikers.length})` : 'View All Likers'}
                    </Text>
                    <ChevronRight color="#1877F2" size={16} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.emptyLikersContainer}>
                  <Heart color="#333" size={40} />
                  <Text style={styles.emptyLikersText}>No likes yet</Text>
                  <Text style={styles.emptyLikersSubtext}>
                    When users like your video, they'll appear here.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Comments Activity Section */}
        {insights && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Comments Activity</Text>
              <MessageCircle color="#1877F2" size={20} />
            </View>
            
            {renderCommentsChart()}
            
            <Text style={styles.chartCaption}>Last 7 days comment activity</Text>
          </View>
        )}
        
        {/* Points Distribution Section */}
        {insights && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Points Earned by Users</Text>
              <Award color="#1877F2" size={20} />
            </View>
            
            {renderPointsDistribution()}
            
            <Text style={styles.chartCaption}>Distribution of points earned by users</Text>
          </View>
        )}
        
        {/* Comment Details Section - simplified preview */}
        {insights && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Comment Details</Text>
              <MessageCircle color="#1877F2" size={20} />
            </View>
            
            {renderCommentsPreview()}
          </View>
        )}
        
        {/* Recommendations section */}
        <View style={styles.recommendationsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <BarChart2 color="#1877F2" size={20} />
          </View>
          
          <View style={styles.recommendationCard}>
            <View style={styles.recommendationIcon}>
              <Clock color="#1877F2" size={24} />
            </View>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>Timing Your Posts</Text>
              <Text style={styles.recommendationText}>
                Your audience is most active between 6pm-9pm. Try posting during these hours for maximum visibility.
              </Text>
            </View>
          </View>
          
          <View style={styles.recommendationCard}>
            <View style={styles.recommendationIcon}>
              <MessageCircle color="#1877F2" size={24} />
            </View>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>Boost Engagement</Text>
              <Text style={styles.recommendationText}>
                Viewers who comment are 4x more likely to follow you. Try asking questions in your videos to encourage comments.
              </Text>
            </View>
          </View>
        </View>
        
        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
      
      {/* Modal for comments */}
      {renderCommentsScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  videoPreview: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  videoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  videoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  authorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    color: '#fff',
    fontSize: 14,
    marginRight: 4,
  },
  uploadDate: {
    color: '#ccc',
    fontSize: 12,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTimeButton: {
    backgroundColor: '#1877F2',
  },
  timeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  activeTimeButtonText: {
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(24,119,242,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    marginLeft: 4,
  },
  trendPositive: {
    color: '#00C853',
  },
  trendNegative: {
    color: '#FF3B30',
  },
  avgText: {
    color: '#999',
    fontSize: 12,
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  barChartWrapper: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  barChartContainer: {
    height: 220,
    flexDirection: 'row',
  },
  yAxisLabels: {
    width: 40,
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  axisLabel: {
    color: '#888',
    fontSize: 10,
    textAlign: 'right',
    paddingRight: 5,
  },
  gridLines: {
    position: 'absolute',
    left: 40,
    right: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  gridLine: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  barsContainer: {
    flex: 1,
    alignItems: 'flex-end',
    height: '100%',
    paddingTop: 15,
    paddingBottom: 25,
  },
  barChartBarWrapper: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barChartBar: {
    height: '100%',
    justifyContent: 'flex-end',
  },
  barChartFill: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barChartLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  barChartLabelToday: {
    color: '#1877F2',
    fontWeight: '700',
  },
  barChartValueContainer: {
    position: 'absolute',
    top: -15,
    alignItems: 'center',
    width: '100%',
  },
  barChartValue: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: '#ccc',
    fontSize: 12,
  },
  chartCaption: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  pieChartContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  pieChart: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#222',
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  pieSlice: {
    position: 'absolute',
  },
  pieChartLegend: {
    marginTop: 16,
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pieLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  legendValue: {
    color: '#ccc',
    fontSize: 14,
  },
  locationList: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationName: {
    color: '#fff',
    fontSize: 14,
    width: 100,
  },
  locationBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#222',
    borderRadius: 6,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  locationBar: {
    height: '100%',
    backgroundColor: '#1877F2',
    borderRadius: 6,
  },
  locationPercentage: {
    color: '#ccc',
    fontSize: 14,
    width: 40,
    textAlign: 'right',
  },
  recommendationsSection: {
    padding: 16,
  },
  recommendationCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 12,
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(24,119,242,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendationText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  likersContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  likerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  likerRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(24,119,242,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  likerRankText: {
    color: '#1877F2',
    fontSize: 12,
    fontWeight: '700',
  },
  likerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  likerInfo: {
    flex: 1,
  },
  likerUsername: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likerLikesCount: {
    color: '#FF4D67',
    fontSize: 12,
    marginLeft: 4,
  },
  commentsChartContainer: {
    height: 200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    paddingBottom: 30,
  },
  commentsChartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  commentsChartBarWrapper: {
    width: '60%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  commentsChartBar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  commentsChartLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    position: 'absolute',
    bottom: -25,
  },
  pointsDistributionContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  pointsDistributionItem: {
    marginBottom: 16,
  },
  pointsDistributionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pointsValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pointsUserCount: {
    color: '#ccc',
    fontSize: 12,
  },
  pointsBarContainer: {
    height: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    overflow: 'hidden',
  },
  pointsBar: {
    height: '100%',
    borderRadius: 4,
  },
  emptyLikersContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 8,
    marginVertical: 8,
    height: 120,
  },
  emptyLikersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyLikersSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
  },
  commentsDetailContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
  },
  commentsHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentsSubtitle: {
    color: '#888',
    fontSize: 12,
  },
  commentsListContent: {
    paddingVertical: 8,
  },
  commentUserItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  commentUserInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 6,
  },
  commentCountText: {
    color: '#999',
    fontSize: 13,
  },
  userDetailButton: {
    padding: 8,
  },
  userCommentsHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backToUsersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backToUsersText: {
    color: '#1877F2',
    fontSize: 14,
    marginLeft: 4,
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  selectedUserNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedUserName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
  selectedUserCommentsCount: {
    color: '#888',
    fontSize: 12,
    marginLeft: 'auto',
  },
  commentItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentTime: {
    color: '#888',
    fontSize: 12,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  replyButton: {
    padding: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
  },
  replyButtonText: {
    color: '#1877F2',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyCommentsContainer: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
  },
  emptyCommentsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyCommentsSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
  },
  viewAllCommentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  viewAllCommentsText: {
    color: '#1877F2',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  commentsScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  commentsScreenSafeArea: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 100,
  },
  commentsScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewAllLikersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  viewAllLikersText: {
    color: '#1877F2',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
}); 