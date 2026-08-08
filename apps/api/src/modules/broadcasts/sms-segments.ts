function isBasicLatin(content: string): boolean {
  return [...content].every((character) => {
    const code = character.codePointAt(0) ?? 0;
    return character === '\n' || character === '\r' || (code >= 32 && code <= 126);
  });
}

export function smsSegmentCount(content: string): number {
  const gsm = isBasicLatin(content);
  const single = gsm ? 160 : 70;
  const concatenated = gsm ? 153 : 67;
  return content.length <= single ? 1 : Math.ceil(content.length / concatenated);
}
