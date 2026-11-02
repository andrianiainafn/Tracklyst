import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type { PropsWithChildren, ReactElement } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
  /** Extra props forwarded to the underlying Animated.ScrollView */
  scrollViewProps?: ScrollViewProps;
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  scrollViewProps,
}: Props) {
  const colorScheme = useColorScheme() ?? "light";
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useSharedValue(0);
  const { bottom } = useSafeAreaInsets();

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollOffset.value,
          [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
          [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75],
        ),
      },
      {
        scale: interpolate(
          scrollOffset.value,
          [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
          [2, 1, 1],
        ),
      },
    ],
  }));

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.value = e.nativeEvent.contentOffset.y;
    scrollViewProps?.onScroll?.(e);
  };

  return (
    <Animated.ScrollView
      ref={scrollRef}
      scrollEventThrottle={16}
      scrollIndicatorInsets={{ bottom }}
      contentContainerStyle={{ paddingBottom: bottom }}
      {...scrollViewProps}
      // onScroll must be after spread so our handler runs (and calls theirs)
      onScroll={handleScroll}
    >
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: headerBackgroundColor[colorScheme] },
          headerAnimatedStyle,
        ]}
      >
        {headerImage}
      </Animated.View>
      <View style={styles.content}>{children}</View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: "hidden",
  },
});
