import { loadStyle } from "@/data/manageStyle";

export async function clientLoader() {
  try {
    const style = await loadStyle();
    console.log('style', style);
    return { style };
  } catch (e) {
    return { style: {} };
  }
}
