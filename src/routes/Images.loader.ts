import { listFiles, readFile } from "@/data/storage/fileStorage";
import { loadPublication } from "@/data/processOLD/managePublication";
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
    const panels = publication?.panels || [];

    const images = await Promise.all(imageNames.map(async name => {
      const file = await readFile(name);

      // Extract digest and timestamp from filename if available (e.g., images/digest_timestamp.png)
      const baseName = name.replace(/^images\//, '').replace(/\.(png|jpe?g|gif|webp|svg)$/i, '');
      const parts = baseName.split('_');
      const digest = parts[0];
      const filenameTimestamp = parts.length > 1 ? parseInt(parts[1], 10) : NaN;

      const creationTime = !isNaN(filenameTimestamp) ? filenameTimestamp : file.lastModified;

      // Find matching panel & prompt
      let text = "";
      let promptText = "";
      let paragraphNo: number | undefined = undefined;

      // 1. Try to find panel directly by image name or digest
      const foundPanel = panels.find((p: any) =>
        p.digest === digest ||
        p.image === name ||
        p.imageUrl === name ||
        (p.images && Array.isArray(p.images) && p.images.includes(name))
      );

      if (foundPanel) {
        text = foundPanel.text || "";
        paragraphNo = foundPanel.panelNo != null ? foundPanel.panelNo + 1 : (foundPanel.paragraphNo != null ? foundPanel.paragraphNo + 1 : undefined);
      }

      // 2. Find prompt by digest
      const matchingPrompt = prompts.find((p: any) => p.digest === digest);
      if (matchingPrompt) {
        promptText = matchingPrompt.text || "";
        if (paragraphNo == null) {
          paragraphNo = matchingPrompt.paragraphNo != null ? matchingPrompt.paragraphNo + 1 : (matchingPrompt.paragraphIndex != null ? matchingPrompt.paragraphIndex + 1 : undefined);
        }
        if (!text) {
          const linkedPanel = matchingPrompt.paragraphIndex != null ? panels[matchingPrompt.paragraphIndex] : panels.find((p: any) => p.panelNo === matchingPrompt.paragraphNo);
          if (linkedPanel && linkedPanel.text) {
            text = linkedPanel.text;
          } else if (matchingPrompt.text) {
            text = extractSceneText(matchingPrompt.text);
          }
        }
      }

      // 3. Fallback: Read prompt text file directly from storage if promptText was not in publication.prompts
      if (!promptText && digest) {
        try {
          const promptFile = await readFile(`prompts/${digest}.txt`);
          promptText = await promptFile.text();
        } catch {
          // ignore if file doesn't exist
        }
      }

      const isActive = Boolean(
        foundPanel && (foundPanel.image === name || foundPanel.imageUrl === name)
      );

      return {
        name,
        url: URL.createObjectURL(file),
        lastModified: creationTime,
        text: text || undefined,
        promptText: promptText || undefined,
        panelNo: paragraphNo,
        isActive,
        digest,
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
