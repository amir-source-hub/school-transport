import { Readable } from 'node:stream';

export type ZipEntry = { name: string; read: () => Promise<Buffer> };

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function zipStream(entries: ZipEntry[]): Readable {
  async function* chunks() {
    const directory: Buffer[] = [];
    let offset = 0;
    for (const entry of entries) {
      const name = Buffer.from(entry.name, 'utf8');
      const body = await entry.read();
      if (name.length > 0xffff || body.length > 0xffffffff) throw new RangeError('ZIP entry is too large.');
      const checksum = crc32(body);
      const header = Buffer.alloc(30);
      header.writeUInt32LE(0x04034b50, 0);
      header.writeUInt16LE(20, 4);
      header.writeUInt16LE(0x800, 6);
      header.writeUInt16LE(0, 8);
      header.writeUInt32LE(checksum, 14);
      header.writeUInt32LE(body.length, 18);
      header.writeUInt32LE(body.length, 22);
      header.writeUInt16LE(name.length, 26);
      const central = Buffer.alloc(46);
      central.writeUInt32LE(0x02014b50, 0);
      central.writeUInt16LE(20, 4);
      central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0x800, 8);
      central.writeUInt32LE(checksum, 16);
      central.writeUInt32LE(body.length, 20);
      central.writeUInt32LE(body.length, 24);
      central.writeUInt16LE(name.length, 28);
      central.writeUInt32LE(offset, 42);
      directory.push(central, name);
      yield header;
      yield name;
      yield body;
      offset += header.length + name.length + body.length;
      if (offset > 0xffffffff) throw new RangeError('ZIP archive is too large.');
    }
    const directorySize = directory.reduce((size, part) => size + part.length, 0);
    if (offset + directorySize > 0xffffffff || entries.length > 0xffff) throw new RangeError('ZIP archive is too large.');
    for (const part of directory) yield part;
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(directorySize, 12);
    end.writeUInt32LE(offset, 16);
    yield end;
  }
  return Readable.from(chunks());
}
