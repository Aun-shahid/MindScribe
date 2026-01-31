import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Animated,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import type { JournalEntry, JournalFilters } from '../services/patient.service';

export default function JournalList() {
  const { themeStyle } = useTheme();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [ordering, setOrdering] = useState<string>('-created_at');
  const [showOrderingPicker, setShowOrderingPicker] = useState(false);
  const [filters, setFilters] = useState<JournalFilters>({
    ordering: '-created_at',
  });

  useEffect(() => {
    loadEntries();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [filters]);

  const loadEntries = async () => {
    try {
      const data = await PatientService.getJournalEntries(filters);
      setEntries(data);
    } catch (err: any) {
      console.error('[JournalList] Error loading:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setFilters(prev => ({ ...prev, search: text || undefined }));
  };

  const toggleFavorites = () => {
    const newValue = !showFavoritesOnly;
    setShowFavoritesOnly(newValue);
    setFilters(prev => ({ ...prev, favorite: newValue ? 'true' : undefined }));
  };

  const handleOrdering = (order: string) => {
    setOrdering(order);
    setFilters(prev => ({ ...prev, ordering: order }));
    setShowOrderingPicker(false);
  };

  const getOrderingLabel = () => {
    switch (ordering) {
      case '-created_at': return 'Newest First';
      case 'created_at': return 'Oldest First';
      case '-updated_at': return 'Recently Updated';
      default: return 'Newest First';
    }
  };

  const getPrivacyIcon = (privacyLevel: string) => {
    switch (privacyLevel) {
      case 'private':
        return '🔒';
      case 'therapist':
        return '👨‍⚕️';
      case 'anonymous':
        return '🌐';
      default:
        return '📝';
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Journal Entry',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await PatientService.deleteJournalEntry(id);
              // Refresh the list
              loadEntries();
            } catch (err: any) {
              console.error('[JournalList] Error deleting:', err);
              Alert.alert('Error', 'Failed to delete journal entry. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderJournalCard = ({ item }: { item: JournalEntry }) => {
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const formattedTime = new Date(item.created_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}
          onPress={() => router.push(`./journal-detail?id=${item.id}` as any)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.privacyIcon}>{getPrivacyIcon(item.privacy_level)}</Text>
              {item.is_favorite && <Text style={styles.favoriteIcon}>⭐</Text>}
            </View>
            <View style={styles.headerRight}>
              <Text style={[styles.dateText, { color: themeStyle.label }]}>{formattedDate}</Text>
              <Text style={[styles.timeText, { color: themeStyle.label }]}>{formattedTime}</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: themeStyle.title }]} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={[styles.content, { color: themeStyle.text }]} numberOfLines={3}>
            {item.content}
          </Text>

          {item.tags_list && item.tags_list.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags_list.slice(0, 3).map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {item.tags_list.length > 3 && (
                <Text style={[styles.moreText, { color: themeStyle.label }]}>
                  +{item.tags_list.length - 3} more
                </Text>
              )}
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={[styles.wordCount, { color: themeStyle.label }]}>
              {item.word_count} words
            </Text>
            {item.mood_improvement !== 0 && (
              <View style={[styles.moodBadge, { backgroundColor: item.mood_improvement > 0 ? '#E8F5E9' : '#FFEBEE' }]}>
                <Text style={[styles.moodText, { color: item.mood_improvement > 0 ? '#2e7d32' : '#c62828' }]}>
                  {item.mood_improvement > 0 ? '↑' : '↓'} Mood {Math.abs(item.mood_improvement)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteIconButton}
          onPress={() => handleDelete(item.id, item.title)}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeStyle.background }]}>
        <ActivityIndicator size="large" color="#524f85" />
        <Text style={[styles.loadingText, { color: themeStyle.label }]}>
          Loading journal entries...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeStyle.title }]}>
            📚 Journal Home
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('./create-journal')}
          >
            <Text style={styles.createButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filters */}
        <View style={styles.filterSection}>
          <View style={[styles.searchBar, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: themeStyle.text }]}
              placeholder="Search journals..."
              placeholderTextColor={themeStyle.label}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: showFavoritesOnly ? '#FFD54F' : themeStyle.dashboardcard },
              ]}
              onPress={toggleFavorites}
            >
              <Text style={styles.filterIcon}>{showFavoritesOnly ? '⭐' : '☆'}</Text>
              <Text style={[styles.filterText, { color: themeStyle.text }]}>
                {showFavoritesOnly ? 'Favorites' : 'All'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.orderingButton, { backgroundColor: themeStyle.dashboardcard }]}
              onPress={() => setShowOrderingPicker(!showOrderingPicker)}
            >
              <Text style={styles.filterIcon}>🔽</Text>
              <Text style={[styles.filterText, { color: themeStyle.text }]}>
                {getOrderingLabel()}
              </Text>
            </TouchableOpacity>
          </View>

          {showOrderingPicker && (
            <View style={[styles.orderingPicker, { backgroundColor: themeStyle.dashboardcard }]}>
              <TouchableOpacity
                style={[styles.orderingOption, ordering === '-created_at' && styles.orderingOptionActive]}
                onPress={() => handleOrdering('-created_at')}
              >
                <Text style={[styles.orderingText, { color: themeStyle.text }]}>
                  Newest First
                </Text>
                {ordering === '-created_at' && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.orderingOption, ordering === 'created_at' && styles.orderingOptionActive]}
                onPress={() => handleOrdering('created_at')}
              >
                <Text style={[styles.orderingText, { color: themeStyle.text }]}>
                  Oldest First
                </Text>
                {ordering === 'created_at' && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.orderingOption, ordering === '-updated_at' && styles.orderingOptionActive]}
                onPress={() => handleOrdering('-updated_at')}
              >
                <Text style={[styles.orderingText, { color: themeStyle.text }]}>
                  Recently Updated
                </Text>
                {ordering === '-updated_at' && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Entries List */}
        {entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={[styles.emptyText, { color: themeStyle.label }]}>
              No journal entries yet
            </Text>
            <Text style={[styles.emptySubtext, { color: themeStyle.label }]}>
              Start journaling to track your thoughts
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('./create-journal')}
            >
              <Text style={styles.emptyButtonText}>✍️ Write First Entry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={entries}
            renderItem={renderJournalCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  backButton: {
    fontSize: 16,
    color: '#524f85',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  createButton: {
    backgroundColor: '#524f85',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    flex: 1,
  },
  orderingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    flex: 1,
  },
  filterIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderingPicker: {
    marginTop: 8,
    borderRadius: 12,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  orderingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  orderingOptionActive: {
    backgroundColor: '#E8F5E9',
  },
  orderingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  checkIcon: {
    fontSize: 18,
    color: '#2e7d32',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  cardWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  deleteIconButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#f44336',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  deleteIcon: {
    fontSize: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyIcon: {
    fontSize: 18,
  },
  favoriteIcon: {
    fontSize: 18,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2e7d32',
  },
  moreText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCount: {
    fontSize: 13,
  },
  moodBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#524f85',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
