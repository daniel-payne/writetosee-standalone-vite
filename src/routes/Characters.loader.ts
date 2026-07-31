import { loadCharacters } from '@/data/process/manageCharacters';

export async function clientLoader() {
  const characters = await loadCharacters().catch(() => []);
  return { characters };
}
