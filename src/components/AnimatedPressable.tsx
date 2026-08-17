import { useRef } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

type Props = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  pressedScale?: number;
  haptic?: boolean;
};

export function AnimatedPressable({
  children, style, containerStyle, pressedScale = 0.96, haptic = true,
  onPressIn, onPressOut, onPress, disabled, ...props
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => Animated.spring(scale, {
    toValue, useNativeDriver: true, speed: 28, bounciness: 7,
  }).start();

  return (
    <Pressable
      accessibilityRole="button" disabled={disabled}
      style={containerStyle}
      onPressIn={(event) => { animate(pressedScale); onPressIn?.(event); }}
      onPressOut={(event) => { animate(1); onPressOut?.(event); }}
      onPress={(event) => { if (haptic) void Haptics.selectionAsync().catch(() => undefined); onPress?.(event); }}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity: disabled ? 0.48 : 1 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
