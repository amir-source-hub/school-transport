import { describe, expect, it } from 'vitest';
import { zipStream } from './zip-stream';

describe('zipStream', () => {
  it('writes a UTF-8 ZIP entry with matching local and central metadata', async () => {
    const parts: Buffer[] = [];
    for await (const part of zipStream([{ name: 'دانش‌آموز/photo.jpg', read: async () => Buffer.from('abc') }])) {
      parts.push(part as Buffer);
    }
    const archive = Buffer.concat(parts);
    const name = Buffer.from('دانش‌آموز/photo.jpg');
    const centralOffset = 30 + name.length + 3;
    expect(archive.readUInt32LE(0)).toBe(0x04034b50);
    expect(archive.readUInt32LE(14)).toBe(0x352441c2);
    expect(archive.readUInt32LE(18)).toBe(3);
    expect(archive.readUInt32LE(centralOffset)).toBe(0x02014b50);
    expect(archive.readUInt32LE(centralOffset + 16)).toBe(0x352441c2);
    expect(archive.readUInt32LE(archive.length - 22)).toBe(0x06054b50);
    expect(archive.readUInt32LE(archive.length - 6)).toBe(centralOffset);
  });
});
