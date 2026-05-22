import mimeToExtension from "./mimeToExtension.js";

export default async function writeImageToFile(
    imageData: string,

    imageDir: string = "./output",
    imagePath: string = "/images",
    imageName: string = "gemini-generated",
    imageType: string = "image/png",
): Promise<string> {
    return 'TBD'

    // const pngName = `${imageName}.${imageType}`;
    // const pngPath = `${imageDir}${imagePath}/${pngName}`;

    // const txtName = `${imageName}.txt`;
    // const txtPath = `${imageDir}${imagePath}/${txtName}`;

    // try {
    //     await Bun.$`mkdir -p ${imageDir}`;
    // } catch (err) {
    //     console.error("Failed to create output directory:", err);
    //     throw err;
    // }

    // const cleanBase64 = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

    // let pngBinary: Uint8Array;

    // try {
    //     const binaryString = atob(cleanBase64);
    //     const len = binaryString.length;
    //     const bytes = new Uint8Array(len);

    //     for (let i = 0; i < len; i++) {
    //         bytes[i] = binaryString.charCodeAt(i);
    //     }
    //     pngBinary = bytes;
    // } catch (err) {
    //     throw new Error(`Invalid base64 string: ${err}`);
    // }


    // try {
    //     await Bun.write(pngPath, pngBinary);

    //     return pngPath;
    // } catch (err) {
    //     console.error("Failed to write image file:", err);
    //     throw err;
    // }
}


