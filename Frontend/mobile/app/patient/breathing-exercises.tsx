import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import PatientService, { RelaxationContent } from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import OriginalHeader from '../components/OriginalHeader';
import TabLoaderCard from '../components/TabLoaderCard';

export default function BreathingExercisesScreen() {
  const router = useRouter();
  const [content, setContent] = useState<RelaxationContent[]>([]);
  const [loading, setLoading] = useState(true);

  // Animated bubble references
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

  // Scroll animation for sticky header
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadContent();
    startBubbleAnimations();
  }, []);

  const createFloatingAnimation = (translateY: Animated.Value, translateX: Animated.Value, duration: number, delay: number) => {
    return Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -30,
            duration: duration,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: 20,
            duration: duration * 0.7,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: -20,
            duration: duration * 0.7,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: duration * 0.6,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
  };

  const startBubbleAnimations = () => {
    createFloatingAnimation(bubble1Y, bubble1X, 4000, 0).start();
    createFloatingAnimation(bubble2Y, bubble2X, 5000, 500).start();
    createFloatingAnimation(bubble3Y, bubble3X, 4500, 1000).start();
    createFloatingAnimation(bubble4Y, bubble4X, 5500, 1500).start();
    createFloatingAnimation(bubble5Y, bubble5X, 4800, 2000).start();
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await PatientService.getRelaxationContent({});
      const breathingExercises = data.filter(item => {
        const t = (item.title || '').toLowerCase();
        const isBreathingType = item.content_type === 'breathing' || item.category === 'breathing';
        const isBodyScanType = item.content_type === 'body_scan' || item.category === 'body_scan' || t.includes('body scan') || t.includes('body-scan');
        const isBreathTitle = t.includes('breath') || t.includes('breathing');
        return isBreathingType || isBodyScanType || isBreathTitle;
      });
      setContent(breathingExercises);
    } catch (err: any) {
      console.error('Error loading breathing exercises:', err);
      Alert.alert('Error', 'Unable to load breathing exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = (type: '5min' | '10min') => {
    // Find the appropriate content based on type
    let exercise;
    
    console.log('Total content loaded:', content.length);
    console.log('Looking for:', type);
    
    if (type === '5min') {
      // Find first breathing exercise
      exercise = content.find(item => {
        const t = (item.title || '').toLowerCase();
        const isBreathing = item.content_type === 'breathing' || 
                           item.category === 'breathing' || 
                           t.includes('breath');
        const notBodyScan = !t.includes('body scan') && !t.includes('body-scan');
        return isBreathing && notBodyScan;
      });
    } else {
      // Find first body scan exercise
      exercise = content.find(item => {
        const t = (item.title || '').toLowerCase();
        return item.content_type === 'body_scan' || 
               item.category === 'body_scan' || 
               t.includes('body scan') || 
               t.includes('body-scan');
      });
    }

    if (exercise) {
      console.log('Found exercise:', exercise.id, exercise.title);
      router.push(`./playbreathing?id=${exercise.id}`);
    } else {
      console.log('No exercise found for type:', type);
      Alert.alert('Not Available', `${type === '5min' ? 'Breathing exercise' : 'Body scan exercise'} is not available right now.`);
    }
  };

  const ContentCard = ({ 
    title, 
    description, 
    duration,
    imageName,
    onPress 
  }: { 
    title: string; 
    description: string; 
    duration: string;
    imageName: '5minbreathe' | '10minbreathe';
    onPress: () => void;
  }) => {
    // Use 5minbreathe.png for both cards
    const imageSource = require('../../assets/images/5minbreathe.png');

    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
        <Image source={imageSource} style={styles.cardImage} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{duration}</Text>
          </View>
        </View>
        <View style={styles.arrowContainer}>
          <MaterialIcons name="arrow-forward-ios" size={24} color="#B8A8E6" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <TabLoaderCard
        fullScreen
        title="Loading breathing exercises..."
        subtitle="Setting up guided calm sessions"
        spinnerColor="#B8A8E6"
      />
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#342949', '#4A3B5C', '#342949']} style={styles.gradient}>
        {/* Animated Bubbles */}
        <Animated.View style={[styles.floatingBubbles, { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }], top: '10%', left: '10%' }]}>
          <View style={[styles.bubble, { width: 60, height: 60 }]} />
        </Animated.View>
        <Animated.View style={[styles.floatingBubbles, { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }], top: '25%', right: '15%' }]}>
          <View style={[styles.bubble, { width: 80, height: 80 }]} />
        </Animated.View>
        <Animated.View style={[styles.floatingBubbles, { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }], top: '50%', left: '5%' }]}>
          <View style={[styles.bubble, { width: 70, height: 70 }]} />
        </Animated.View>
        <Animated.View style={[styles.floatingBubbles, { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }], top: '70%', right: '10%' }]}>
          <View style={[styles.bubble, { width: 90, height: 90 }]} />
        </Animated.View>
        <Animated.View style={[styles.floatingBubbles, { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }], top: '85%', left: '20%' }]}>
          <View style={[styles.bubble, { width: 65, height: 65 }]} />
        </Animated.View>

        {/* Sticky Header - Appears on scroll */}
        <StickyHeader
          scrollY={scrollY}
          firstWord="Breathing"
          secondWord="Exercises"
          onBackPress={() => router.push('./take-a-break')}
        />

        {/* Content */}
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Original Header */}
          <OriginalHeader
            scrollY={scrollY}
            firstWord="Breathing"
            secondWord="Exercises"
            onBackPress={() => router.push('./take-a-break')}
          />
          <Text style={styles.subtitle}>Guided exercises for relaxation and mindfulness</Text>

          {/* Cards */}
          <ContentCard
            title="5-Minute Breathing"
            description="Quick, calming breathing exercise perfect for stress relief and mental clarity"
            duration="5 mins"
            imageName="5minbreathe"
            onPress={() => handleCardPress('5min')}
          />

          <ContentCard
            title="10-Minute Body Scan"
            description="Deep relaxation body scan meditation to release tension and promote mindfulness"
            duration="10 mins"
            imageName="10minbreathe"
            onPress={() => handleCardPress('10min')}
          />
        </Animated.ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
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
    color: '#B8A8E6',
  },
  floatingBubbles: {
    position: 'absolute',
    zIndex: 0,
  },
  bubble: {
    borderRadius: 999,
    backgroundColor: 'rgba(133, 130, 180, 0.15)',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    zIndex: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#B8A8E6',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#473F5A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: '#D1C7E8',
    lineHeight: 18,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B8A8E6',
  },
  arrowContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});



