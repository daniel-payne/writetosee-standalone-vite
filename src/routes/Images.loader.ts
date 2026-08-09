import { listFiles, readFile } from "@/data/storage/fileStorage";
import { processDb } from "@/data/process/db";
import { writeLog } from "@/data/storage/logStorage";

export async function clientLoader() {
  try {
    const files = await listFiles();
    const imageNames = files.filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));

    const [instructions, prompts] = await Promise.all([
      processDb.instructions.toArray().catch(() => []),
      processDb.prompts.toArray().catch(() => [])
    ]);

    const promptMap = new Map(prompts.map(p => [p.digest, p.promptText]));

    const images = await Promise.all(imageNames.map(async name => {
      const file = await readFile(name);

      const baseName = name.replace(/^images\//, '').replace(/\.(png|jpe?g|gif|webp|svg)$/i, '');
      const parts = baseName.split('_');
      const digest = parts[0];
      const filenameTimestamp = parts.length > 1 ? parseInt(parts[1], 10) : NaN;

      const creationTime = !isNaN(filenameTimestamp) ? filenameTimestamp : file.lastModified;

      let text = "";
      let promptText = promptMap.get(digest) || "";
      let paragraphNo: number | undefined = undefined;

      const foundInst = instructions.find(inst =>
        (inst.images || []).some(img => img.promptDigest === digest)
      );

      if (foundInst) {
        paragraphNo = (foundInst.instructionNo ?? foundInst.paragraph_no ?? 0) + 1;
        const instImages = foundInst.images || [];
        const activeEntry = instImages[foundInst.imageIndex ?? 0] || instImages.find(i => i.promptDigest === digest);
        if (activeEntry) {
          text = activeEntry.sceneText || activeEntry.narrativeText || "";
        }
      }

      if (!promptText && digest) {
        try {
          const promptFile = await readFile(`prompts/${digest}.md`).catch(() => readFile(`prompts/${digest}.txt`));
          promptText = await promptFile.text();
        } catch {
          // ignore
        }
      }

      const instImages = foundInst?.images || [];
      const imgIdx = foundInst?.imageIndex ?? 0;
      const isActive = Boolean(
        foundInst && instImages[imgIdx]?.promptDigest === digest
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

    images.sort((a, b) => a.lastModified - b.lastModified);

    return { images };
  } catch (error) {
    await writeLog('error', 'Images.loader', `Failed to load images: ${error instanceof Error ? error.message : String(error)}`);
    return { images: [] };
  }
}
