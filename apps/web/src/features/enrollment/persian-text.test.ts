import { describe, expect, it } from 'vitest';
import {
  LATIN_KEYBOARD_MESSAGE,
  detectLatin,
  isAllowedPersianText,
  isValidPersianText,
  normalizePersianPresentation,
  persianTextMessage,
} from './persian-text';

describe('persian-text', () => {
  it('accepts Persian letters, half-space, space, and the Arabic comma', () => {
    expect(isAllowedPersianText('علی')).toBe(true);
    expect(isAllowedPersianText('محمد\u200cرضا')).toBe(true);
    expect(isAllowedPersianText('علی احمدی، پدر')).toBe(true);
    expect(isAllowedPersianText('پدر')).toBe(true);
  });

  it('rejects Latin letters, digits, and symbols', () => {
    expect(isAllowedPersianText('Ali')).toBe(false);
    expect(isAllowedPersianText('علی123')).toBe(false);
    expect(isAllowedPersianText('علی_')).toBe(false);
    expect(isAllowedPersianText('علی!')).toBe(false);
  });

  it('detects Latin letters to trigger the keyboard warning', () => {
    expect(detectLatin('Ali')).toBe(true);
    expect(detectLatin('علی')).toBe(false);
    expect(isValidPersianText('Ali')).toBe(false);
  });

  it('normalizes presentation variants without touching identity data', () => {
    expect(normalizePersianPresentation('کريم')).toBe('کریم');
    expect(normalizePersianPresentation('يک')).toBe('یک');
  });

  it('explains the keyboard switch when Latin letters are detected', () => {
    expect(persianTextMessage('Ali')).toBe(LATIN_KEYBOARD_MESSAGE);
    expect(persianTextMessage('علی123')).toBe(
      'لطفاً فقط از حروف فارسی و موارد مجاز (فاصله و ویرگول) استفاده کنید.',
    );
  });
});