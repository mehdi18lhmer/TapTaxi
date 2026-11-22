import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { StyleProp, TextInputProps, TextProps, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Host, Switch } from '@expo/ui';
import { router } from 'expo-router';
import { colors as c, fonts, radius, space, typography } from '@/theme';
import { tapFeedback } from '@/lib/haptics';
const symbols = {
  qr: { ios: 'qrcode', android: 'qr_code' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  bell: { ios: 'bell', android: 'notifications' },
  wallet: { ios: 'wallet.bifold', android: 'account_balance_wallet' },
  chart: { ios: 'chart.bar', android: 'bar_chart' },
  person: { ios: 'person', android: 'person' },
  taxi: { ios: 'car.side', android: 'local_taxi' },
  check: { ios: 'checkmark', android: 'check' },
  shield: { ios: 'checkmark.shield', android: 'verified_user' },
  card: { ios: 'creditcard', android: 'credit_card' },
  phone: { ios: 'iphone', android: 'smartphone' },
  withdraw: { ios: 'arrow.down.to.line', android: 'download' },
  bank: { ios: 'building.columns', android: 'account_balance' },
  history: { ios: 'clock.arrow.circlepath', android: 'history' },
  gift: { ios: 'gift', android: 'redeem' },
  fuel: { ios: 'fuelpump', android: 'local_gas_station' },
  file: { ios: 'doc.text', android: 'description' },
  copy: { ios: 'document.on.document', android: 'content_copy' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  search: { ios: 'magnifyingglass', android: 'search' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  delete: { ios: 'delete.left', android: 'backspace' },
  camera: { ios: 'camera', android: 'photo_camera' },
  upload: { ios: 'arrow.up.doc', android: 'upload_file' },
  help: { ios: 'questionmark.circle', android: 'help_outline' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  settings: { ios: 'gearshape', android: 'settings' },
  close: { ios: 'xmark', android: 'close' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  lock: { ios: 'lock', android: 'lock' },
  expired: { ios: 'clock.badge.xmark', android: 'timer_off' },
  volume: { ios: 'speaker.wave.2', android: 'volume_up' },
  map: { ios: 'map', android: 'map' },
  mic: { ios: 'mic.fill', android: 'mic' },
  send: { ios: 'arrow.up', android: 'send' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  users: { ios: 'person.2', android: 'group' },
  plus: { ios: 'plus', android: 'add' },
  pin: { ios: 'mappin.and.ellipse', android: 'location_on' },
  star: { ios: 'star.fill', android: 'star' },
  clock: { ios: 'clock', android: 'schedule' },
  chat: { ios: 'bubble.left.and.bubble.right', android: 'chat' },
  cash: { ios: 'banknote', android: 'payments' },
  alert: { ios: 'exclamationmark.triangle', android: 'warning' },
  plane: { ios: 'airplane', android: 'flight' },
  bed: { ios: 'bed.double', android: 'hotel' },
  train: { ios: 'tram', android: 'train' },
  flame: { ios: 'flame', android: 'local_fire_department' },
  heart: { ios: 'heart', android: 'favorite' },
  stop: { ios: 'stop.fill', android: 'stop' },
  sms: { ios: 'message', android: 'sms' },
} as const;
export type IconName = keyof typeof symbols;
export function Icon({
  name,
  size = 22,
  color = c.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <SymbolView
      name={symbols[name]}
      size={size}
      tintColor={color}
      style={{ width: size, height: size }}
    />
  );
}
export function Txt({
  variant = 'body',
  style,
  ...props
}: TextProps & { variant?: keyof typeof typography }) {
  return <Text {...props} style={[typography[variant], style]} />;
}
export function Screen({ children, center = false }: { children: ReactNode; center?: boolean }) {
  const inset = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={s.fill}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          s.screen,
          { paddingBottom: Math.max(inset.bottom, space.xxl) + space.xxl },
          center && { flexGrow: 1, justifyContent: 'center' },
        ]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Card({
  children,
  dark = false,
  style,
}: {
  children: ReactNode;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, dark && { backgroundColor: c.ink }, style]}>{children}</View>;
}
export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.row, style]}>{children}</View>;
}
export function Stack({
  children,
  gap = space.lg,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ gap }, style]}>{children}</View>;
}
export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const foreground = variant === 'primary' ? c.surface : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        void tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor:
            variant === 'primary' ? c.red : variant === 'secondary' ? c.surface : 'transparent',
          opacity: disabled || loading ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          <Txt variant="headline" style={{ color: foreground, textAlign: 'center', flexShrink: 1 }}>
            {title}
          </Txt>
          {icon && <Icon name={icon} color={foreground} size={20} />}
        </>
      )}
    </Pressable>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [s.iconButton, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name={icon} />
      {badge && (
        <View style={s.bubble}>
          <Txt variant="small" style={{ color: c.surface }}>
            {badge}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}
export function Badge({ children, neutral = false }: { children: ReactNode; neutral?: boolean }) {
  return (
    <View style={[s.badge, neutral && { backgroundColor: c.line }]}>
      {!neutral && <Icon name="check" size={12} color={c.green} />}
      <Txt variant="small" style={{ color: neutral ? c.muted : c.green }}>
        {children}
      </Txt>
    </View>
  );
}
export function Info({ children }: { children: ReactNode }) {
  return (
    <Row style={{ alignItems: 'flex-start', justifyContent: 'center' }}>
      <Icon name="shield" color={c.subtle} size={16} />
      <Txt variant="caption" style={{ color: c.muted, flexShrink: 1, fontSize: 11 }}>
        {children}
      </Txt>
    </Row>
  );
}
export function Detail({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Txt variant={strong ? 'headline' : 'caption'} style={{ flexShrink: 1 }}>
        {label}
      </Txt>
      <Txt
        selectable
        variant={strong ? 'headline' : 'body'}
        style={{ textAlign: 'right', flexShrink: 1, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Txt>
    </Row>
  );
}
export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line }} />;
}
export function Heading({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Txt variant="headline" style={{ flexShrink: 1 }}>
        {title}
      </Txt>
      {action && (
        <Pressable accessibilityRole="button" onPress={onPress} hitSlop={12}>
          <Txt variant="caption">{action}</Txt>
        </Pressable>
      )}
    </Row>
  );
}
export function Avatar({ owner = false }: { owner?: boolean }) {
  return (
    <View style={[s.avatar, owner && { backgroundColor: c.warm }]}>
      <Txt
        variant="headline"
        style={{ fontFamily: fonts.heading, color: owner ? c.muted : c.surface }}
      >
        {owner ? 'HM' : 'YB'}
      </Txt>
    </View>
  );
}
// Official TapTaxi wordmark (assets/logo, 900×262). `light` is for dark backgrounds.
const WORDMARK = require('../../assets/logo/wordmark.png');
const WORDMARK_LIGHT = require('../../assets/logo/wordmark-light.png');
const WORDMARK_RATIO = 900 / 262;

export function Logo({ height = 32, light = false }: { height?: number; light?: boolean }) {
  return (
    <Image
      source={light ? WORDMARK_LIGHT : WORDMARK}
      accessibilityRole="image"
      accessibilityLabel="TapTaxi"
      resizeMode="contain"
      style={{ height, width: height * WORDMARK_RATIO }}
    />
  );
}
export function Input({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <Stack gap={space.sm}>
      <Txt variant="caption" style={{ fontFamily: fonts.semibold, color: c.ink }}>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.subtle}
        selectionColor={c.red}
        {...props}
        style={[s.input, props.style, error ? { borderColor: c.red } : null]}
      />
      {error && (
        <Txt selectable variant="caption" style={{ color: c.red }}>
          {error}
        </Txt>
      )}
    </Stack>
  );
}
export function Chips({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: item.value === value }}
          key={item.value}
          onPress={() => onChange(item.value)}
          style={({ pressed }) => [
            s.chip,
            {
              backgroundColor: item.value === value ? c.ink : c.surface,
              opacity: pressed ? 0.65 : 1,
            },
          ]}
        >
          <Txt
            variant="caption"
            style={{ color: item.value === value ? c.surface : c.ink, fontFamily: fonts.medium }}
          >
            {item.label}
          </Txt>
        </Pressable>
      ))}
    </Row>
  );
}
export function Option({
  title,
  sub,
  icon,
  selected,
  onPress,
}: {
  title: string;
  sub: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        s.option,
        { borderColor: selected ? c.red : 'transparent', opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={s.optionIcon}>
        <Icon name={icon} color={selected ? c.red : c.ink} />
      </View>
      <Stack gap={space.xs} style={{ flex: 1 }}>
        <Txt variant="headline" style={{ fontSize: 14 }}>
          {title}
        </Txt>
        <Txt variant="caption">{sub}</Txt>
      </Stack>
      <View style={[s.radio, { borderColor: selected ? c.red : c.line }]}>
        {selected && <View style={s.radioInside} />}
      </View>
    </Pressable>
  );
}
export function MenuRow({
  title,
  sub,
  icon,
  onPress,
  accessory,
}: {
  title: string;
  sub?: string;
  icon: IconName;
  onPress?: () => void;
  accessory?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [s.menuRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={s.optionIcon}>
        <Icon name={icon} />
      </View>
      <Stack gap={space.xs} style={{ flex: 1 }}>
        <Txt variant="headline" style={{ fontSize: 14 }}>
          {title}
        </Txt>
        {sub && <Txt variant="caption">{sub}</Txt>}
      </Stack>
      {accessory || <Icon name="chevron" color={c.subtle} size={16} />}
    </Pressable>
  );
}
export function NativeToggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <Host style={{ width: 58, height: 34 }} seedColor={c.red} colorScheme="light">
      <Switch value={value} onValueChange={onChange} testID={label} />
    </Host>
  );
}
export function TaxiIdentity() {
  return (
    <Row>
      <Avatar />
      <Stack gap={space.xs} style={{ flex: 1 }}>
        <Txt variant="headline">Youssef B.</Txt>
        <Txt variant="caption">Petit taxi n° 1287 · Casablanca</Txt>
      </Stack>
      <Icon name="shield" color={c.green} />
    </Row>
  );
}
export function Plate() {
  return (
    <View style={s.plate}>
      <Txt selectable variant="heading">
        48213 | ب | 6
      </Txt>
    </View>
  );
}
export function Success() {
  return (
    <View style={s.success}>
      <Icon name="check" color={c.green} size={42} />
    </View>
  );
}
export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Stack style={{ alignItems: 'center', paddingVertical: space.hero }}>
      <Icon name="taxi" size={40} color={c.subtle} />
      <Txt variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      <Txt variant="caption" style={{ textAlign: 'center' }}>
        {body}
      </Txt>
    </Stack>
  );
}
export function BackToDriver({ id }: { id?: string }) {
  return (
    <Button
      variant="ghost"
      title="Voir côté chauffeur"
      onPress={() => router.replace(id ? `/qr/${id}` : '/(tabs)')}
    />
  );
}
/** Coloured message box: tip (neutral), success (green), warning (red). */
export function Notice({
  icon = 'sparkles',
  title,
  children,
  tone = 'neutral',
  onPress,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'dark';
  onPress?: () => void;
}) {
  const bg =
    tone === 'success'
      ? c.greenSoft
      : tone === 'warning'
        ? c.redSoft
        : tone === 'dark'
          ? c.ink
          : c.warm;
  const fg =
    tone === 'success' ? c.green : tone === 'warning' ? c.red : tone === 'dark' ? c.surface : c.ink;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [s.notice, { backgroundColor: bg, opacity: pressed ? 0.75 : 1 }]}
    >
      <Icon name={icon} size={20} color={tone === 'dark' ? c.red : fg} />
      <Stack gap={2} style={{ flex: 1 }}>
        <Txt variant="headline" style={{ fontSize: 14, color: fg }}>
          {title}
        </Txt>
        {children ? (
          <Txt variant="caption" style={{ color: tone === 'dark' ? c.lightOnDark : c.muted }}>
            {children}
          </Txt>
        ) : null}
      </Stack>
      {onPress && (
        <Icon name="chevron" size={16} color={tone === 'dark' ? c.lightOnDark : c.subtle} />
      )}
    </Pressable>
  );
}
/** Square shortcut with an icon and a label, used in grids of actions. */
export function Shortcut({
  icon,
  label,
  onPress,
  primary = false,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={() => {
        void tapFeedback();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: space.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: primary ? c.red : c.surface,
          width: 52,
          height: 52,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} color={primary ? c.surface : c.ink} />
      </View>
      <Txt variant="small" style={{ fontSize: 10, color: c.muted, textAlign: 'center' }}>
        {label}
      </Txt>
    </Pressable>
  );
}
/** Checkbox-like switch row for a boolean choice. */
export function CheckRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
    >
      <Stack gap={2} style={{ flex: 1 }}>
        <Txt variant="headline" style={{ fontSize: 14 }}>
          {label}
        </Txt>
        {sub && <Txt variant="caption">{sub}</Txt>}
      </Stack>
      <View
        style={{
          width: 50,
          height: 30,
          borderRadius: radius.pill,
          backgroundColor: value ? c.red : c.line,
          padding: 3,
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{ width: 24, height: 24, borderRadius: radius.pill, backgroundColor: c.surface }}
        />
      </View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  fill: { flex: 1, backgroundColor: c.background },
  screen: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    gap: space.lg,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: space.xl,
    gap: space.lg,
  },
  button: {
    minHeight: 54,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    position: 'absolute',
    right: 2,
    top: 0,
    backgroundColor: c.red,
    borderRadius: radius.pill,
    borderColor: c.surface,
    borderWidth: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: c.greenSoft,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: c.red,
    borderWidth: 3,
    borderColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: c.surface,
    borderColor: c.line,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderRadius: radius.md,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: c.ink,
    minHeight: 54,
  },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
  option: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    padding: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    height: 20,
    width: 20,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInside: { height: 10, width: 10, borderRadius: radius.pill, backgroundColor: c.red },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  plate: {
    borderWidth: 1.5,
    borderColor: c.line,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    alignSelf: 'center',
  },
  success: {
    height: 90,
    width: 90,
    borderRadius: radius.pill,
    backgroundColor: c.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: space.lg,
  },
});
