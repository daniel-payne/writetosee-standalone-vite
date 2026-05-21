import { getState, setState, StoragePersistence } from "@keldan-systems/state-mutex"



export default async function processStory({ story }: { story: string }) {
    let publication = getState("publication") as any;

    if (publication == null) {
        publication = {}
    }

    if (story != null) {
        publication.story = story
    }

    publication.count = (publication.count ?? 0) + 1

    setState("publication", publication, StoragePersistence.local);
}