import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Search as SearchIcon, X, Play, Clock, TrendingUp, History, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock data - replace with your actual data and API calls
const RECENT_SEARCHES = [
  'dance tutorials',
  'hip hop music',
  'street performance',
];

const TRENDING_SEARCHES = [
  'contemporary dance',
  'breakdance basics',
  'ballet techniques',
  'jazz dance',
];

const MOCK_RESULTS = {
  videos: [
    {
      id: '1',
      title: 'Street Dance Performance',
      author: '@streetdancer',
      thumbnail: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc',
      duration: '3:45',
      views: '15K',
    },
    {
      id: '2',
      title: 'Urban Dance Battle',
      author: '@urbandancer',
      thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b',
      duration: '5:20',
      views: '23K',
    },
  ],
  articles: [
    {
      id: '3',
      title: 'The Evolution of Street Dance',
      author: '@danceblogger',
      thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad',
      readTime: '5 min read',
    },
    {
      id: '4',
      title: 'How to Improve Your Dance Skills',
      author: '@dancecoach',
      thumbnail: 'https://images.unsplash.com/photo-1547153760-18fc86324498',
      readTime: '8 min read',
    },
  ],
};

type SearchFilter = 'all' | 'videos' | 'articles';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();

  useEffect(() => {
    // Auto focus the search input when component mounts
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    // Show results when query is not empty
    setShowResults(searchQuery.length > 0);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Here you would typically fetch results from your API
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
  };

  const goBack = () => {
    router.back();
  };

  const renderSearchSuggestion = (suggestion: string, icon: React.ReactNode) => (
    <Pressable
      style={styles.suggestionItem}
      onPress={() => handleSearch(suggestion)}
    >
      {icon}
      <Text style={styles.suggestionText}>{suggestion}</Text>
    </Pressable>
  );

  const renderVideoResult = (video: typeof MOCK_RESULTS.videos[0]) => (
    <Pressable
      key={video.id}
      style={styles.videoResultItem}
      onPress={() => router.push(`/video-detail?id=${video.id}`)}
    >
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{video.duration}</Text>
        </View>
        <View style={styles.playButton}>
          <Play size={16} color="white" fill="white" />
        </View>
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.resultAuthor}>{video.author} • {video.views} views</Text>
      </View>
    </Pressable>
  );

  const renderArticleResult = (article: typeof MOCK_RESULTS.articles[0]) => (
    <Pressable
      key={article.id}
      style={styles.articleResultItem}
      onPress={() => router.push(`/article-detail?id=${article.id}`)}
    >
      <Image source={{ uri: article.thumbnail }} style={styles.articleThumbnail} />
      <View style={styles.articleContent}>
        <Text style={styles.resultTitle} numberOfLines={2}>{article.title}</Text>
        <Text style={styles.resultAuthor}>{article.author} • {article.readTime}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color="white" />
        </Pressable>
        
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search videos, articles..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={clearSearch} style={styles.clearButton}>
              <X size={18} color="#888" />
            </Pressable>
          )}
        </View>
      </View>

      {!showResults ? (
        <ScrollView style={styles.suggestionsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.suggestionsSection}>
            <View style={styles.sectionHeader}>
              <History size={18} color="#888" />
              <Text style={styles.sectionTitle}>Recent Searches</Text>
            </View>
            {RECENT_SEARCHES.map((search) => 
              renderSearchSuggestion(search, <Clock size={18} color="#888" style={styles.suggestionIcon} />)
            )}
          </View>

          <View style={styles.suggestionsSection}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={18} color="#888" />
              <Text style={styles.sectionTitle}>Trending Searches</Text>
            </View>
            {TRENDING_SEARCHES.map((search) => 
              renderSearchSuggestion(search, <TrendingUp size={18} color="#888" style={styles.suggestionIcon} />)
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.resultsContainer}>
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              <Pressable
                style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
              </Pressable>
              <Pressable
                style={[styles.filterButton, filter === 'videos' && styles.activeFilter]}
                onPress={() => setFilter('videos')}
              >
                <Text style={[styles.filterText, filter === 'videos' && styles.activeFilterText]}>Videos</Text>
              </Pressable>
              <Pressable
                style={[styles.filterButton, filter === 'articles' && styles.activeFilter]}
                onPress={() => setFilter('articles')}
              >
                <Text style={[styles.filterText, filter === 'articles' && styles.activeFilterText]}>Articles</Text>
              </Pressable>
            </ScrollView>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.resultsScroll}>
            {(filter === 'all' || filter === 'videos') && (
              <View style={styles.resultsSection}>
                <Text style={styles.resultsSectionTitle}>Videos</Text>
                {MOCK_RESULTS.videos.map(renderVideoResult)}
              </View>
            )}
            
            {(filter === 'all' || filter === 'articles') && (
              <View style={styles.resultsSection}>
                <Text style={styles.resultsSectionTitle}>Articles</Text>
                {MOCK_RESULTS.articles.map(renderArticleResult)}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
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
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#0A0A0A',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  suggestionsSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  resultsContainer: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  activeFilter: {
    backgroundColor: '#1877F2',
  },
  filterText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  activeFilterText: {
    color: 'white',
  },
  resultsScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsSection: {
    marginTop: 24,
  },
  resultsSectionTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  videoResultItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  thumbnailContainer: {
    width: 120,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  resultTitle: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  resultAuthor: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  articleResultItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  articleThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  articleContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
}); 