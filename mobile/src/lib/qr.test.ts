import { describe, expect, it } from 'vitest';
import { paymentIdFromQr } from './qr';
describe('native QR scanner', () => {
  it('accepts TapTaxi and Expo Go payment links without opening external URLs', () => {
    expect(paymentIdFromQr('taptaxi://pay/AB12CD34')).toBe('AB12CD34');
    expect(paymentIdFromQr('exp://192.168.1.10:8081/--/pay/AB12CD34')).toBe('AB12CD34');
  });
  it('rejects unrelated codes, path injection and malformed identifiers', () => {
    for (const code of [
      'hello',
      'https://evil.test/pay/AB12CD34',
      'taptaxi://pay/../profile',
      'taptaxi://pay/AB12?redirect=evil',
      'taptaxi://pay/<script>',
    ])
      expect(paymentIdFromQr(code)).toBeNull();
  });
});
