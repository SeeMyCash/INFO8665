import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Animates a number from 0 to `target` over `durationMs`.
 * Returns the current animated integer value.
 */
export function useAnimatedCounter(target: number, durationMs: number = 800): number {
  const [display, setDisplay] = useState(0);
  const animVal = useRef(new Animated.Value(0)).current;
  const listenerRef = useRef<string | null>(null);

  useEffect(() => {
    animVal.setValue(0);

    if (listenerRef.current) {
      animVal.removeListener(listenerRef.current);
    }

    listenerRef.current = animVal.addListener(({ value }) => {
      setDisplay(Math.round(value));
    });

    Animated.timing(animVal, {
      toValue: target,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      if (listenerRef.current) {
        animVal.removeListener(listenerRef.current);
      }
    };
  }, [target, durationMs]);

  return display;
}
