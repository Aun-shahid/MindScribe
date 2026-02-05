import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
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
import eventBus from '../utils/eventBus';
import type { JournalEntry, JournalFilters } from '../services/patient.service';

export default function JournalList() {
  const { themeStyle } = useTheme();
  // returns tag colors to match mock: blue for Sad, orange for Anxious, green for Stressed, fallback gray
  const tagStyleFor = (tag: string) => {
    const t = (tag || '').toLowerCase();
    if (t.includes('sad')) return { bg: '#E3F2FD', color: '#1976D2' };
    if (t.includes('anx') || t.includes('anxious')) return { bg: '#FFF3E0', color: '#FB8C00' };
    if (t.includes('stress') || t.includes('stressed')) return { bg: '#FFE6EA', color: '#D32F2F' };
    if (t.includes('happy') || t.includes('joy') || t.includes('joyful') || t.includes('glad')) return { bg: '#E8F5E9', color: '#2e7d32' };
    return { bg: '#F5F5F5', color: '#616161' };
  };
  // convert hex color to rgba string with alpha for subtle borders
  const hexToRgba = (hex: string, alpha = 0.15) => {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
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
    // subscribe to journal updates from other screens
    const onJournalUpdated = () => {
      setRefreshing(true);
      loadEntries();
    };
    const off = eventBus.subscribe('journalUpdated', onJournalUpdated);
    return () => off();
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

  const clearFilters = () => {
    setSearchQuery('');
    setShowFavoritesOnly(false);
    setOrdering('-created_at');
    setShowOrderingPicker(false);
    setFilters({ ordering: '-created_at' });
  };

  const getPrivacyIcon = (privacyLevel: string) => {
    switch (privacyLevel) {
      case 'private':
        return { name: 'lock', color: '#616161' };
      case 'therapist':
        return { name: 'user-md', color: '#616161' };
      case 'anonymous':
        return { name: 'globe', color: '#616161' };
      default:
        return { name: 'pencil', color: '#616161' };
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
              {(() => {
                const p = getPrivacyIcon(item.privacy_level);
                return <FontAwesome name={p.name as any} size={18} color={p.color} style={styles.privacyIcon} />;
              })()}
              {item.is_favorite && <FontAwesome name="star" size={16} color="#FFD54F" style={styles.favoriteIcon} />}
              <Text style={[styles.titleInline, { color: themeStyle.title }]} numberOfLines={2}>{item.title}</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={[styles.dateText, { color: themeStyle.label }]}>{formattedDate}</Text>
              <Text style={[styles.timeText, { color: themeStyle.label }]}>{formattedTime}</Text>
            </View>
          </View>

          <Text style={[styles.content, { color: themeStyle.text }]} numberOfLines={3}>
            {item.content}
          </Text>

          {((item as any).mood_tags_list || item.tags_list) && (((item as any).mood_tags_list || item.tags_list).length > 0) && (
            <View style={styles.tagsContainer}>
              {((item as any).mood_tags_list || item.tags_list).slice(0, 3).map((tag: string, index: number) => {
                const ts = tagStyleFor(tag);
                return (
                  <View
                    key={index}
                    style={[
                      styles.tag,
                      { backgroundColor: ts.bg, borderColor: hexToRgba(ts.color, 0.16) },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: ts.color }]}>{tag}</Text>
                  </View>
                );
              })}
              {(((item as any).mood_tags_list || item.tags_list).length > 3) && (
                <Text style={[styles.moreText, { color: themeStyle.label }]}>+{(((item as any).mood_tags_list || item.tags_list).length - 3)} more</Text>
              )}
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={[styles.wordCount, { color: themeStyle.label }]}> 
              {(() => {
                const wc = (item.word_count ?? (item.content ? item.content.trim().split(/\s+/).filter(Boolean).length : 0));
                return `${wc}${wc === 1 ? ' word' : ' words'}`;
              })()}
            </Text>
            {(typeof item.mood_improvement === 'number' && !isNaN(item.mood_improvement) && item.mood_improvement !== 0) && (
              <View style={[styles.moodBadge, { backgroundColor: item.mood_improvement > 0 ? '#E8F5E9' : '#FFEBEE' }]}>
                <Text style={[styles.moodText, { color: item.mood_improvement > 0 ? '#2e7d32' : '#c62828' }]}>
                  {item.mood_improvement > 0 ? '↑' : '↓'} Mood {Math.abs(item.mood_improvement)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Delete Button removed for list display */}
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
        {/* Header (matching SharedHeader styles) */}
        <View style={[styles.headerContainer, { backgroundColor: themeStyle.card }]}> 
          <TouchableOpacity
            style={[styles.backBtnCircle, { borderColor: 'rgba(0,0,0,0.06)' }]}
            onPress={() => router.push('/patient/dashboard')}
          >
            <FontAwesome name="arrow-left" size={16} color={themeStyle.title} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: themeStyle.title }]}> 
            <Text style={styles.headerBlue}>Journal</Text>
            <Text style={styles.headerOrange}> Home</Text>
          </Text>

          <TouchableOpacity
            style={[styles.analyticsButton, { backgroundColor: themeStyle.dashboardcard }]}
            onPress={() => router.push('./journal-analytics-detail') }
          >
            <FontAwesome name="bar-chart" size={18} color={themeStyle.title} />
          </TouchableOpacity>
        </View>

        {/* Gradient CTA */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity onPress={() => router.push('/patient/create-journal') }>
            <LinearGradient
              colors={["#FF6EA5", "#FFB870", "#2BD3B6"]}
              start={[0,0]}
              end={[1,0]}
              style={styles.newEntryGradient}
            >
              <Text style={styles.newEntryText}>+ New Journal Entry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search & Filters */}
        <View style={styles.filterSection}>
          <View style={[styles.searchBar, { backgroundColor: themeStyle.dashboardcard }]}> 
            <FontAwesome5 name="search" size={16} color={themeStyle.label} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: themeStyle.text }]}
              placeholder="Search journals..."
              placeholderTextColor={themeStyle.label}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          <View style={styles.filterRow}> 
            <View style={styles.filterRowLeft}>
              <TouchableOpacity
                style={[styles.pill, !showFavoritesOnly ? styles.pillActive : styles.pillInactive]}
                onPress={() => { setShowFavoritesOnly(false); setFilters(prev => ({ ...prev, favorite: undefined })); }}
              >
                <FontAwesome5 name="layer-group" size={12} color={!showFavoritesOnly ? '#fff' : '#616161'} style={styles.pillIcon} />
                <Text style={[styles.pillText, !showFavoritesOnly ? {color: '#fff'} : {color: '#524f85'}]}>All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pill, showFavoritesOnly ? styles.pillActive : styles.pillInactive]}
                onPress={() => { setShowFavoritesOnly(true); setFilters(prev => ({ ...prev, favorite: 'true' })); }}
              >
                <FontAwesome5 name="star" solid size={12} color={showFavoritesOnly ? '#fff' : '#616161'} style={styles.pillIcon} />
                <Text style={[styles.pillText, showFavoritesOnly ? {color: '#fff'} : {color: '#524f85'}]}>Favorites</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterRowRight}>
              {ordering !== '-created_at' && (
                <TouchableOpacity style={styles.clearButtonActive} onPress={clearFilters} accessibilityLabel="Clear filters">
                  <Text style={styles.clearX}>✕</Text>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.pillAlt}
                onPress={() => setShowOrderingPicker(!showOrderingPicker)}
              >
                <Text style={[styles.pillText, {color: '#524f85'}]}>{getOrderingLabel()}</Text>
                <FontAwesome name="chevron-down" size={14} color="#524f85" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
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
            <FontAwesome5 name="book-open" size={48} color={themeStyle.label} style={styles.emptyEmoji} />
            <Text style={[styles.emptyText, { color: themeStyle.label }]}>
              No journal entries yet
            </Text>
            <Text style={[styles.emptySubtext, { color: themeStyle.label }]}>
              Start journaling to track your thoughts
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/patient/create-journal')}
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
    // kept for legacy but headerContainer used for main layout
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
  headerContainer: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 26,
  },
  backBtnCircle: {
    position: 'absolute',
    left: 18,
    top: 52,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 20,
    textAlign: 'center',
  },
  headerBlue: { color: '#524f85' },
  headerOrange: { color: '#FF9F6B' },
  analyticsButton: {
    position: 'absolute',
    right: 18,
    top: 52,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9FB3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaWrap: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  newEntryGradient: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newEntryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#efe6f8',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  pillActive: {
    backgroundColor: '#FF9FB3',
    borderColor: '#FF9FB3',
    shadowColor: '#FF9FB3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  pillInactive: {
    backgroundColor: '#fff',
    borderColor: '#efe6f8',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#616161',
  },
  pillIcon: {
    marginRight: 8,
    fontSize: 14,
    color: '#524f85',
  },
  pillAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#efe6f8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  clearButtonActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f44336',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  clearX: {
    color: '#f44336',
    marginRight: 6,
    fontSize: 14,
    fontWeight: '700',
  },
  clearText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '700',
  },
  clearButton: {
    marginLeft: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
    position: 'relative',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#efe6f8',
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
    position: 'absolute',
    top: 120,
    right: 20,
    width: 200,
    borderRadius: 12,
    padding: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    backgroundColor: '#fff',
    zIndex: 999,
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
    padding: 16,
    paddingTop: 8,
  },
  cardWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  card: {
    padding: 12,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    alignSelf: 'center',
    width: '94%',
    borderWidth: 1,
    borderColor: '#efe6f8',
    backgroundColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  deleteIconButton: {
    // kept for future use but hidden in this list view
    display: 'none',
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  titleInline: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    flexShrink: 1,
  },
  
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  tagText: {
    fontSize: 11,
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
    fontSize: 12,
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
