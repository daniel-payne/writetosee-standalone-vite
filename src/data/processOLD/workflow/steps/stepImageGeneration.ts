import { getState, setState, StoragePersistence } from "@keldan-systems/state-mutex";
import { processImageGenerationImpl } from "./stepCoordinatePublication";
import { loadPublication } from "../../managePublication";
import { writeLog } from "@/data/storage/logStorage";

export default async function stepImageGeneration() {
    // Set needs-image-generation flag to true
    setState('image-generation-needs-processing', true, StoragePersistence.local);

    const runWork = async () => {
        try {
            while (getState('image-generation-needs-processing') === true) {
                // Reset the flag to false before running
                setState('image-generation-needs-processing', false, StoragePersistence.local);
                setState('publication-image-processing-status', 'processing', StoragePersistence.local);

                await processImageGenerationImpl();

                // Reload the publication from disk to update main thread's local states and caches
                await loadPublication(true).catch(async (err) =>
                    await writeLog('error', 'processImageGeneration', `Failed to load publication after finished images: ${err instanceof Error ? err.message : String(err)}`)
                );
            }
        } catch (err: any) {
            await writeLog('error', 'processImageGeneration', `Error in processImageGeneration: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setState('publication-image-processing-status', 'idle', StoragePersistence.local);
        }
    };

    if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
        return await navigator.locks.request('image-generation-processing', { ifAvailable: true }, async (lock) => {
            if (!lock) return false;
            await runWork();
            return true;
        });
    } else {
        await runWork();
        return true;
    }
}