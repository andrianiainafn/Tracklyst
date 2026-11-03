// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * SF Symbols → Material Icons. Every SF Symbol used in the app must be
 * listed here, otherwise the icon is blank on Android.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 */
const MAPPING: Record<string, MaterialIconName> = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'arrow.down.circle.fill': 'arrow-circle-down',
  'arrow.up.circle.fill': 'arrow-circle-up',
  'bell.fill': 'notifications',
  'checkmark.circle.fill': 'check-circle',
  'checkmark.seal.fill': 'verified',
  'exclamationmark.triangle.fill': 'warning',
  'exclamationmark.circle.fill': 'error',
  'clock.badge.exclamationmark.fill': 'schedule',
  'calendar.badge.clock': 'event',
  'calendar': 'calendar-today',
  'gearshape.fill': 'settings',
  'list.bullet.rectangle': 'receipt-long',
  'person.fill': 'person',
  'rectangle.portrait.and.arrow.right': 'logout',
  'wallet.pass.fill': 'account-balance-wallet',
  'xmark.circle.fill': 'cancel',
  'target': 'track-changes',
  'banknote': 'payments',
  'plus': 'add',
  'creditcard.fill': 'credit-card',
  'flag.fill': 'flag',
  'banknote.fill': 'savings',
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name] ?? 'radio-button-unchecked'}
      style={style}
    />
  );
}
