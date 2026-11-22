// Chat pieces for the AI assistants: message bubbles and the message composer.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { ComponentRef, ReactNode } from 'react';
import { Icon, Row, Stack, Txt } from '@/components/ui';
import { tapFeedback } from '@/lib/haptics';
import { colors as c, fonts, radius, space } from '@/theme';

export function Bubble({
  from,
  children,
  footer,
}: {
  from: 'me' | 'bot' | 'team';
  children: ReactNode;
  footer?: ReactNode;
}) {
  const mine = from === 'me';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          maxWidth: '88%',
          backgroundColor: mine ? c.ink : from === 'team' ? c.greenSoft : c.surface,
          borderRadius: radius.lg,
          borderBottomRightRadius: mine ? 6 : radius.lg,
          borderBottomLeftRadius: mine ? radius.lg : 6,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          gap: space.sm,
        }}
      >
        {typeof children === 'string' ? (
          <Txt selectable style={{ color: mine ? c.surface : c.ink }}>
            {children}
          </Txt>
        ) : (
          children
        )}
        {footer}
      </View>
    </View>
  );
}

export function Typing() {
  return (
    <Row style={{ gap: space.sm }}>
      <ActivityIndicator size="small" color={c.muted} />
      <Txt variant="caption">L’assistant écrit…</Txt>
    </Row>
  );
}

export function Suggestions({
  items,
  onPick,
}: {
  items: readonly { text: string; fr?: string }[];
  onPick: (text: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.sm }}
    >
      {items.map((s) => (
        <Pressable
          key={s.text}
          accessibilityRole="button"
          accessibilityHint={s.fr}
          onPress={() => onPick(s.text)}
          style={({ pressed }) => ({
            backgroundColor: c.surface,
            borderRadius: radius.pill,
            paddingHorizontal: space.lg,
            paddingVertical: space.sm,
            opacity: pressed ? 0.6 : 1,
            borderWidth: 1,
            borderColor: c.line,
          })}
        >
          <Txt variant="caption" style={{ color: c.ink, fontFamily: fonts.medium }}>
            {s.text}
          </Txt>
          {s.fr && (
            <Txt variant="small" style={{ fontSize: 9 }}>
              {s.fr}
            </Txt>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** Text input with a send button and, optionally, a microphone (voice input). */
export function Composer({
  placeholder,
  onSend,
  onMic,
  listening = false,
  disabled = false,
}: {
  placeholder: string;
  onSend: (text: string) => void;
  onMic?: () => void;
  listening?: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const send = () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    onSend(value);
  };
  return (
    <Row style={{ gap: space.sm }}>
      {onMic && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? 'Écoute en cours' : 'Parler en darija'}
          onPress={() => {
            void tapFeedback();
            onMic();
          }}
          disabled={disabled}
          style={({ pressed }) => ({
            width: 52,
            height: 52,
            borderRadius: radius.pill,
            backgroundColor: listening ? c.red : c.ink,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name={listening ? 'stop' : 'mic'} color={c.surface} />
        </Pressable>
      )}
      <TextInput
        accessibilityLabel="Votre message"
        value={text}
        onChangeText={setText}
        placeholder={listening ? 'Je vous écoute…' : placeholder}
        placeholderTextColor={c.subtle}
        selectionColor={c.red}
        onSubmitEditing={send}
        returnKeyType="send"
        editable={!disabled && !listening}
        style={{
          flex: 1,
          minHeight: 52,
          backgroundColor: c.surface,
          borderRadius: radius.pill,
          paddingHorizontal: space.lg,
          fontFamily: fonts.regular,
          fontSize: 15,
          color: c.ink,
          borderWidth: 1,
          borderColor: c.line,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Envoyer"
        onPress={send}
        disabled={disabled || !text.trim()}
        style={({ pressed }) => ({
          width: 52,
          height: 52,
          borderRadius: radius.pill,
          backgroundColor: c.red,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: !text.trim() ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        <Icon name="send" color={c.surface} size={20} />
      </Pressable>
    </Row>
  );
}

/** Scroll container that follows the latest message. */
export function ChatScroll({ children, deps }: { children: ReactNode; deps: unknown }) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [deps]);
  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: space.xl,
        gap: space.md,
        width: '100%',
        maxWidth: 620,
        alignSelf: 'center',
      }}
    >
      <Stack gap={space.md}>{children}</Stack>
    </ScrollView>
  );
}
