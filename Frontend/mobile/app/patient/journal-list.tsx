import { useState, useEffect, useRef, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';
import PatientService from '../services/patient.service';
import eventBus from '../utils/eventBus';
import type { JournalEntry, JournalFilters } from '../services/patient.service';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

// ── Same glass recipe as analytics stat cards ─────────────────────────────
const CARD_BG              = 'rgba(71,63,90,0.92)';
const CARD_BORDER          = 'rgba(255,255,255,0.08)';
const CARD_GRADIENT_COLORS = [
  'rgba(255,179,107,0.14)',
  'rgba(167,139,250,0.10)',
  'rgba(52,41,73,0.92)',
] as const;

export default function JournalList() {
  const { themeStyle } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const scrollY = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [ordering, setOrdering] = useState<string>('-created_at');
  const [showOrderingPicker, setShowOrderingPicker] = useState(false);
  const [filters, setFilters] = useState<JournalFilters>({
    ordering: '-created_at',
  });

  const pageInset = clamp(width * 0.03, 12, 18);
  const headerTopPadding = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding = clamp(height * 0.02, 14, 22);
  const headerButtonSize = clamp(width * 0.098, 34, 40);
  const headerButtonRadius = headerButtonSize / 2;
  const headerIconSize = clamp(width * 0.047, 16, 20);
  const headerTitleSize = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop = clamp(height * 0.022, 14, 22);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;

  const bubbleLarge = clamp(width * 0.74, 220, 320);
  const bubbleMedium = clamp(width * 0.56, 170, 260);
  const bubbleSmall = clamp(width * 0.34, 110, 160);
  const bubbleShiftY = clamp(height * 0.06, 28, 50);
  const bubbleShiftX = clamp(width * 0.08, 18, 30);

  const ctaTopMargin = clamp(height * 0.012, 8, 12);
  const ctaBottomMargin = clamp(height * 0.016, 12, 16);
  const newEntryPaddingY = clamp(height * 0.018, 12, 16);
  const newEntryRadius = clamp(width * 0.036, 12, 16);
  const newEntryTextSize = clamp(width * 0.041, 15, 17);
  const newEntryHeight = newEntryPaddingY * 2 + newEntryTextSize * 1.2;

  const filterSectionBottom = clamp(height * 0.02, 14, 18);
  const searchPaddingX = clamp(width * 0.04, 14, 18);
  const searchPaddingY = clamp(height * 0.015, 10, 13);
  const searchRadius = clamp(width * 0.055, 18, 24);
  const searchIconSize = clamp(width * 0.044, 15, 18);
  const searchIconGap = clamp(width * 0.02, 6, 8);
  const searchTextSize = clamp(width * 0.04, 14, 16);
  const searchBarHeight = searchPaddingY * 2 + searchTextSize * 1.2;
  const searchBottomMargin = clamp(height * 0.015, 10, 14);

  const pillPaddingX = clamp(width * 0.035, 12, 15);
  const pillPaddingY = clamp(height * 0.013, 8, 10);
  const pillRadius = clamp(width * 0.05, 16, 20);
  const pillGap = clamp(width * 0.025, 8, 10);
  const pillIconSize = clamp(width * 0.034, 11, 13);
  const pillTextSize = clamp(width * 0.036, 13, 14);
  const pillChevronSize = clamp(width * 0.04, 13, 15);
  const filterRowGap = clamp(width * 0.03, 10, 12);

  const clearButtonSize = clamp(width * 0.092, 34, 38);
  const clearIconSize = clamp(width * 0.036, 13, 15);

  const orderingPickerWidth = clamp(width * 0.5, 190, 230);
  const orderingOptionPaddingY = clamp(height * 0.015, 10, 12);
  const orderingOptionPaddingX = clamp(width * 0.04, 14, 16);
  const orderingTextSize = clamp(width * 0.039, 14, 15);
  const orderingOverlayTop = headerEstimatedHeight + ctaTopMargin + newEntryHeight + ctaBottomMargin + searchBarHeight + searchBottomMargin + clamp(height * 0.08, 54, 76);

  const listTopPadding = headerEstimatedHeight + clamp(height * 0.03, 18, 26);
  const listBottomPadding = clamp(height * 0.024, 18, 24);
  const cardSpacing = clamp(height * 0.016, 10, 14);
  const cardSideInset = clamp(width * 0.012, 4, 8);
  const cardPadding = clamp(width * 0.04, 14, 16);
  const cardRadius = clamp(width * 0.04, 14, 16);
  const accentStripH = 3;

  const titleSize = clamp(width * 0.042, 15, 17);
  const titleLineHeight = Math.round(titleSize * 1.34);
  const bodySize = clamp(width * 0.037, 13, 15);
  const bodyLineHeight = Math.round(bodySize * 1.42);
  const metaSize = clamp(width * 0.031, 11, 12);
  const metaLineHeight = Math.round(metaSize * 1.3);
  const titleToDateGap = clamp(height * 0.006, 4, 6);
  const dateToContentGap = clamp(height * 0.012, 8, 10);
  const titleIconGap = clamp(width * 0.02, 6, 8);
  const titleRightReserve = clamp(width * 0.09, 30, 38);
  const leftIconSize = headerIconSize * 0.9;
  const favoriteIconSize = headerIconSize * 0.8;
  const favoriteTopOffset = clamp(height * 0.014, 6, 10);
  const favoriteRightOffset = clamp(width * 0.03, 10, 15);
  const tagTextSize = clamp(width * 0.029, 10, 11);
  const tagPaddingY = clamp(height * 0.006, 4, 5);
  const tagPaddingX = clamp(width * 0.02, 7, 8);
  const tagRadius = clamp(width * 0.03, 10, 12);
  const tagsGap = clamp(width * 0.017, 5, 7);
  const tagsBottomGap = clamp(height * 0.01, 6, 8);
  const footerTextSize = clamp(width * 0.033, 11, 12);
  const emptyIconSize = clamp(width * 0.12, 40, 48);
  const emptyTitleSize = clamp(width * 0.048, 17, 19);
  const emptySubtitleSize = clamp(width * 0.038, 13, 15);
  const emptyButtonPaddingY = clamp(height * 0.016, 10, 12);
  const emptyButtonPaddingX = clamp(width * 0.05, 18, 22);
  const emptyButtonRadius = clamp(width * 0.04, 14, 16);
  const emptyButtonTextSize = clamp(width * 0.04, 14, 16);

  // Floating bubble animations
  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble1X = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble2X = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;
  const bubble3X = useRef(new Animated.Value(0)).current;
  const bubble4Y = useRef(new Animated.Value(0)).current;
  const bubble4X = useRef(new Animated.Value(0)).current;
  const bubble5Y = useRef(new Animated.Value(0)).current;
  const bubble5X = useRef(new Animated.Value(0)).current;

  const loadEntries = useCallback(async () => {
    try {
      const data = await PatientService.getJournalEntries(filters);
      setEntries(data);
    } catch (err: any) {
      console.error('[JournalList] Error loading:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadEntries();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const onJournalUpdated = () => { setRefreshing(true); loadEntries(); };
    const off = eventBus.subscribe('journalUpdated', onJournalUpdated);
    return () => off();
  }, [fadeAnim, loadEntries]);

  useEffect(() => {
    const createFloatingAnimation = (
      valueY: Animated.Value, valueX: Animated.Value,
      durationY: number, durationX: number, delayY = 0, delayX = 0
    ) => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.delay(delayY),
            Animated.timing(valueY, { toValue: bubbleShiftY, duration: durationY, useNativeDriver: true }),
            Animated.timing(valueY, { toValue: -bubbleShiftY, duration: durationY, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(delayX),
            Animated.timing(valueX, { toValue: bubbleShiftX, duration: durationX, useNativeDriver: true }),
            Animated.timing(valueX, { toValue: -bubbleShiftX, duration: durationX, useNativeDriver: true }),
          ]),
        ])
      ).start();
    };
    createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0, 500);
    createFloatingAnimation(bubble2Y, bubble2X, 9000, 8500, 1000, 1500);
    createFloatingAnimation(bubble3Y, bubble3X, 10000, 9000, 500, 0);
    createFloatingAnimation(bubble4Y, bubble4X, 8500, 10000, 1500, 1000);
    createFloatingAnimation(bubble5Y, bubble5X, 9500, 8000, 0, 2000);
  }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y, bubble4X, bubble4Y, bubble5X, bubble5Y, bubbleShiftX, bubbleShiftY]);

  const onRefresh = () => { setRefreshing(true); loadEntries(); };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setFilters(prev => ({ ...prev, search: text || undefined }));
  };

  const handleOrdering = (order: string) => {
    setOrdering(order);
    setFilters(prev => ({ ...prev, ordering: order }));
    setShowOrderingPicker(false);
  };

  const getOrderingLabel = () => {
    switch (ordering) {
      case '-created_at':  return 'Newest First';
      case 'created_at':   return 'Oldest First';
      case '-updated_at':  return 'Recently Updated';
      default:             return 'Newest First';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setShowFavoritesOnly(false);
    setOrdering('-created_at');
    setShowOrderingPicker(false);
    setFilters({ ordering: '-created_at' });
  };

  // ── Journal card — analytics glass style ─────────────────────────────────
  const renderJournalCard = ({ item }: { item: JournalEntry }) => {
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    const formattedTime = new Date(item.created_at).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    });
    const hasMoreContent = (item.content || '').trim().length > 120;
    const tagsList: string[] = (item as any).mood_tags_list || item.tags_list || [];

    // Pick a subtle accent colour per entry based on first tag or fallback
    const accentColor = item.is_favorite ? '#FFB36B' : '#A78BFA';

    return (
      <View style={[styles.cardWrapper, { marginBottom: cardSpacing, marginHorizontal: cardSideInset }]}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.card,
            {
              backgroundColor: CARD_BG,
              borderColor: CARD_BORDER,
              borderRadius: cardRadius,
              overflow: 'hidden',
            },
          ]}
          onPress={() => router.push(`./journal-detail?id=${item.id}` as any)}
        >
          {/* ── Glass gradient overlay (same as analytics) ── */}
          <LinearGradient
            colors={CARD_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: cardRadius }]}
            pointerEvents="none"
          />

          {/* ── Top accent strip ── */}
          <View
            style={{
              height: accentStripH,
              backgroundColor: accentColor,
              position: 'absolute',
              top: 0, left: 0, right: 0,
            }}
          />

          {/* ── Favourite star ── */}
          {item.is_favorite && (
            <FontAwesome
              name="star"
              size={favoriteIconSize}
              color="#FFB36B"
              style={[styles.favoritePinned, { top: favoriteTopOffset + accentStripH, right: favoriteRightOffset }]}
            />
          )}

          <View style={{ padding: cardPadding, paddingTop: cardPadding + accentStripH }}>
            {/* Title row */}
            <View style={styles.cardHeader}>
              <FontAwesome name="pencil" size={leftIconSize} color="#B8A8E6" style={styles.privacyIcon} />
              <View style={[styles.titleMetaWrap, { marginLeft: titleIconGap }]}>
                <Text
                  style={[styles.titleInline, { color: '#FFFFFF', fontSize: titleSize, lineHeight: titleLineHeight, paddingRight: titleRightReserve }]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </View>
            </View>

            {/* Date */}
            <Text style={[styles.cardDateBelow, { color: '#B8A8E6', fontSize: metaSize, lineHeight: metaLineHeight, marginTop: titleToDateGap }]}>
              {formattedDate} · {formattedTime}
            </Text>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: clamp(height * 0.01, 6, 8) }} />

            {/* Content preview */}
            <Text
              style={[styles.content, { color: '#E5E5E5', fontSize: bodySize, lineHeight: bodyLineHeight, marginBottom: clamp(height * 0.006, 4, 6) }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.content}
            </Text>
            {hasMoreContent && (
              <Text style={[styles.contentMoreHint, { color: '#B8A8E6', fontSize: metaSize, lineHeight: metaLineHeight, marginBottom: tagsBottomGap }]}>
                ... tap to see more
              </Text>
            )}

            {/* Tags */}
            {tagsList.length > 0 && (
              <View style={[styles.tagsContainer, { gap: tagsGap, marginBottom: tagsBottomGap }]}>
                {tagsList.slice(0, 3).map((tag: string, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: 'rgba(255,179,107,0.12)',
                        borderColor: 'rgba(255,179,107,0.28)',
                        paddingVertical: tagPaddingY,
                        paddingHorizontal: tagPaddingX,
                        borderRadius: tagRadius,
                      },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: '#FFB36B', fontSize: tagTextSize }]}>{tag}</Text>
                  </View>
                ))}
                {tagsList.length > 3 && (
                  <Text style={[styles.moreText, { color: '#B8A8E6', fontSize: footerTextSize }]}>
                    +{tagsList.length - 3} more
                  </Text>
                )}
              </View>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
              <Text style={[styles.wordCount, { color: '#9D8EC7', fontSize: footerTextSize }]}>
                {(() => {
                  const wc = item.word_count ?? (item.content ? item.content.trim().split(/\s+/).filter(Boolean).length : 0);
                  return `${wc}${wc === 1 ? ' word' : ' words'}`;
                })()}
              </Text>
              {typeof item.mood_improvement === 'number' && !isNaN(item.mood_improvement) && item.mood_improvement !== 0 && (
                <View style={[styles.moodBadge, {
                  backgroundColor: item.mood_improvement > 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                  borderColor: item.mood_improvement > 0 ? 'rgba(74,222,128,0.30)' : 'rgba(248,113,113,0.30)',
                  borderWidth: 1,
                  paddingHorizontal: tagPaddingX,
                  paddingVertical: tagPaddingY,
                  borderRadius: tagRadius,
                }]}>
                  <Text style={[styles.moodText, { color: item.mood_improvement > 0 ? '#4ADE80' : '#F87171', fontSize: footerTextSize }]}>
                    {item.mood_improvement > 0 ? '↑' : '↓'} Mood {Math.abs(item.mood_improvement)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#342949' }]}>
        <TabLoaderCard
          title="Loading Journal"
          subtitle="Fetching your journal entries..."
          spinnerColor="#A78BFA"
          fullScreen
        />
      </View>
    );
  }

  const listHeader = (
    <>
      {/* Gradient CTA */}
      <View style={[styles.ctaWrap, { paddingHorizontal: pageInset, marginTop: ctaTopMargin, marginBottom: ctaBottomMargin }]}>
        <TouchableOpacity
          onPress={() => router.push('/patient/create-journal')}
          style={[styles.newEntryButton, { paddingVertical: newEntryPaddingY, borderRadius: newEntryRadius }]}
        >
          <Text style={[styles.newEntryText, { fontSize: newEntryTextSize }]}>+ New Journal Entry</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filters */}
      <View style={[styles.filterSection, { paddingHorizontal: pageInset, marginBottom: filterSectionBottom }]}>
        <View style={[styles.searchBar, {
          backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)',
          paddingHorizontal: searchPaddingX, paddingVertical: searchPaddingY,
          borderRadius: searchRadius, marginBottom: searchBottomMargin,
        }]}>
          <FontAwesome5 name="search" size={searchIconSize} color="#B8A8E6" style={[styles.searchIcon, { marginRight: searchIconGap }]} />
          <TextInput
            style={[styles.searchInput, { color: '#FFFFFF', fontSize: searchTextSize }]}
            placeholder="Search journals..."
            placeholderTextColor="#B8A8E6"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        <View style={[styles.filterRow, { gap: filterRowGap }]}>
          <View style={styles.filterRowLeft}>
            <TouchableOpacity
              style={[styles.pill, !showFavoritesOnly ? styles.pillActive : styles.pillInactive, { paddingHorizontal: pillPaddingX, paddingVertical: pillPaddingY, borderRadius: pillRadius, marginRight: pillGap }]}
              onPress={() => { setShowFavoritesOnly(false); setFilters(prev => ({ ...prev, favorite: undefined })); }}
            >
              <FontAwesome5 name="layer-group" size={pillIconSize} color="#FFFFFF" style={[styles.pillIcon, { marginRight: searchIconGap }]} />
              <Text style={[styles.pillText, { fontSize: pillTextSize }, !showFavoritesOnly ? { color: '#fff' } : { color: '#B8A8E6' }]}>All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, showFavoritesOnly ? styles.pillActive : styles.pillInactive, { paddingHorizontal: pillPaddingX, paddingVertical: pillPaddingY, borderRadius: pillRadius, marginRight: 0 }]}
              onPress={() => { setShowFavoritesOnly(true); setFilters(prev => ({ ...prev, favorite: 'true' })); }}
            >
              <FontAwesome5 name="star" solid size={pillIconSize} color="#FFFFFF" style={[styles.pillIcon, { marginRight: searchIconGap }]} />
              <Text style={[styles.pillText, { fontSize: pillTextSize }, showFavoritesOnly ? { color: '#fff' } : { color: '#B8A8E6' }]}>Favorites</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterRowRight}>
            <TouchableOpacity
              style={[styles.pillAlt, { paddingHorizontal: pillPaddingX, paddingVertical: pillPaddingY, borderRadius: pillRadius, flexShrink: 1 }]}
              onPress={() => setShowOrderingPicker(!showOrderingPicker)}
            >
              <Text style={[styles.pillText, { color: '#B8A8E6', fontSize: pillTextSize, flex: 1 }]} numberOfLines={1}>{getOrderingLabel()}</Text>
              <FontAwesome name="chevron-down" size={pillChevronSize} color="#B8A8E6" style={{ marginLeft: searchIconGap }} />
            </TouchableOpacity>

            {ordering !== '-created_at' && (
              <TouchableOpacity
                style={[styles.clearButtonActive, { width: clearButtonSize, height: clearButtonSize, borderRadius: clearButtonSize / 2, marginLeft: searchIconGap }]}
                onPress={clearFilters}
                accessibilityLabel="Clear filters"
              >
                <FontAwesome name="times" size={clearIconSize} color="#f44336" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#342949' }]}>
      <LinearGradient colors={['#342949', '#2A1F3D', '#342949']} style={styles.screenGradient} />

      <View style={styles.floatingBubbles}>
        <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, top: '10%', left: '-10%', backgroundColor: 'rgba(167,139,250,0.15)', transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleLarge, height: bubbleLarge, top: '25%', right: '-15%', backgroundColor: 'rgba(184,168,230,0.18)', transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, top: '50%', left: '10%', backgroundColor: 'rgba(167,139,250,0.13)', transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleLarge * 0.78, height: bubbleLarge * 0.78, bottom: '15%', right: '5%', backgroundColor: 'rgba(184,168,230,0.22)', transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleSmall, height: bubbleSmall, bottom: '30%', left: '-5%', backgroundColor: 'rgba(167,139,250,0.19)', transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }]} />
      </View>

      <StickyHeader
        scrollY={scrollY}
        firstWord="Journal"
        secondWord="Home"
        onBackPress={() => router.push('./actions' as any)}
      />

      <Animated.View
        style={[styles.headerContainer, {
          backgroundColor: 'transparent',
          paddingTop: headerTopPadding,
          paddingHorizontal: pageInset,
          paddingBottom: headerBottomPadding,
          opacity: scrollY.interpolate({ inputRange: [0, 100, 150], outputRange: [1, 0.5, 0], extrapolate: 'clamp' }),
        }]}
      >
        <TouchableOpacity
          style={[styles.backButton, { left: pageInset, top: headerTopPadding, width: headerButtonSize, height: headerButtonSize, borderRadius: headerButtonRadius }]}
          onPress={() => router.push('./actions' as any)}
        >
          <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: '#FFFFFF', fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
          <Text style={styles.headerWhite}>Journal</Text>
          <Text style={styles.headerPurple}> Home</Text>
        </Text>

        <TouchableOpacity
          style={[styles.analyticsButton, { backgroundColor: '#473F5A', right: pageInset, top: headerTopPadding, width: headerButtonSize, height: headerButtonSize, borderRadius: headerButtonRadius }]}
          onPress={() => router.push('./journal-analytics-detail')}
        >
          <FontAwesome name="bar-chart" size={headerIconSize * 0.9} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {showOrderingPicker && (
        <TouchableOpacity
          style={[styles.orderingBackdrop, { paddingTop: orderingOverlayTop, paddingRight: pageInset }]}
          activeOpacity={1}
          onPress={() => setShowOrderingPicker(false)}
        >
          <View style={[styles.orderingPicker, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)', width: orderingPickerWidth, borderRadius: newEntryRadius, padding: clamp(width * 0.018, 7, 8) }]}>
            {[
              { value: '-created_at', label: 'Newest First' },
              { value: 'created_at',  label: 'Oldest First' },
              { value: '-updated_at', label: 'Recently Updated' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.orderingOption, ordering === opt.value && styles.orderingOptionActive, { paddingVertical: orderingOptionPaddingY, paddingHorizontal: orderingOptionPaddingX }]}
                onPress={() => handleOrdering(opt.value)}
              >
                <Text style={[styles.orderingText, { color: themeStyle.text, fontSize: orderingTextSize }]}>{opt.label}</Text>
                {ordering === opt.value && <Text style={[styles.checkIcon, { fontSize: pillChevronSize + 3 }]}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}

      <Animated.FlatList
        style={{ flex: 1, opacity: fadeAnim }}
        data={entries}
        renderItem={renderJournalCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="book-open" size={emptyIconSize} color="#B8A8E6" style={styles.emptyEmoji} />
            <Text style={[styles.emptyText, { color: '#FFFFFF', fontSize: emptyTitleSize }]}>No journal entries yet</Text>
            <Text style={[styles.emptySubtext, { color: '#B8A8E6', fontSize: emptySubtitleSize }]}>Start journaling to track your thoughts</Text>
            <TouchableOpacity
              style={[styles.emptyButton, { paddingVertical: emptyButtonPaddingY, paddingHorizontal: emptyButtonPaddingX, borderRadius: emptyButtonRadius }]}
              onPress={() => router.push('/patient/create-journal')}
            >
              <Text style={[styles.emptyButtonText, { fontSize: emptyButtonTextSize }]}>✍️ Write First Entry</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: pageInset, paddingTop: listTopPadding, paddingBottom: listBottomPadding },
          entries.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  screenGradient:   { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  floatingBubbles:  { position: 'absolute', width: '100%', height: '100%', overflow: 'hidden' },
  bubble:           { position: 'absolute', borderRadius: 1000 },
  centerContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer:  { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900 },
  backButton: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)', zIndex: 2,
  },
  analyticsButton: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  headerTitle:  { fontWeight: '800', textAlign: 'center' },
  headerWhite:  { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },

  // ── Card ──────────────────────────────────────────────────────────────────
  cardWrapper: { position: 'relative' },
  card: {
    borderWidth: 1,
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
  },
  cardHeader:     { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start' },
  titleMetaWrap:  { flex: 1 },
  titleInline:    { fontWeight: '700', flexShrink: 1 },
  cardDateBelow:  {},
  privacyIcon:    { marginTop: 2 },
  favoritePinned: { position: 'absolute', zIndex: 2 },
  content:        {},
  contentMoreHint:{ fontWeight: '600' },
  tagsContainer:  { flexDirection: 'row', flexWrap: 'wrap' },
  tag:            { borderWidth: 1 },
  tagText:        { fontWeight: '600' },
  moreText:       { fontStyle: 'italic' },
  cardFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordCount:      {},
  moodBadge:      {},
  moodText:       { fontWeight: '600' },

  // ── List / CTA / Search ───────────────────────────────────────────────────
  listContent:      {},
  listContentEmpty: { minHeight: '100%' },
  ctaWrap:          {},
  newEntryButton:   { alignItems: 'center', justifyContent: 'center', backgroundColor: '#A78BFA' },
  newEntryText:     { color: '#fff', fontWeight: '700' },
  filterSection:    {},
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, borderWidth: 1,
  },
  searchIcon:  {},
  searchInput: { flex: 1 },
  filterRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterRowLeft:  { flexDirection: 'row', alignItems: 'center' },
  filterRowRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  pill: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  pillActive:   { backgroundColor: '#FFB36B', borderColor: '#FFB36B', shadowColor: '#FFB36B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  pillInactive: { backgroundColor: '#5B5270', borderColor: 'rgba(255,255,255,0.1)' },
  pillText:     { fontWeight: '600', color: '#616161' },
  pillIcon:     { color: '#FFFFFF' },
  pillAlt: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#5B5270', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  clearButtonActive: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#f44336', backgroundColor: 'rgba(255,255,255,0.96)',
  },
  orderingBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, alignItems: 'flex-end', justifyContent: 'flex-start',
  },
  orderingPicker: {
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, borderWidth: 1,
  },
  orderingOption:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderingOptionActive: { backgroundColor: '#5B5270' },
  orderingText:         { fontWeight: '500' },
  checkIcon:            { color: '#FFB36B' },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: '12%' },
  emptyEmoji:      { marginBottom: 16 },
  emptyText:       { fontWeight: '600', marginBottom: 8 },
  emptySubtext:    { textAlign: 'center', marginBottom: 24 },
  emptyButton:     { backgroundColor: '#FFB36B' },
  emptyButtonText: { color: '#fff', fontWeight: '600' },
});
