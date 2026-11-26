import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

export function createLocalStore(file) {
  let queue = Promise.resolve();
  async function read() {
    try {
      const value = JSON.parse(await readFile(file, 'utf8'));
      if (!Array.isArray(value)) throw new Error('Invalid contributions store');
      return value;
    } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  }
  return {
    async list() {
      await queue;
      return (await read()).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)).slice(0, 100);
    },
    async create(contribution) {
      const next = queue.then(async () => {
        const existing = await read();
        existing.push(contribution);
        await mkdir(path.dirname(file), { recursive: true });
        const temporary = file + '.' + crypto.randomUUID() + '.tmp';
        await writeFile(temporary, JSON.stringify(existing, null, 2) + '\n', { mode: 0o600 });
        await rename(temporary, file);
      });
      queue = next.catch(() => {});
      return next;
    },
  };
}
