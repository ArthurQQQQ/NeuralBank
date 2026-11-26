import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

export function createLocalSubmissionStore(file) {
  let queue = Promise.resolve();
  async function read() {
    try {
      const records = JSON.parse(await readFile(file, 'utf8'));
      if (!Array.isArray(records)) throw new Error('Invalid submission store');
      return records;
    } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  }
  return {
    async list() {
      await queue;
      return (await read()).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)).slice(0, 50);
    },
    async create(record) {
      const next = queue.then(async () => {
        const records = await read();
        const existing = records.find(item => item.authorId === record.authorId && item.contentHash === record.contentHash);
        if (existing) return { record: existing, duplicate: true };
        records.push(record);
        await mkdir(path.dirname(file), { recursive: true });
        const temporary = `${file}.${crypto.randomUUID()}.tmp`;
        await writeFile(temporary, JSON.stringify(records, null, 2) + '\n', { mode: 0o600 });
        await rename(temporary, file);
        return { record, duplicate: false };
      });
      queue = next.catch(() => {});
      return next;
    },
  };
}
