import { readFile } from "../lib/fileStorage";

const DEFAULT_STYLE = {}

export async function clientLoader() {
  try {
    const file = await readFile('style.json');
    const text = await file.text();
    const style = JSON.parse(text);

    console.log('style', style)

    return { style };
  } catch (e) {

    return { style: DEFAULT_STYLE }
  }
}
