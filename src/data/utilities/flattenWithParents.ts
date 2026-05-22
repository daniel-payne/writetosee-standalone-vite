export default function flattenWithParents(data: Record<string, unknown> | null, parentContext = {}, result: any[] = []) {
  // Handle arrays (common in real APIs)
  if (Array.isArray(data)) {
    for (const item of data) {
      flattenWithParents(item, { ...parentContext }, result);
    }
    return result;
  }

  // Handle null / primitive values
  if (data === null || typeof data !== 'object') {
    return result;
  }

  // Current level's own fields (excluding children/children-related keys)
  const currentLevel: any = { ...parentContext };

  for (const [key, value] of Object.entries(data)) {
    if (key === 'children' ||
      key === 'child' ||
      key === 'items' ||
      key === 'subitems' ||
      Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      // skip children containers — process them recursively
      continue;
    }

    // Add scalar or simple value to current row
    currentLevel[key] = value;
  }

  // Add the current level to result
  result.push(currentLevel);

  // Recurse into children (most common names)
  const childrenKeys = ['children', 'child', 'items', 'subitems', 'nodes', 'subs'];

  for (const key of childrenKeys) {
    if (data[key] !== undefined) {
      const childData: any = data[key];
      flattenWithParents(childData, currentLevel, result);
      // We don't break — in rare cases there might be multiple children keys
    }
  }

  // Also handle any array value that looks like children
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      // This is likely a children-like array we haven't processed yet
      flattenWithParents(value as any, currentLevel, result);
    }
  }

  return result;
}