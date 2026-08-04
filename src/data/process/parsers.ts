import type {
  Story,
  Chapter,
  Page,
  Paragraph,
  Style,
  Character,
  Instruction,
  ImageEntry
} from './types';

export function generateTextDigest(input: string | null | undefined): string {
  if (input == null) return "";
  const text = input.toString().toLowerCase().replace(/\s+/g, '');
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1) + char;
    hash1 = hash1 & hash1;
    hash2 = ((hash2 << 7) - hash2) + char;
    hash2 = hash2 & hash2;
  }
  const hash1Str = (hash1 >>> 0).toString(16).padStart(8, '0');
  const hash2Str = (hash2 >>> 0).toString(16).padStart(8, '0');
  return (hash1Str + hash2Str).toUpperCase();
}

// --- STORY PARSER & SERIALIZER ---

export function parseStoryMarkdown(markdown: string): Story {
  if (!markdown || !markdown.trim()) {
    return {
      title: 'Untitled Story',
      chapters: []
    };
  }

  const lines = markdown.split(/\r?\n/);
  let title = 'Untitled Story';
  let firstTitleFound = false;

  const chapterBlocks: { title: string; textLines: string[] }[] = [];
  let currentChapterTitle = 'Chapter 1';
  let currentChapterLines: string[] = [];

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);

    if (h1Match && !firstTitleFound) {
      title = h1Match[1].trim();
      firstTitleFound = true;
      continue;
    }

    if (h1Match || h2Match) {
      if (currentChapterLines.length > 0 || chapterBlocks.length === 0) {
        chapterBlocks.push({
          title: currentChapterTitle,
          textLines: [...currentChapterLines]
        });
        currentChapterLines = [];
      }
      currentChapterTitle = (h1Match || h2Match)![1].trim();
    } else {
      currentChapterLines.push(line);
    }
  }

  if (currentChapterLines.length > 0 || chapterBlocks.length === 0) {
    chapterBlocks.push({
      title: currentChapterTitle,
      textLines: [...currentChapterLines]
    });
  }

  let globalParagraphIndex = 0;
  let accumulatedPriorText = '';

  const chapters: Chapter[] = chapterBlocks.map((cBlock, cIdx) => {
    const rawChapterText = cBlock.textLines.join('\n').trim();

    // Parse pages inside chapter (separated by '### Page' or paragraphs)
    const pageBlocks: { title: string; textLines: string[] }[] = [];
    let currentPageTitle = 'Page 1';
    let currentPageLines: string[] = [];

    for (const pLine of cBlock.textLines) {
      const h3Match = pLine.match(/^###\s+(.+)$/);
      if (h3Match) {
        if (currentPageLines.length > 0 || pageBlocks.length === 0) {
          pageBlocks.push({
            title: currentPageTitle,
            textLines: [...currentPageLines]
          });
          currentPageLines = [];
        }
        currentPageTitle = h3Match[1].trim();
      } else {
        currentPageLines.push(pLine);
      }
    }

    if (currentPageLines.length > 0 || pageBlocks.length === 0) {
      pageBlocks.push({
        title: currentPageTitle,
        textLines: [...currentPageLines]
      });
    }

    const pages: Page[] = pageBlocks.map((pBlock, pIdx) => {
      const pageRawText = pBlock.textLines.join('\n').trim();
      const rawParagraphs = pageRawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

      const paragraphs: Paragraph[] = rawParagraphs.map(pText => {
        const pObj: Paragraph = {
          paragraphNo: globalParagraphIndex++,
          paragraphText: pText,
          priorText: accumulatedPriorText,
          narrativeText: pText,
          narrativeDigest: generateTextDigest(pText)
        };
        accumulatedPriorText = (accumulatedPriorText ? `${accumulatedPriorText}\n\n${pText}` : pText).trim();
        return pObj;
      });

      return {
        pageNo: pIdx,
        pageTitle: pBlock.title,
        pageText: pageRawText,
        pageSummary: '',
        pageDigest: generateTextDigest(pageRawText),
        paragraphs
      };
    });

    return {
      chapterNo: cIdx,
      chapterTitle: cBlock.title,
      chapterText: rawChapterText,
      chapterSummary: '',
      chapterDigest: generateTextDigest(rawChapterText),
      pages
    };
  });

  return {
    title,
    chapters
  };
}

