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

interface HeadingNode {
  key: string;
  level: number;
  textLines: string[];
  listItems: string[];
  properties: { key: string; val: string }[];
  children: HeadingNode[];
}

export default function markdownToJSON(markdown: string): Record<string, any> {
  const lines = markdown.split(/\r?\n/);

  const rootHeadings: HeadingNode[] = [];
  const rootProperties: { key: string; val: string }[] = [];
  const rootTextLines: string[] = [];
  const rootListItems: string[] = [];

  const stack: HeadingNode[] = [];

  for (const line of lines) {
    // 1. Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const headingKey = toCamelCase(headingText);

      const node: HeadingNode = {
        key: headingKey,
        level,
        textLines: [],
        listItems: [],
        properties: [],
        children: []
      };

      while (stack.length >= level) {
        stack.pop();
      }

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      } else {
        rootHeadings.push(node);
      }
      stack.push(node);
      continue;
    }

    // 2. Property
    const propertyMatch = line.match(/^\s*[-*+]\s+(.+?)\s*:\s*(.+)$/);
    if (propertyMatch) {
      const key = propertyMatch[1].trim();
      const val = propertyMatch[2].trim();
      if (stack.length > 0) {
        stack[stack.length - 1].properties.push({ key, val });
      } else {
        rootProperties.push({ key, val });
      }
      continue;
    }

    // 3. Ordered List Item
    const orderedListMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (orderedListMatch) {
      const itemText = orderedListMatch[1].trim();
      if (stack.length > 0) {
        stack[stack.length - 1].listItems.push(itemText);
      } else {
        rootListItems.push(itemText);
      }
      continue;
    }

    // 4. Regular Text (keep empty lines for paragraph breaks)
    if (stack.length > 0) {
      stack[stack.length - 1].textLines.push(line);
    } else {
      rootTextLines.push(line);
    }
  }

  function cleanTextLines(textLines: string[]): string {
    let start = 0;
    while (start < textLines.length && textLines[start].trim() === '') {
      start++;
    }
    let end = textLines.length - 1;
    while (end >= start && textLines[end].trim() === '') {
      end--;
    }
    if (start <= end) {
      return textLines.slice(start, end + 1).join('\n').trim();
    }
    return '';
  }

  function buildNodeJSON(node: HeadingNode): unknown {
    const textVal = cleanTextLines(node.textLines);

    if (node.children.length > 0) {
      const obj: Record<string, unknown> = {};
      if (textVal !== '') {
        obj.text = textVal;
      }
      for (const prop of node.properties) {
        obj[prop.key] = prop.val;
      }
      for (const child of node.children) {
        obj[child.key] = buildNodeJSON(child);
      }
      return obj;
    } else {
      if (node.level === 1) {
        if (node.listItems.length > 0) {
          return node.listItems;
        }
        return textVal;
      } else {
        const obj: Record<string, unknown> = {};
        if (node.listItems.length > 0) {
          obj.text = node.listItems;
        } else if (textVal !== '') {
          obj.text = textVal;
        }
        for (const prop of node.properties) {
          obj[prop.key] = prop.val;
        }
        return obj;
      }
    }
  }

  const root: Record<string, unknown> = {};

  for (const prop of rootProperties) {
    root[prop.key] = prop.val;
  }

  const rootText = cleanTextLines(rootTextLines);
  if (rootText !== '') {
    root['text'] = rootText;
  }

  if (rootListItems.length > 0) {
    root['listItems'] = rootListItems;
  }

  for (const heading of rootHeadings) {
    root[heading.key] = buildNodeJSON(heading);
  }

  return root;
}