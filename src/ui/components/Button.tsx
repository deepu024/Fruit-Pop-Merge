import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '../../audio/haptics';
import { sound } from '../../audio/sound';
import { theme } from '../../config/theme';

type Props = {
  label: string;
  onPress: () => void;
  color?: string;
  icon?: ReactNode;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  badge?: string;
};

/** Chunky candy button with a springy press. */
export function Button({ label, onPress, color = theme.accent, icon, small, disabled, style, badge }: Props) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[anim, style, disabled && { opacity: 0.45 }]}>
      <Pressable
        disabled={disabled}
        onPressIn={() => (s.value = withSpring(0.92, { damping: 15, stiffness: 400 }))}
        onPressOut={() => (s.value = withSpring(1, { damping: 8, stiffness: 300 }))}
        onPress={() => {
          sound.play('click');
          haptics.tap();
          onPress();
        }}
        style={[styles.btn, small && styles.small, { backgroundColor: color }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={styles.shine} />
        {icon}
        <Text style={[styles.label, small && styles.smallLabel]}>{label}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 26,
    borderBottomWidth: 5,
    borderBottomColor: 'rgba(0,0,0,0.18)',
    minWidth: 220,
    overflow: 'hidden',
  },
  small: { paddingVertical: 10, paddingHorizontal: 16, minWidth: 0, borderRadius: 18, borderBottomWidth: 4 },
  shine: { position: 'absolute', top: 4, left: 14, right: 14, height: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.35)' },
  label: { color: theme.textLight, fontSize: 22, fontWeight: '900', letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  smallLabel: { fontSize: 16 },
  badge: { position: 'absolute', top: 2, right: 4, backgroundColor: theme.gold, borderRadius: 10, paddingHorizontal: 6, minWidth: 20, alignItems: 'center' },
  badgeText: { color: theme.text, fontWeight: '900', fontSize: 12 },
});
