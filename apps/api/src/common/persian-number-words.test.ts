import { describe, expect, it } from 'vitest';
import { persianNumberWords } from './persian-number-words';

describe('persianNumberWords', () => {
  it('renders the existing contract amount and a changed amount', () => {
    expect(persianNumberWords(4_997_800)).toBe('چهار میلیون و نهصد و نود و هفت هزار و هشتصد');
    expect(persianNumberWords(6_500_000)).toBe('شش میلیون و پانصد هزار');
  });
});
