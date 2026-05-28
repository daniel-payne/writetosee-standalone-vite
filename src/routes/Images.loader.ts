import { listFiles, readFile } from "@/data/storage/fileStorage";

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
    console.error("Failed to load images:", error);
    return { images: [] };
  }
}
