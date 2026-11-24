import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme/tokens';

interface EmptyStateBoxProps {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyStateBox({
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateBoxProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  actionBtn: {
    marginTop: 6,
    backgroundColor: COLORS.sageSoft,
    borderWidth: 1,
    borderColor: COLORS.sage,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sage,
  },
});
