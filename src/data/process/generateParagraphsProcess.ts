import generateParagraphs from "@/data/utilities/generateParagraphs";

export default function storyToParagraphs(story: string) {
    return generateParagraphs({ story });
}