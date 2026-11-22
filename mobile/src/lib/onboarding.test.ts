import { describe, expect, it } from 'vitest';
import {
  addDocument,
  documentFileError,
  documentProgress,
  formatPhone,
  isValidSmsCode,
  normalizePhone,
} from './onboarding';
import { paymentIdFromInput } from './qr';

describe('driver sign-up', () => {
  it('normalizes Moroccan mobile numbers in every common format', () => {
    for (const input of [
      '612345678',
      '0612345678',
      '6 12 34 56 78',
      '+212 612345678',
      '00212612345678',
      '06-12-34-56-78',
    ])
      expect(normalizePhone(input)).toBe('612345678');
    expect(normalizePhone('712345678')).toBe('712345678');
    expect(normalizePhone('512345678')).toBeNull();
    expect(normalizePhone('61234567')).toBeNull();
    expect(normalizePhone('+33612345678')).toBeNull();
    expect(formatPhone('612345678')).toBe('6 12 34 56 78');
  });

  it('accepts only the demo SMS code', () => {
    expect(isValidSmsCode('123456')).toBe(true);
    expect(isValidSmsCode('654321')).toBe(false);
  });

  it('checks file size and type before accepting a document', () => {
    expect(documentFileError({ size: 2_000_000, mimeType: 'image/jpeg' })).toBeNull();
    expect(documentFileError({ size: 2_000_000, mimeType: 'application/pdf' })).toBeNull();
    expect(documentFileError({ size: 11 * 1024 * 1024, mimeType: 'image/png' })).toMatch(/10 Mo/);
    expect(documentFileError({ size: 1000, mimeType: 'image/gif' })).toMatch(/JPG/);
    expect(documentFileError({ size: 1000 })).toMatch(/JPG/);
  });

  it('counts each document once and completes at four', () => {
    let docs: string[] = [];
    docs = addDocument(docs, 'photo');
    docs = addDocument(docs, 'cin');
    docs = addDocument(docs, 'cin');
    expect(docs).toEqual(['cin', 'photo']);
    expect(documentProgress(docs)).toMatchObject({ provided: 2, percent: 50, complete: false });
    docs = addDocument(addDocument(docs, 'permit'), 'vehicle');
    expect(documentProgress(docs)).toMatchObject({ provided: 4, percent: 100, complete: true });
  });

  it('reads a payment code typed by hand', () => {
    expect(paymentIdFromInput(' #ab12cd34 ')).toBe('AB12CD34');
    expect(paymentIdFromInput('AB')).toBeNull();
    expect(paymentIdFromInput('AB12/../x')).toBeNull();
  });
});
