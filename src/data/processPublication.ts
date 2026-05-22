import { getState, setState, StoragePersistence } from "@keldan-systems/state-mutex"
import generateParagraphs from "@/data/utilities/generateParagraphs";



export default async function processPublication({ story }: { story: string }) {
    let publication = getState("publication-data") as any;

    if (publication == null) {
        publication = {}
    }

    if (story != null) {
        publication.story = story
    }

    publication.paragraphs = generateParagraphs(publication.story)



    setState("publication-data", publication, StoragePersistence.local);


    return publication;
}