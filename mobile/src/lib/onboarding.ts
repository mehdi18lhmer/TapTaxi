// Driver sign-up rules (native app). Pure functions: no React, no Expo modules.
// Mirrors the web onboarding (src/screens/Onboarding.tsx). Nothing here is sent anywhere:
// real SMS, identity checks and document storage need a server.
import type { IconName } from '@/components/ui';

/** The only code accepted by the demo; a real app would verify an SMS server-side. */
export const DEMO_SMS_CODE = '123456';
/** Seconds before "resend the code" becomes available. */
export const RESEND_SECONDS = 42;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export type DocumentId = 'cin' | 'permit' | 'vehicle' | 'photo';

/** The four documents every driver provides, in display order. */
export const REQUIRED_DOCUMENTS: { id: DocumentId; title: string; sub: string; icon: IconName }[] =
  [
    { id: 'cin', title: 'Carte nationale (CIN)', sub: 'Recto et verso', icon: 'card' },
    {
      id: 'permit',
      title: 'Permis de confiance',
      sub: 'Carte professionnelle de chauffeur',
      icon: 'file',
    },
    { id: 'vehicle', title: 'Carte grise du taxi', sub: 'Avec le numéro d’agrément', icon: 'taxi' },
    { id: 'photo', title: 'Photo de profil', sub: 'Visible par vos passagers', icon: 'camera' },
  ];

/**
 * Accepts "0612345678", "6 12 34 56 78" or "+212 612345678" and returns the 9 national
 * digits ("612345678"), or null if it is not a Moroccan mobile number.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw
    .replace(/[\s.-]/g, '')
    .replace(/^(\+212|00212)/, '')
    .replace(/^0/, '');
  return /^[67]\d{8}$/.test(digits) ? digits : null;
}

/** "612345678" → "6 12 34 56 78" */
export const formatPhone = (digits: string) =>
  digits.replace(/^(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5');

export const isValidSmsCode = (code: string) => code === DEMO_SMS_CODE;

/** Checks a picked file before marking a document as provided. Returns an error or null. */
export function documentFileError(file: { size?: number; mimeType?: string }): string | null {
  if (file.size !== undefined && file.size > MAX_DOCUMENT_BYTES)
    return 'Choisissez un fichier de moins de 10 Mo.';
  if (!file.mimeType || !ACCEPTED_DOCUMENT_TYPES.includes(file.mimeType))
    return 'Utilisez une image JPG, PNG, WebP ou un PDF.';
  return null;
}

/** Adds a document once; the order follows REQUIRED_DOCUMENTS. */
export function addDocument(documents: string[], id: DocumentId): string[] {
  const set = new Set([...documents, id]);
  return REQUIRED_DOCUMENTS.map((d) => d.id).filter((d) => set.has(d));
}

export function documentProgress(documents: string[]) {
  const provided = REQUIRED_DOCUMENTS.filter((d) => documents.includes(d.id)).length;
  return {
    provided,
    total: REQUIRED_DOCUMENTS.length,
    percent: Math.round((provided / REQUIRED_DOCUMENTS.length) * 100),
    complete: provided === REQUIRED_DOCUMENTS.length,
  };
}
