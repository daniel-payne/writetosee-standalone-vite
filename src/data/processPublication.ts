import { getState, setState, StoragePersistence } from '@keldan-systems/state-mutex';
import { loadStory } from './manageStory';
import { loadStyle } from './manageStyle';
import { loadPublication } from './managePublication';
import { writeLog } from './storage/logStorage';
import processPublicationImpl, { processImageGenerationImpl } from './processPublicationImpl';

export async function processImageGeneration() {
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
                await loadPublication().catch(async (err) =>
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

export default async function processPublication(options: { style?: Record<string, any>, story?: string } = {}) {
    // Set needs-processing flag to true on every save/call
    setState('publication-needs-processing', true, StoragePersistence.local);

    const runWork = async () => {
        try {
            while (getState('publication-needs-processing') === true) {
                // Reset the flag to false before running
                setState('publication-needs-processing', false, StoragePersistence.local);
                setState('publication-processing-status', 'processing', StoragePersistence.local);

                // Read latest story and style from disk/state to process the absolute latest version
                const latestStory = await loadStory().catch(() => options.story || '');
                const latestStyle = await loadStyle().catch(() => options.style || {});

                await processPublicationImpl({
                    style: latestStyle,
                    story: latestStory
                });

                // Reload the publication from disk to update main thread's local states and caches
                await loadPublication().catch(async (err) =>
                    await writeLog('error', 'processPublication', `Failed to load publication after finished: ${err instanceof Error ? err.message : String(err)}`)
                );
            }
        } catch (err: any) {
            await writeLog('error', 'processPublication', `Error in processPublication: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setState('publication-processing-status', 'idle', StoragePersistence.local);
        }
    };

    let lockAcquired = false;
    if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
        lockAcquired = await navigator.locks.request('publication-processing', { ifAvailable: true }, async (lock) => {
            if (!lock) return false;
            await runWork();
            return true;
        });
    } else {
        await runWork();
        lockAcquired = true;
    }

    // If we successfully processed the text pipeline, trigger image generation in the background!
    if (lockAcquired) {
        processImageGeneration().catch(async (err) =>
            await writeLog('error', 'processPublication', `Background image generation failed to start: ${err instanceof Error ? err.message : String(err)}`)
        );
    }

    return lockAcquired;
}
