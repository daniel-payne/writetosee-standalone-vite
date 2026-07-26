import { listFiles, readFile } from "@/data/storage/fileStorage";
import { loadPublication } from "@/data/managePublication";
import { writeLog } from "@/data/storage/logStorage";

function extractSceneText(text?: string): string {
  if (!text) return "";
  const match = text.match(/<scene-text>([\s\S]*?)<\/scene-text>/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return text.trim();
}

export async function clientLoader() {
  try {
    const files = await listFiles();
    const imageNames = files.filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));

    let publication: any = {};
    try {
      publication = await loadPublication();
    } catch {
      // Publication may not exist yet
    }

    const prompts = publication?.prompts || [];
    const paragraphs = publication?.paragraphs || [];

    const images = await Promise.all(imageNames.map(async name => {
      const file = await readFile(name);
      
      // Extract digest and timestamp from filename if available (e.g., images/digest_timestamp.png)
      const baseName = name.replace(/^images\//, '').replace(/\.(png|jpe?g|gif|webp|svg)$/i, '');
      const parts = baseName.split('_');
      const digest = parts[0];
      const filenameTimestamp = parts.length > 1 ? parseInt(parts[1], 10) : NaN;
      
      const creationTime = !isNaN(filenameTimestamp) ? filenameTimestamp : file.lastModified;

      // Find matching paragraph & prompt
      let text = "";
      let paragraphNo: number | undefined = undefined;

      // 1. Try to find paragraph directly by image name or digest
      const foundParagraph = paragraphs.find((p: any) => 
        p.digest === digest ||
        p.image === name ||
        p.imageUrl === name ||
        (p.images && Array.isArray(p.images) && p.images.includes(name))
      );

      if (foundParagraph) {
        text = foundParagraph.text || "";
        paragraphNo = foundParagraph.paragraphNo != null ? foundParagraph.paragraphNo + 1 : (foundParagraph.paragraphIndex != null ? foundParagraph.paragraphIndex + 1 : undefined);
      }

      // 2. If not found in paragraph directly, find prompt by digest
      if (!text) {
        const prompt = prompts.find((p: any) => p.digest === digest);
        if (prompt) {
          if (paragraphNo == null) {
            paragraphNo = prompt.paragraphNo != null ? prompt.paragraphNo + 1 : (prompt.paragraphIndex != null ? prompt.paragraphIndex + 1 : undefined);
          }
          const linkedParagraph = prompt.paragraphIndex != null ? paragraphs[prompt.paragraphIndex] : paragraphs.find((p: any) => p.paragraphNo === prompt.paragraphNo);
          if (linkedParagraph && linkedParagraph.text) {
            text = linkedParagraph.text;
          } else if (prompt.text) {
            text = extractSceneText(prompt.text);
          }
        }
      }

      return {
        name,
        url: URL.createObjectURL(file),
        lastModified: creationTime,
        text: text || undefined,
        paragraphNo,
      };
    }));

    // Sort in creation order (oldest to newest)
    images.sort((a, b) => a.lastModified - b.lastModified);

    return { images };
  } catch (error) {
    await writeLog('error', 'Images.loader', `Failed to load images: ${error instanceof Error ? error.message : String(error)}`);
    return { images: [] };
  }
}