export function serializeStoryMarkdown(story: Story): string {
  const parts: string[] = [`# ${story.title || 'Untitled Story'}`];

  for (const chapter of story.chapters || []) {
    parts.push(`## ${chapter.chapterTitle || `Chapter ${chapter.chapterNo + 1}`}`);
    for (const page of chapter.pages || []) {
      if (chapter.pages.length > 1) {
        parts.push(`### ${page.pageTitle || `Page ${page.pageNo + 1}`}`);
      }
      for (const p of page.paragraphs || []) {
        parts.push(p.paragraphText);
      }
    }
  }

  return parts.join('\n\n');
}

// --- STYLE PARSER & SERIALIZER ---

export function parseStyleMarkdown(markdown: string): Style {
  const defaultStyle: Style = {
    drawingInstructions: 'Vibrant, colorful illustration style, bright colors, clear shapes.',
    panelPerParagraph: true,
    referenceUrl: '',
    referenceInstructions: '',
    useReferenceInstructions: true
  };

  if (!markdown || !markdown.trim()) {
    return defaultStyle;
  }

  const lines = markdown.split(/\r?\n/);
  let drawingInstructions = '';
  let panelPerParagraph = true;
  let referenceUrl = '';
  let referenceInstructions = '';
  let useReferenceInstructions = true;

  let currentSection = 'drawing';
  const drawingLines: string[] = [];
  const refInstLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/i);
    const bulletMatch = line.match(/^\s*[-*+]\s+(.+?)\s*:\s*(.+)$/i);

    if (headingMatch) {
      const title = headingMatch[1].trim().toLowerCase();
      if (title.includes('reference') || title.includes('link')) {
        currentSection = 'reference';
      } else {
        currentSection = 'drawing';
      }
      continue;
    }

    if (bulletMatch) {
      const key = bulletMatch[1].trim().toLowerCase();
      const val = bulletMatch[2].trim();

      if (key.includes('panelperparagraph')) {
        panelPerParagraph = val.toLowerCase() === 'true' || val.toLowerCase() === 'yes';
        continue;
      } else if (key.includes('referenceurl')) {
        referenceUrl = val;
        continue;
      } else if (key.includes('usereferenceinstructions')) {
        useReferenceInstructions = val.toLowerCase() === 'true' || val.toLowerCase() === 'yes';
        continue;
      }
    }

    if (currentSection === 'reference') {
      refInstLines.push(line);
    } else {
      drawingLines.push(line);
    }
  }

  drawingInstructions = drawingLines.join('\n').trim() || defaultStyle.drawingInstructions;
  referenceInstructions = refInstLines.join('\n').trim();

  return {
    drawingInstructions,
    panelPerParagraph,
    referenceUrl,
    referenceInstructions,
    useReferenceInstructions
  };
}

export function serializeStyleMarkdown(style: Style): string {
  const parts: string[] = [
    `# Style Instructions`,
    `- panelPerParagraph: ${style.panelPerParagraph}`,
    `- referenceUrl: ${style.referenceUrl || ''}`,
    `- useReferenceInstructions: ${style.useReferenceInstructions}`,
    `\n## Drawing Instructions\n${style.drawingInstructions || ''}`
  ];

  if (style.referenceInstructions && style.referenceInstructions.trim()) {
    parts.push(`\n## Reference Instructions\n${style.referenceInstructions.trim()}`);
  }

  return parts.join('\n\n');
}

// --- CHARACTERS PARSER & SERIALIZER ---

