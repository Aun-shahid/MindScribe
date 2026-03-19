import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

export default function EmailVerified() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── Responsive tokens ─────────────────────────────────────────────────────
  // Flower moved up: much less paddingTop so it sits near the top
  const topPad       = insets.top + clamp(height * 0.018, 10, 18);
  const bottomPad    = clamp(insets.bottom + height * 0.06, 40, 60);

  // Flower — contained so text has room beneath it
  const flowerW      = clamp(width * 0.88, 240, 360);
  const flowerH      = clamp(height * 0.38, 220, 300);
 const flowerMB = -clamp(height * 0.06, 40, 60);  // text pulled much closer to flower

  // Text
  const textSize     = clamp(width * 0.064, 20, 28);
  const textLineH    = Math.round(textSize * 1.35);
  const textMB       = clamp(height * 0.38, 200, 270);  // arrow pushed 2× further down

  // Arrow button — moved down via textMB above
  const arrowSize    = clamp(width * 0.17, 56, 72);
  const arrowFontSz  = clamp(width * 0.08, 26, 34);

  return (
    <ImageBackground
      source={require('../../assets/images/newemailbg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { paddingTop: topPad, paddingBottom: bottomPad }]}>

        {/* Flower / tick — near the top */}
        <Image
          source={require('../../assets/images/emailtick.png')}
          style={{ width: flowerW, height: flowerH, resizeMode: 'contain', marginBottom: flowerMB }}
        />

        {/* Text — clearly visible below flower */}
        <Text style={[styles.text, {
          fontSize: textSize,
          lineHeight: textLineH,
          marginBottom: textMB,
        }]}>
          Your account{`\n`}was successfully created!
        </Text>

        {/* Arrow button — pushed further down by textMB */}
        <TouchableOpacity
          onPress={() => router.push('./login')}
          style={[styles.arrowButton, {
            width: arrowSize,
            height: arrowSize,
            borderRadius: arrowSize / 2,
          }]}
        >
          <Text style={[styles.arrow, { fontSize: arrowFontSz, lineHeight: arrowFontSz }]}>→</Text>
        </TouchableOpacity>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    width: '100%',
    flex: 1,
  },
  text: {
    fontWeight: '700',
    color: '#2F2A4B',
    textAlign: 'center',
    // Shadow so text is readable against any background area
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  arrowButton: {
    backgroundColor: '#524f85',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
});
