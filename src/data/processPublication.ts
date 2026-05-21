import { getState, setState, StoragePersistence } from "@keldan-systems/state-mutex"



export default async function processPublication({ story }: { story: string }) {
    let publication = getState("publication-data") as any;

    if (publication == null) {
        publication = {}
    }

    if (story != null) {
        publication.story = story
    }

    publication.count = (publication.count ?? 0) + 1

    setState("publication-data", publication, StoragePersistence.local);
}