import { getState, setState, StoragePersistence } from '@keldan-systems/state-mutex';
import { loadStory } from './manageStory';
import { loadStyle } from './manageStyle';
import { loadPublication } from './managePublication';
import { writeLog } from './storage/logStorage';

// Load Vite worker
import ProcessWorker from './processPublication.worker?worker';

function runInWorker(options: { type: 'START_TEXT' | 'START_IMAGES', style?: Record<string, any>, story?: string, apiKey: string }): Promise<any> {
    return new Promise((resolve, reject) => {
        const worker = new ProcessWorker();
        
        worker.onmessage = (event) => {
            const { type, payload, error } = event.data;
            if (type === 'SUCCESS') {
                resolve(payload);
                worker.terminate();
            } else if (type === 'PROGRESS') {
                loadPublication().catch(async (err) =>
                    await writeLog('error', 'processPublication', `Failed to reload publication on progress: ${err instanceof Error ? err.message : String(err)}`)
                );
            } else if (type === 'ERROR') {
                reject(new Error(error || 'Worker processing failed'));
                worker.terminate();
            }
        };

        worker.onerror = (error) => {
            reject(error);
            worker.terminate();
        };

        worker.postMessage({
            type: options.type,
            style: options.style,
            story: options.story,
            apiKey: options.apiKey
        });
    });
}

export async function processImageGeneration() {
    // Set needs-image-generation flag to true
    setState('image-generation-needs-processing', true, StoragePersistence.local);

    // Try to acquire the image-generation-processing lock
    const lockAcquired = await navigator.locks.request('image-generation-processing', { ifAvailable: true }, async (lock) => {
        if (!lock) {
            // Already processing image generation
            return false;
        }

        try {
            while (getState('image-generation-needs-processing') === true) {
                // Reset the flag to false before running
                setState('image-generation-needs-processing', false, StoragePersistence.local);
                setState('publication-image-processing-status', 'processing', StoragePersistence.local);

                const apiKey = window.sessionStorage.getItem("apiKey") ?? '';

                await runInWorker({
                    type: 'START_IMAGES',
                    apiKey
                });

                // Reload the publication from disk to update main thread's local states and caches
                await loadPublication().catch(async (err) =>
                    await writeLog('error', 'processImageGeneration', `Failed to load publication after worker finished images: ${err instanceof Error ? err.message : String(err)}`)
                );
            }
        } finally {
            setState('publication-image-processing-status', 'idle', StoragePersistence.local);
        }

        return true;
    });

    return lockAcquired;
}

export default async function processPublication(options: { style?: Record<string, any>, story?: string } = {}) {
    // Set needs-processing flag to true on every save/call
    setState('publication-needs-processing', true, StoragePersistence.local);

    // Try to acquire the processing lock. If it's already held by another tab, we return immediately
    // since the tab holding the lock will see the needs-processing flag and run again.
    const lockAcquired = await navigator.locks.request('publication-processing', { ifAvailable: true }, async (lock) => {
        if (!lock) {
            // Already processing in another tab
            return false;
        }

        // We got the lock! Run the queue loop
        try {
            while (getState('publication-needs-processing') === true) {
                // Reset the flag to false before running
                setState('publication-needs-processing', false, StoragePersistence.local);
                setState('publication-processing-status', 'processing', StoragePersistence.local);

                const apiKey = window.sessionStorage.getItem("apiKey") ?? '';
                
                // Read latest style and story from disk/state to process the absolute latest version
                const latestStory = await loadStory().catch(() => options.story || '');
                const latestStyle = await loadStyle().catch(() => options.style || {});

                await runInWorker({
                    type: 'START_TEXT',
                    style: latestStyle,
                    story: latestStory,
                    apiKey
                });

                // Reload the publication from disk to update main thread's local states and caches
                await loadPublication().catch(async (err) =>
                    await writeLog('error', 'processPublication', `Failed to load publication after worker finished: ${err instanceof Error ? err.message : String(err)}`)
                );
            }
        } finally {
            setState('publication-processing-status', 'idle', StoragePersistence.local);
        }

        return true;
    });

    // If we successfully processed the text pipeline, trigger image generation in the background!
    if (lockAcquired) {
        processImageGeneration().catch(async (err) =>
            await writeLog('error', 'processPublication', `Background image generation failed to start: ${err instanceof Error ? err.message : String(err)}`)
        );
    }

    return lockAcquired;
}
