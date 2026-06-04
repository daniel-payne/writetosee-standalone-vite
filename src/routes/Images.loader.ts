import { listFiles, readFile } from "@/data/storage/fileStorage";
import { writeLog } from "@/data/storage/logStorage";

export async function clientLoader() {
  try {
    const files = await listFiles();
    const imageNames = files.filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));

    const images = await Promise.all(imageNames.map(async name => {
      const file = await readFile(name);
      return { name, url: URL.createObjectURL(file) };
    }));

    return { images };
  } catch (error) {
    await writeLog('error', 'Images.loader', `Failed to load images: ${error instanceof Error ? error.message : String(error)}`);
    return { images: [] };
  }
}
