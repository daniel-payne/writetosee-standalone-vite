import generateNumberWords from './generateNumberWords';

function toCamelCase(text: string): string {
  // 1. Split camelCase words first (e.g. "HeadingOne" -> "Heading One")
  let processed = text.replace(/([a-z])([A-Z])/g, '$1 $2');

  // 2. Replace any integer digits with their word representation
  processed = processed.replace(/\d+/g, (match) => {
    const num = parseInt(match, 10);
    return generateNumberWords(num);
  });

  // 3. Split by non-alphanumeric characters
  const words = processed.split(/[^a-zA-Z0-9]+/).filter(Boolean);

  if (words.length === 0) return '';

  // 4. Convert to camelCase
  return words
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

export default function markdownToJSON(markdown: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const lines = markdown.split(/\r?\n/);

  // Keep track of active heading keys at each level (1-indexed level)
  let activeHeadings: string[] = [];

  // Map to accumulate text lines for each object
  const textLinesMap = new Map<Record<string, unknown>, string[]>();

  // Helper to get the target object for the current heading path
  function getTargetObject(path: string[]): Record<string, unknown> {
    let current = root;
    for (const key of path) {
      if (current[key] === undefined || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {} as Record<string, unknown>;
      }
      current = current[key] as Record<string, unknown>;
    }
    return current;
  }

  for (const line of lines) {
    // 1. Check for heading (up to 6 levels)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length; // number of '#'
      const headingText = headingMatch[2].trim();
      const headingKey = toCamelCase(headingText);

      // Clear any deeper level active headings
      activeHeadings = activeHeadings.slice(0, level - 1);
      activeHeadings[level - 1] = headingKey;
      continue;
    }

    // 2. Check for property item (starting with - or * or + and containing :)
    const propertyMatch = line.match(/^\s*[-*+]\s+(.+?)\s*:\s*(.+)$/);
    if (propertyMatch) {
      const key = propertyMatch[1].trim();
      const val = propertyMatch[2].trim();
      const target = getTargetObject(activeHeadings);
      target[key] = val;
      continue;
    }

    // 3. Otherwise, treat as normal text line (even if empty)
    const target = getTargetObject(activeHeadings);
    let textLines = textLinesMap.get(target);
    if (!textLines) {
      textLines = [];
      textLinesMap.set(target, textLines);
    }
    textLines.push(line);
  }

  // Process accumulated text lines for each object
  for (const [target, accumulatedLines] of textLinesMap.entries()) {
    // Trim leading and trailing empty/blank lines
    let start = 0;
    while (start < accumulatedLines.length && accumulatedLines[start].trim() === '') {
      start++;
    }
    let end = accumulatedLines.length - 1;
    while (end >= start && accumulatedLines[end].trim() === '') {
      end--;
    }

    if (start <= end) {
      const sliced = accumulatedLines.slice(start, end + 1);
      const joinedText = sliced.join('\n');
      if (joinedText !== '') {
        target['text'] = joinedText;
      }
    }
  }

  return root;
}


/*

EXAMPLES


```md
All the text from the MD
```

```JSON
{
  "text": "All the text from the MD"
}
```

```md
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
All the Text till the next heading
```
```json
{
  "headingOne": {
    "headingTwo": {
      "headingThree": {
        "headingFour": {
          "headingFive": {
            "headingSix": { "text": "All the Text till the next heading"}
          }
        }
      }
    }
  }

}
```

```md
- property One : value
- property Two : value two
```

```json
{
  "property One": "value",
  "property Two": "value two"
}
```



*/