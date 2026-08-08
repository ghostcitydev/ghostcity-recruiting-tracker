import { get } from '@vercel/blob';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'dynasty-save';
}

export async function materializePrivateSave(blobUrl: string) {
  const parsed = new URL(blobUrl);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.private.blob.vercel-storage.com')) throw new Error('Invalid private dynasty upload.');
  const result = await get(blobUrl, { access: 'private' });
  if (!result || result.statusCode !== 200 || !result.stream) throw new Error('Uploaded dynasty save was not found. Please upload it again.');

  const directory = path.join(os.tmpdir(), 'ghost-city-rlt');
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${crypto.randomUUID()}-${safeFileName(result.blob.pathname)}`);
  await pipeline(Readable.fromWeb(result.stream), createWriteStream(filePath));
  return { filePath, cleanup: () => rm(filePath, { force: true }) };
}
