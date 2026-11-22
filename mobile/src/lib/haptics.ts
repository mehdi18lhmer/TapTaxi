import * as Haptics from 'expo-haptics';

// Haptics are best-effort: web has none, and devices may disable or lack vibration hardware.

export async function tapFeedback() {
  if (process.env.EXPO_OS === 'web') return;
  try {
    await Haptics.selectionAsync();
  } catch {}
}

export async function successFeedback() {
  if (process.env.EXPO_OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}
