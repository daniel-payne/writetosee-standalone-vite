export default function listDuplicates(arr: string[]) {
    const seen = new Set();
    const duplicates = new Set();

    for (const str of arr) {
        if (seen.has(str)) {
            duplicates.add(str);
        } else {
            seen.add(str);
        }
    }

    return Array.from(duplicates);
}