import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import PatientService, { RelaxationContent } from '../services/patient.service';
import TabLoaderCard from '../components/TabLoaderCard';

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  nature_sounds: '#4CAF50',
  ambient_sounds: '#9C27B0',
  meditation: '#c084fc',
  breathing: '#a78bfa',
  visualization: '#8B5CF6',
};

const matchesValue = (value: unknown, target: string) => String(value ?? '') === target;

export default function VisualizationJourneysScreen() {
  const router = useRouter();
  const [content, setContent] = useState<RelaxationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bubble animations
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


  useEffect(() => {
    load();

    // Bubble animation
    const createFloatingAnimation = (valueY: Animated.Value, valueX: Animated.Value, durationY: number, durationX: number, delay: number) => {
      return Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(valueY, {
              toValue: -30,
              duration: durationY,
              useNativeDriver: true,
            }),
            Animated.timing(valueY, {
              toValue: 0,
              duration: durationY,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(valueX, {
              toValue: 20,
              duration: durationX,
              useNativeDriver: true,
            }),
            Animated.timing(valueX, {
              toValue: -20,
              duration: durationX,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const animations = [
      createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0),
      createFloatingAnimation(bubble2Y, bubble2X, 10000, 9000, 500),
      createFloatingAnimation(bubble3Y, bubble3X, 7000, 8000, 1000),
      createFloatingAnimation(bubble4Y, bubble4X, 9000, 7500, 1500),
      createFloatingAnimation(bubble5Y, bubble5X, 8500, 8500, 2000),
    ];

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y, bubble4X, bubble4Y, bubble5X, bubble5Y]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await PatientService.getRelaxationContent({});
      // Strictly include visualization journeys: category 'visualization' or guided meditations
      // and explicitly exclude breathing/body-scan items which belong in the Breathing Exercises screen
      const items = data.filter(i => {
        const isVisualization = matchesValue(i.category, 'visualization') || matchesValue(i.content_type, 'guided_meditation');
        const isBreathing = matchesValue(i.category, 'breathing') || matchesValue(i.content_type, 'breathing') || matchesValue(i.category, 'body_scan') || matchesValue(i.content_type, 'body_scan');
        const titleLower = (i.title || '').toLowerCase();
        const titleIndicatesBreath = titleLower.includes('breath') || titleLower.includes('body scan') || titleLower.includes('body-scan');
        return isVisualization && !isBreathing && !titleIndicatesBreath;
      });
      setContent(items);
    } catch (e: any) {
      console.error('Failed to load visualizations', e);
      setError('Unable to load visualization journeys');
    } finally { setLoading(false); }
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: '#342949' }]}>
      <TabLoaderCard
        title="Loading Visualization Journeys"
        subtitle="Preparing your next guided escape"
        spinnerColor="#A78BFA"
        fullScreen={false}
        showText
      />
    </View>
  );

  if (error) return (
    <View style={[styles.center, { backgroundColor: '#342949' }]}>
      <Text style={{ color: '#FFFFFF' }}>{error}</Text>
      <TouchableOpacity style={[styles.reloadBtn, { backgroundColor: '#B8A8E6' }]} onPress={load}>
        <Text style={{ color: '#FFFFFF' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Content card component
  const ContentCard = ({ item }: { item: RelaxationContent }) => {
    const categoryColor = CATEGORY_BADGE_COLORS[item.category] || '#8B5CF6';

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`./playvisualization?id=${item.id}`)} 
      >
        <Image 
          source={require('../../assets/images/vis-journey.png')}
          style={styles.cardImage}
          resizeMode="cover"
        />
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description || item.instructions || 'A guided visualization journey.'}
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
            <Text style={styles.categoryBadgeText}>{item.category_display || 'Visualization'}</Text>
          </View>
        </View>

        <View style={styles.arrowContainer}>
          <View style={styles.playButton}>
            <MaterialIcons name="arrow-forward-ios" size={20} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#342949', '#342949', '#342949']}
        style={styles.screenGradient}
      />

      {/* Animated Bubbles */}
      <Animated.View style={[
        styles.bubble, 
        { width: 200, height: 200, top: 50, right: -50, backgroundColor: 'rgba(133, 130, 180, 0.25)' },
        { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 280, height: 280, top: -100, left: -80, backgroundColor: 'rgba(133, 130, 180, 0.2)' },
        { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 150, height: 150, bottom: 200, left: -30, backgroundColor: 'rgba(133, 130, 180, 0.22)' },
        { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 180, height: 180, bottom: 100, right: -60, backgroundColor: 'rgba(133, 130, 180, 0.18)' },
        { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 120, height: 120, top: '40%', right: 20, backgroundColor: 'rgba(133, 130, 180, 0.15)' },
        { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }
      ]} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.push('./take-a-break')}
          style={styles.backButton}
        >
          <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>
            <Text style={styles.headerWhite}>Visualization </Text>
            <Text style={styles.headerPurple}>Journeys</Text>
          </Text>
        </View>

        {/* Content List */}
        <View style={styles.contentList}>
          {content.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No visualization journeys available right now.</Text>
            </View>
          )}

          {content.map(item => (
            <ContentCard key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#342949',
  },
  screenGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 1000,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerWhite: {
    color: '#FFFFFF',
  },
  headerPurple: {
    color: '#B8A8E6',
  },
  contentList: {
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reloadBtn: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    paddingHorizontal: 24,
  },
  emptyCard: {
    backgroundColor: '#473F5A',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#473F5A',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 120,
    paddingRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: 100,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    lineHeight: 18,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 83, 80, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
