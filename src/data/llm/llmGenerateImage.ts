// import sql from "db";
// import type { Image, Lesson, Student } from "types";
// import llmGemini25FlashImage from "llm/providers/gemini25FlashImage";
// import writeImageToFile from "utilities/writeImageToFile";
// import mimeToExtension from "utilities/mimeToExtension";

// import isUrlDownloadable from "utilities/isUrlDownloadable";

async function extractFullPath(image: string, target: string) {
    // const storedPath = image[target as keyof Image] as string;

    // if (storedPath == null) {
    //     return null;
    // }

    // if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    //     return storedPath;
    // }

    // try {

    //     const images = await sql`
    //     SELECT   *
    //     FROM     "Image"   i
    //     WHERE  i."imageCode" = ${storedPath}`;

    //     const match = images?.[0]

    //     if (match) {
    //         return process.env.REFERENCE_PATH + '/' + match.lessonCode + '/' + match.studentCode + '/' + match.storyCode + '/' + match.imageCode + '.png';
    //     }

    // } catch (error: any) {
    //     console.error(`ERROR in llmGenerateImage/extractFullPath for ${target}:`, error.message);
    //     throw error;
    // }

}

export default async function llmGenerateImage(imageId: number) {
    // try {

    //     const keys = await sql`
    //         SELECT  le."lessonKey"
    //         FROM         "Image"   i
    //         INNER JOIN   "Student" st ON i."studentCode"  = st."studentCode"
    //         INNER JOIN   "Lesson"  le ON i."lessonCode"   = le."lessonCode"
    //         WHERE  i."imageId" = ${imageId}
    //     `;

    //     const images = await sql`
    //         SELECT   *
    //         FROM     "Image"   i
    //         WHERE  i."imageId" = ${imageId}
    //     `;

    //     if (keys == null || keys[0]?.lessonKey == null) {
    //         throw new Error(`No key found for image ${imageId}`);
    //     }

    //     if (images == null || images.length === 0) {
    //         throw new Error(`No data found for image ${imageId}`);
    //     }

    //     const key = keys[0].lessonKey as string;

    //     const image = images[0] as Image;

    //     const systemText = image.lessonStyleInstruction;
    //     const promptText = image.paragraphText;
    //     const precedingText = image.precedingText;

    //     const inlineInstructions = [] as Array<any>
    //     const inlineUris = [] as Array<any>

    //     if (image.storyReferenceUrl != null) {

    //         const fileUri = await extractFullPath(image, 'storyReferenceUrl')

    //         const inlineNo = inlineUris.length

    //         if (fileUri != null && await isUrlDownloadable(fileUri)) {
    //             inlineInstructions.push(`Use the following image (inline image no ${inlineNo})as a reference for the style and composition of the generated image, do not use it for reference to any characters: ` + fileUri)
    //             inlineUris.push(fileUri)
    //         }

    //     }

    //     if (image.storyInspirationUrl01 != null) {

    //         const fileUri = await extractFullPath(image, 'storyInspirationUrl01')

    //         const inlineNo = inlineUris.length


    //         if (fileUri != null && await isUrlDownloadable(fileUri)) {
    //             const inlineInstruction = `Use the following image (inline image no ${inlineNo}) as a reference for the style and composition of the character ${image.storyInspirationPrompt01}: ` + fileUri

    //             // console.log(inlineInstruction)

    //             inlineInstructions.push(inlineInstruction)

    //             inlineUris.push(fileUri)
    //         }



    //     }

    //     const inlineText = inlineInstructions.join('\n\n')

    //     let userPrompt = `<sceen-instructions>\n${promptText}\n</sceen-instructions>`;
    //     let systemPrompt = `<style-instructions>\n${systemText}\n</style-instructions>`;

    //     if (inlineText != null && inlineText.length > 0) {
    //         userPrompt = userPrompt + `\n<reference-instructions>\n${inlineText}\n</reference-instructions>`
    //     }

    //     if (precedingText != null && precedingText.length > 0) {
    //         systemPrompt = systemPrompt + `\n<preceding-scenes>\n${precedingText}\n</preceding-scenes>`
    //     }

    //     const referencePrompt = inlineUris.join(',') ?? ''

    //     // Update Database
    //     await sql`
    //         UPDATE "Image" 
    //         SET    "userPrompt"      = ${userPrompt ?? ''},
    //                "systemPrompt"    = ${systemPrompt ?? ''},
    //                "referencePrompt" = ${referencePrompt ?? ''}
    //         WHERE "imageId" = ${imageId}
    //     `;

    //     console.info(`Processing ${imageId} with key: ${key.substring(0, 10)}...`);


    //     // Generate Image
    //     const result = await llmGemini25FlashImage(userPrompt, systemPrompt, key, inlineUris);

    //     if (!result.success) {
    //         throw new Error(result.reason ? (typeof result.reason === 'string' ? result.reason : JSON.stringify(result.reason)) : "Image generation failed");
    //     }

    //     // Save to File
    //     const imageDir = Bun.env.IMAGE_PATH;
    //     const imagePath = `/${image.lessonCode}/${image.studentCode}/${image.storyCode}`;
    //     const imageName = image.imageCode;
    //     const imageExtension = mimeToExtension(result.mimeType || "") || "png";

    //     const writtenPath = await writeImageToFile(
    //         result.base64!,
    //         imageDir,
    //         imagePath,
    //         imageName,
    //         imageExtension // Pass extension, not mimeType
    //     );

    //     // Update Database
    //     await sql`
    //         UPDATE "Image" 
    //         SET    "renderedAt"      = NOW() 
    //         WHERE "imageId" = ${imageId}
    //     `;

    //     console.info(`Successfully generated and saved image: ${image.imageCode}`);

    //     return writtenPath;

    // } catch (error: any) {
    //     console.error(`ERROR in llmGenerateImage for ${imageId}:`, error.message);
    //     throw error;
    // }
}