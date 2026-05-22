

export default function generateParagraphs(text: string | null, characterThreshold = 20, paragraphSeparator = '\n\n') {
  let paragraphs: string[]

  if (text == null) {
    return []
  }

  if (text.replace(/\s/g, '').length < characterThreshold) {
    paragraphs = [text]
  } else {
    paragraphs = text.split(paragraphSeparator).map(p => p.trim()).filter(p => p);
  }

  paragraphs = paragraphs.map(p => p.trim())

  paragraphs = paragraphs.filter(p => p.indexOf("#") == -1)

  return paragraphs.map((p, i) => ({
    text: p,
    precedingText: i === 0 ? null : paragraphs.slice(0, i).join(paragraphSeparator),
    paragraphOrder: i
  }));
}

