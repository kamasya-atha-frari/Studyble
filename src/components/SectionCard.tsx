import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS } from '../theme/tokens';

interface SectionCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionCard({ children, style }: SectionCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
