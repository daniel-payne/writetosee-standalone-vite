import * as fileStorage from './fileStorage';

import { setState, getState, StoragePersistence } from "@keldan-systems/state-mutex";

export default async function loadPublication() {
    let publication = getState("publication-data") as any;

    if (publication == null) {
        publication = {}
    }

    const hasDirectory = await fileStorage.hasSavedDirectory();

    if (hasDirectory) {
        const filesList = await fileStorage.listFiles();

        if (publication.story == null) {

            let story = '';

            if (filesList && filesList.includes('story.md')) {
                try {
                    const storyFile = await fileStorage.readFile('story.md');
                    story = await storyFile.text();
                } catch (err) {
                    // DO NOTHING
                }
            }

            publication.story = story;

        }


    }

    setState("publication-data", publication, StoragePersistence.local);

    return publication;
}