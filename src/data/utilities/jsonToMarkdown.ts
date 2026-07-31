const KEY_MAP: Record<string, string> = {
  storyTitle: 'StoryTitle',
  imageDisplayMode: 'Image Display Mode',
  drawingInstructions: 'Drawing Instructions',
  referenceUrl: 'ReferenceUrl',
  linkInstructions: 'Reference Style',
};

function fromCamelCase(key: string): string {
  if (KEY_MAP[key]) {
    return KEY_MAP[key];
  }

  // 1. Insert space before capital letters (e.g. "headingOne" -> "heading One")
  const withSpaces = key.replace(/([a-z])([A-Z])/g, '$1 $2');

  // 2. Capitalize each word (Title Case)
  return withSpaces
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function isCamelCase(key: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9]*$/.test(key);
}

export default function jsonToMarkdown(json: Record<string, unknown>): string {
  const lines: string[] = [];

  function traverse(obj: unknown, depth: number): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    const record = obj as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      const val = record[key];

      if (key === 'text') {
        if (typeof val === 'string' && val.trim() !== '') {
          lines.push(val.trim());
        }
      } else if (typeof val === 'object' && val !== null) {
        if (Array.isArray(val)) {
          if (lines.length > 0) lines.push('');
          const headingPrefix = '#'.repeat(depth);
          const headingText = fromCamelCase(key);
          lines.push(`${headingPrefix} ${headingText}`);
          val.forEach((item, index) => {
            lines.push(`${index + 1}. ${item}`);
          });
        } else {
          if (lines.length > 0) lines.push('');
          const headingPrefix = '#'.repeat(depth);
          const headingText = fromCamelCase(key);
          lines.push(`${headingPrefix} ${headingText}`);
          traverse(val, depth + 1);
        }
      } else {
        if (isCamelCase(key)) {
          if (lines.length > 0) lines.push('');
          const headingPrefix = '#'.repeat(depth);
          const headingText = fromCamelCase(key);
          lines.push(`${headingPrefix} ${headingText}`);
          if (val !== null && val !== undefined) {
            lines.push(String(val).trim());
          }
        } else {
          lines.push(`- ${key} : ${val}`);
        }
      }
    }
  }

  traverse(json, 1);
  return lines.join('\n');
}