export function parseCharactersMarkdown(markdown: string): Character[] {
  if (!markdown || !markdown.trim()) return [];

  const characters: Character[] = [];
  const sections = markdown.split(/(?=^#{1,6}\s+)/m);

  let charCount = 0;
  for (const sec of sections) {
    const trimmed = sec.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/m);
    if (!headingMatch) continue;

    const name = headingMatch[1].trim();
    if (name.toLowerCase() === 'characters') continue;

    const refUrlMatch = trimmed.match(/[-*+]?\s*ReferenceUrl:\s*(.+)/i) || trimmed.match(/!\[.*?\]\((.*?)\)/);
    const referenceUrl = refUrlMatch ? refUrlMatch[1].trim() : '';

    const instMatch = trimmed.match(/\*{0,2}Instructions:\*{0,2}\s*([\s\S]*)$/i);
    let instructionsText = '';
    let descriptionText = '';

    if (instMatch) {
      instructionsText = instMatch[1].trim();
      descriptionText = trimmed
        .replace(/^#{1,6}\s+.+$/m, '')
        .replace(/\*{0,2}Instructions:\*{0,2}[\s\S]*$/i, '')
        .replace(/[-*+]?\s*ReferenceUrl:\s*.+/gi, '')
        .trim();
    } else {
      descriptionText = trimmed
        .replace(/^#{1,6}\s+.+$/m, '')
        .replace(/[-*+]?\s*ReferenceUrl:\s*.+/gi, '')
        .trim();
    }

    characters.push({
      characterNo: charCount++,
      characterName: name,
      referenceUrl,
      descriptionText,
      instructionsText
    });
  }

  return characters;
}

export function serializeCharactersMarkdown(characters: Character[]): string {
  if (!characters || characters.length === 0) return '';
  return characters
    .filter(c => c.characterName && c.characterName.trim())
    .map(c => {
      const parts: string[] = [`## ${c.characterName.trim()}`];
      if (c.referenceUrl) {
        parts.push(`- ReferenceUrl: ${c.referenceUrl.trim()}`);
      }
      if (c.descriptionText && c.descriptionText.trim()) {
        parts.push(c.descriptionText.trim());
      }
      if (c.instructionsText && c.instructionsText.trim()) {
        parts.push(`**Instructions:**\n${c.instructionsText.trim()}`);
      }
      return parts.join('\n\n');
    })
    .join('\n\n');
}

// --- INSTRUCTIONS PARSER & SERIALIZER ---

export function parseInstructionsMarkdown(markdown: string): Instruction[] {
  if (!markdown || !markdown.trim()) return [];

  const instructions: Instruction[] = [];
  const sections = markdown.split(/(?=^#{1,6}\s+(?:Instruction|Panel)\s+\d+)/mi);

  let counter = 0;
  for (const sec of sections) {
    const trimmed = sec.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(/^#{1,6}\s+(?:Instruction|Panel)\s+(\d+)/i);
    if (!headerMatch) continue;

    const instructionNo = parseInt(headerMatch[1], 10) || counter;

    const paraMatch = trimmed.match(/[-*+]?\s*paragraphId:\s*(\d+)/i);
    const pageMatch = trimmed.match(/[-*+]?\s*pageId:\s*(\d+)/i);
    const chapMatch = trimmed.match(/[-*+]?\s*chapterId:\s*(\d+)/i);
    const imgIdxMatch = trimmed.match(/[-*+]?\s*imageIndex:\s*(\d+)/i);
    const charMatch = trimmed.match(/\*{0,2}Characters:\*{0,2}\s*(.+)/i);

    const paragraphId = paraMatch ? parseInt(paraMatch[1], 10) : instructionNo;
    const pageId = pageMatch ? parseInt(pageMatch[1], 10) : 0;
    const chapterId = chapMatch ? parseInt(chapMatch[1], 10) : 0;
    const imageIndex = imgIdxMatch ? parseInt(imgIdxMatch[1], 10) : 0;
    const charList = charMatch ? charMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [];

    let cinematographicDirections = '';
    const dirMatch = trimmed.match(/<cinematographic-directions>([\s\S]*?)<\/cinematographic-directions>/i) ||
                     trimmed.match(/<cinematographic-text>([\s\S]*?)<\/cinematographic-text>/i);
    if (dirMatch) {
      cinematographicDirections = dirMatch[1].trim();
    } else {
      const textLines = trimmed.split(/\r?\n/).filter(l =>
        !l.match(/^#{1,6}\s+(?:Instruction|Panel)/i) &&
        !l.match(/[-*+]?\s*(?:paragraphId|pageId|chapterId|imageIndex|Characters):/i)
      );
      cinematographicDirections = textLines.join('\n').trim();
    }

    instructions.push({
      instructionNo,
      paragraphId,
      pageId,
      chapterId,
      imageIndex,
      cinematographicDirections,
      characters: charList,
      images: []
    });

    counter++;
  }

  return instructions;
}

export function serializeInstructionsMarkdown(instructions: Instruction[]): string {
  if (!instructions || instructions.length === 0) return '';
  return instructions
    .sort((a, b) => a.instructionNo - b.instructionNo)
    .map(inst => {
      const parts: string[] = [
        `## Instruction ${inst.instructionNo}`,
        `- paragraphId: ${inst.paragraphId}`,
        `- pageId: ${inst.pageId}`,
        `- chapterId: ${inst.chapterId}`,
        `- imageIndex: ${inst.imageIndex}`
      ];
      if (inst.characters && inst.characters.length > 0) {
        parts.push(`**Characters:** ${inst.characters.join(', ')}`);
      }
      if (inst.cinematographicDirections && inst.cinematographicDirections.trim()) {
        parts.push(`<cinematographic-directions>\n${inst.cinematographicDirections.trim()}\n</cinematographic-directions>`);
      }
      return parts.join('\n\n');
    })
    .join('\n\n');
}
