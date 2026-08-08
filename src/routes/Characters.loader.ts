import { processDb } from '@/data/process/db';
import { listFiles, readFile } from '@/data/storage/fileStorage';

export async function clientLoader() {
  const characters = await processDb.characters.toArray().catch(() => []);

  let images: { name: string; url: string; lastModified: number }[] = [];
  try {
    const files = await listFiles();
    const imageNames = files.filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));

    images = await Promise.all(
      imageNames.map(async (name) => {
        const file = await readFile(name);
        const baseName = name.replace(/^images\//, '').replace(/\.(png|jpe?g|gif|webp|svg)$/i, '');
        const parts = baseName.split('_');
        const filenameTimestamp = parts.length > 1 ? parseInt(parts[1], 10) : NaN;
        const creationTime = !isNaN(filenameTimestamp) ? filenameTimestamp : file.lastModified;

        return {
          name,
          url: URL.createObjectURL(file),
          lastModified: creationTime,
        };
      })
    );
    images.sort((a, b) => b.lastModified - a.lastModified);
  } catch (err) {
    console.warn('Failed to load images in Characters.loader:', err);
  }

  return { characters, images };
}
