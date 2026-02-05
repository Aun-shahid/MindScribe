import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const stars = [1,2,3,4,5];
  return (
    <View style={styles.row}>
      {stars.map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} style={styles.starBtn}>
          <Text style={[styles.star, { color: s <= value ? '#F6C544' : '#E5E7EB' }]}>{s <= value ? '★' : '☆'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  starBtn: { padding: 6 },
  star: { fontSize: 28 },
});
