import type {
  Story,
  Chapter,
  Page,
  Paragraph,
  Style,
  Character,
  Instruction
} from './TYPES';

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
      story_id: 'main',
      id: 'main',
      story_title: 'Untitled Story',
      title: 'Untitled Story',
      story_text: '',
      story_summary: '',
      story_digest: '',
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
      if (currentChapterLines.some(l => l.trim().length > 0)) {
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

  if (currentChapterLines.some(l => l.trim().length > 0) || chapterBlocks.length === 0) {
    chapterBlocks.push({
      title: currentChapterTitle,
      textLines: [...currentChapterLines]
    });
  }

  let globalParagraphIndex = 0;
  const chapterPrecedingTexts: string[] = [];

  const chapters: Chapter[] = chapterBlocks
    .filter(cBlock => cBlock.textLines.some(l => l.trim().length > 0))
    .map((cBlock, cIdx) => {
      const pageBlocks: { title: string; textLines: string[] }[] = [];
      let currentPageTitle = 'Page 1';
      let currentPageLines: string[] = [];

      for (const pLine of cBlock.textLines) {
        const h3Match = pLine.match(/^###\s+(.+)$/);
        if (h3Match) {
          if (currentPageLines.some(l => l.trim().length > 0)) {
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

      if (currentPageLines.some(l => l.trim().length > 0) || pageBlocks.length === 0) {
        pageBlocks.push({
          title: currentPageTitle,
          textLines: [...currentPageLines]
        });
      }

      const pagePrecedingTexts: string[] = [];

      const pages: Page[] = pageBlocks
        .filter(pBlock => pBlock.textLines.some(l => l.trim().length > 0))
        .map((pBlock, pIdx) => {
          const pageRawText = pBlock.textLines.join('\n').trim();
          const rawParagraphs = pageRawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

          let pagePriorText = '';

          // Preceding text for paragraphs in this page: all preceding chapters + preceding pages in current chapter
          const precedingParts = [...chapterPrecedingTexts, ...pagePrecedingTexts];
          const precedingText = precedingParts.join('\n\n').trim();

          const paragraphs: Paragraph[] = rawParagraphs.map(pText => {
            const currentPrior = pagePriorText;
            const narrativeText = [precedingText, currentPrior].filter(Boolean).join('\n\n').trim();

            const pObj: Paragraph = {
              paragraph_no: globalParagraphIndex,
              paragraphNo: globalParagraphIndex,
              chapter_no: cIdx,
              chapterNo: cIdx,
              page_no: pIdx,
              pageNo: pIdx,
              paragraph_text: pText,
              paragraphText: pText,
              prior_text: currentPrior,
              priorText: currentPrior,
              preceding_text: precedingText,
              precedingText: precedingText,
              narrative_text: narrativeText,
              narrativeText: narrativeText,
              narrative_summary: '',
              narrativeSummary: '',
              narrative_digest: generateTextDigest(narrativeText || pText),
              narrativeDigest: generateTextDigest(narrativeText || pText)
            };
            globalParagraphIndex++;
            pagePriorText = (pagePriorText ? `${pagePriorText}\n\n${pText}` : pText).trim();
            return pObj;
          });

          pagePrecedingTexts.push(pageRawText);

          return {
            page_no: pIdx,
            pageNo: pIdx,
            chapter_no: cIdx,
            chapterNo: cIdx,
            page_title: pBlock.title,
            pageTitle: pBlock.title,
            page_text: pageRawText,
            pageText: pageRawText,
            page_summary: '',
            pageSummary: '',
            page_digest: generateTextDigest(pageRawText),
            pageDigest: generateTextDigest(pageRawText),
            paragraphs
          };
        });

      const chapterRawText = cBlock.textLines.join('\n').trim();
      chapterPrecedingTexts.push(chapterRawText);

      return {
        chapter_no: cIdx,
        chapterNo: cIdx,
        story_id: 'main',
        storyId: 'main',
        chapter_title: cBlock.title,
        chapterTitle: cBlock.title,
        chapter_text: chapterRawText,
        chapterText: chapterRawText,
        chapter_summary: '',
        chapterSummary: '',
        chapter_digest: generateTextDigest(chapterRawText),
        chapterDigest: generateTextDigest(chapterRawText),
        pages
      };
    });

  const fullStoryText = markdown.trim();

  return {
    story_id: 'main',
    id: 'main',
    story_title: title,
    title,
    story_text: fullStoryText,
    story_summary: '',
    story_digest: generateTextDigest(fullStoryText),
    chapters
  };
}

export function serializeStoryMarkdown(story: Story): string {
  const title = story.story_title || story.title || 'Untitled Story';
  const parts: string[] = [`# ${title}`];

  for (const chapter of story.chapters || []) {
    const chapTitle = chapter.chapter_title || chapter.chapterTitle || `Chapter ${(chapter.chapter_no ?? chapter.chapterNo ?? 0) + 1}`;
    parts.push(`## ${chapTitle}`);
    for (const page of chapter.pages || []) {
      if ((chapter.pages || []).length > 1) {
        const pTitle = page.page_title || page.pageTitle || `Page ${(page.page_no ?? page.pageNo ?? 0) + 1}`;
        parts.push(`### ${pTitle}`);
      }
      for (const p of page.paragraphs || []) {
        parts.push(p.paragraph_text || p.paragraphText || '');
      }
    }
  }

  return parts.join('\n\n');
}

// --- STYLE PARSER & SERIALIZER ---

export function parseStyleMarkdown(markdown: string): Style {
  const defaultStyle: Style = {
    story_id: 'main',
    id: 'main',
    drawing_instructions: 'Vibrant, colorful illustration style, bright colors, clear shapes.',
    drawingInstructions: 'Vibrant, colorful illustration style, bright colors, clear shapes.',
    panel_per_paragraph: true,
    panelPerParagraph: true,
    reference_url: '',
    referenceUrl: '',
    reference_instructions: '',
    referenceInstructions: '',
    use_reference_instructions: true,
    useReferenceInstructions: true,
    style_hash: '',
    styleHash: ''
  };

  if (!markdown || !markdown.trim()) {
    defaultStyle.style_hash = generateTextDigest(defaultStyle.drawing_instructions);
    defaultStyle.styleHash = defaultStyle.style_hash;
    return defaultStyle;
  }

  const lines = markdown.split(/\r?\n/);
  let panelPerParagraph = true;
  let referenceUrl = '';
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

  const drawingInstructions = drawingLines.join('\n').trim() || defaultStyle.drawing_instructions;
  const referenceInstructions = refInstLines.join('\n').trim();

  const styleHash = generateTextDigest(markdown);

  return {
    story_id: 'main',
    id: 'main',
    drawing_instructions: drawingInstructions,
    drawingInstructions,
    panel_per_paragraph: panelPerParagraph,
    panelPerParagraph,
    reference_url: referenceUrl,
    referenceUrl,
    reference_instructions: referenceInstructions,
    referenceInstructions,
    use_reference_instructions: useReferenceInstructions,
    useReferenceInstructions,
    style_hash: styleHash,
    styleHash
  };
}

export function serializeStyleMarkdown(style: Style): string {
  const panelPerParagraph = style.panel_per_paragraph ?? style.panelPerParagraph ?? true;
  const referenceUrl = style.reference_url ?? style.referenceUrl ?? '';
  const useReferenceInstructions = style.use_reference_instructions ?? style.useReferenceInstructions ?? true;
  const drawingInstructions = style.drawing_instructions ?? style.drawingInstructions ?? '';
  const referenceInstructions = style.reference_instructions ?? style.referenceInstructions ?? '';

  const parts: string[] = [
    `# Style Instructions`,
    `- panelPerParagraph: ${panelPerParagraph}`,
    `- referenceUrl: ${referenceUrl}`,
    `- useReferenceInstructions: ${useReferenceInstructions}`,
    `\n## Drawing Instructions\n${drawingInstructions}`
  ];

  if (referenceInstructions && referenceInstructions.trim()) {
    parts.push(`\n## Reference Instructions\n${referenceInstructions.trim()}`);
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

    const cropBoxMatch = trimmed.match(/[-*+]?\s*(?:CropBox|crop_box|BoundingBox):\s*(.+)/i);
    let cropBox: { x: number; y: number; width: number; height: number } | undefined;
    if (cropBoxMatch) {
      try {
        const parsed = JSON.parse(cropBoxMatch[1].trim());
        if (parsed && typeof parsed === 'object' && typeof parsed.x === 'number') {
          cropBox = parsed;
        }
      } catch {
        const nums = cropBoxMatch[1].split(',').map(s => parseFloat(s.trim()));
        if (nums.length === 4 && nums.every(n => !isNaN(n))) {
          cropBox = { x: nums[0], y: nums[1], width: nums[2], height: nums[3] };
        }
      }
    }

    const instMatch = trimmed.match(/\*{0,2}Instructions:\*{0,2}\s*([\s\S]*)$/i);
    let instructionsText = '';
    let descriptionText: string;

    if (instMatch) {
      instructionsText = instMatch[1].trim();
      descriptionText = trimmed
        .replace(/^#{1,6}\s+.+$/m, '')
        .replace(/\*{0,2}Instructions:\*{0,2}[\s\S]*$/i, '')
        .replace(/[-*+]?\s*ReferenceUrl:\s*.+/gi, '')
        .replace(/[-*+]?\s*(?:CropBox|crop_box|BoundingBox):\s*.+/gi, '')
        .trim();
    } else {
      descriptionText = trimmed
        .replace(/^#{1,6}\s+.+$/m, '')
        .replace(/[-*+]?\s*ReferenceUrl:\s*.+/gi, '')
        .replace(/[-*+]?\s*(?:CropBox|crop_box|BoundingBox):\s*.+/gi, '')
        .trim();
    }

    characters.push({
      character_id: `char_${charCount}_${Date.now()}`,
      characterId: `char_${charCount}_${Date.now()}`,
      character_no: charCount,
      characterNo: charCount,
      character_name: name,
      characterName: name,
      name,
      reference_url: referenceUrl,
      referenceUrl,
      image: referenceUrl,
      cropBox,
      crop_box: cropBox ? JSON.stringify(cropBox) : undefined,
      crop_x: cropBox?.x,
      crop_y: cropBox?.y,
      crop_width: cropBox?.width,
      crop_height: cropBox?.height,
      description_text: descriptionText,
      descriptionText,
      description: descriptionText,
      instructions_text: instructionsText,
      instructionsText,
      instructions: instructionsText
    });

    charCount++;
  }

  return characters;
}

export function serializeCharactersMarkdown(characters: Character[]): string {
  if (!characters || characters.length === 0) return '';
  return characters
    .filter(c => (c.character_name || c.characterName || c.name) && (c.character_name || c.characterName || c.name)!.trim())
    .map(c => {
      const name = (c.character_name || c.characterName || c.name)!.trim();
      const refUrl = c.reference_url || c.referenceUrl || c.image || '';
      const desc = c.description_text || c.descriptionText || c.description || '';
      const inst = c.instructions_text || c.instructionsText || c.instructions || '';
      const box = c.cropBox || (typeof c.crop_box === 'object' ? c.crop_box : (typeof c.crop_box === 'string' ? JSON.parse(c.crop_box) : null));

      const parts: string[] = [`## ${name}`];
      if (refUrl) {
        parts.push(`- ReferenceUrl: ${refUrl.trim()}`);
      }
      if (box && box.width > 0 && box.height > 0) {
        parts.push(`- CropBox: ${JSON.stringify(box)}`);
      }
      if (desc && desc.trim()) {
        parts.push(desc.trim());
      }
      if (inst && inst.trim()) {
        parts.push(`**Instructions:**\n${inst.trim()}`);
      }
      return parts.join('\n\n');
    })
    .join('\n\n');
}

export function storyToParagraphs(input: string | Story): { paragraphNo: number; text: string }[] {
  const story = typeof input === 'string' ? parseStoryMarkdown(input) : input;
  const result: { paragraphNo: number; text: string }[] = [];
  let count = 0;
  for (const chap of story.chapters || []) {
    for (const page of chap.pages || []) {
      for (const p of page.paragraphs || []) {
        result.push({
          paragraphNo: count++,
          text: p.paragraph_text || p.paragraphText || ''
        });
      }
    }
  }
  return result;
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

    const paraMatch = trimmed.match(/[-*+]?\s*paragraphId:\s*(\d+)/i) || trimmed.match(/[-*+]?\s*paragraph_no:\s*(\d+)/i);
    const pageMatch = trimmed.match(/[-*+]?\s*pageId:\s*(\d+)/i) || trimmed.match(/[-*+]?\s*page_no:\s*(\d+)/i);
    const chapMatch = trimmed.match(/[-*+]?\s*chapterId:\s*(\d+)/i) || trimmed.match(/[-*+]?\s*chapter_no:\s*(\d+)/i);
    const imgIdxMatch = trimmed.match(/[-*+]?\s*imageIndex:\s*(\d+)/i);
    const lockMatch = trimmed.match(/[-*+]?\s*(?:isLocked|locked|is_locked):\s*(true|false)/i);
    const promptDigestMatch = trimmed.match(/[-*+]?\s*(?:currentPromptDigest|current_prompt_digest|promptDigest):\s*(.+)/i);
    const assignedDigestsMatch = trimmed.match(/[-*+]?\s*(?:assignedPromptDigests|assigned_prompt_digests):\s*(.+)/i);
    const charMatch = trimmed.match(/\*{0,2}Characters:\*{0,2}\s*(.+)/i);

    const paragraphId = paraMatch ? parseInt(paraMatch[1], 10) : instructionNo;
    const pageId = pageMatch ? parseInt(pageMatch[1], 10) : 0;
    const chapterId = chapMatch ? parseInt(chapMatch[1], 10) : 0;
    const imageIndex = imgIdxMatch ? parseInt(imgIdxMatch[1], 10) : 0;
    const isLocked = lockMatch ? lockMatch[1].toLowerCase() === 'true' : false;
    const currentPromptDigest = promptDigestMatch ? promptDigestMatch[1].trim() : null;
    let assignedPromptDigests: string[] = [];
    if (assignedDigestsMatch) {
      try {
        assignedPromptDigests = JSON.parse(assignedDigestsMatch[1].trim());
      } catch {
        assignedPromptDigests = assignedDigestsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    if (currentPromptDigest && !assignedPromptDigests.includes(currentPromptDigest)) {
      assignedPromptDigests.push(currentPromptDigest);
    }
    const charList = charMatch ? charMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [];

    let cinematographicDirections: string;
    const dirMatch = trimmed.match(/<cinematographic-directions>([\s\S]*?)<\/cinematographic-directions>/i) ||
      trimmed.match(/<cinematographic-text>([\s\S]*?)<\/cinematographic-text>/i);
    if (dirMatch) {
      cinematographicDirections = dirMatch[1].trim();
    } else {
      const textLines = trimmed.split(/\r?\n/).filter(l =>
        !l.match(/^#{1,6}\s+(?:Instruction|Panel)/i) &&
        !l.match(/[-*+]?\s*(?:paragraphId|pageId|chapterId|imageIndex|isLocked|locked|is_locked|currentPromptDigest|current_prompt_digest|promptDigest|assignedPromptDigests|assigned_prompt_digests|Characters|paragraph_no|page_no|chapter_no):/i)
      );
      cinematographicDirections = textLines.join('\n').trim();
    }

    instructions.push({
      instructionNo,
      paragraph_no: paragraphId,
      paragraphNo: paragraphId,
      paragraphId,
      page_no: pageId,
      pageNo: pageId,
      pageId,
      chapter_no: chapterId,
      chapterNo: chapterId,
      chapterId,
      imageIndex,
      cinematographic_directions: cinematographicDirections,
      cinematographicDirections,
      cinematographicText: cinematographicDirections,
      assigned_characters: charList,
      characters: charList,
      assigned_prompt_digests: assignedPromptDigests,
      current_prompt_digest: currentPromptDigest,
      promptDigest: currentPromptDigest || undefined,
      images: [],
      is_locked: isLocked,
      isLocked
    });

    counter++;
  }

  return instructions;
}

export function serializeInstructionsMarkdown(instructions: Instruction[]): string {
  if (!instructions || instructions.length === 0) return '';
  return instructions
    .sort((a, b) => (a.instructionNo ?? a.paragraph_no ?? 0) - (b.instructionNo ?? b.paragraph_no ?? 0))
    .map(inst => {
      const num = inst.instructionNo ?? inst.paragraph_no ?? 0;
      const paragraphId = inst.paragraph_no ?? inst.paragraphNo ?? inst.paragraphId ?? num;
      const pageId = inst.page_no ?? inst.pageNo ?? inst.pageId ?? 0;
      const chapterId = inst.chapter_no ?? inst.chapterNo ?? inst.chapterId ?? 0;
      const imageIndex = inst.imageIndex ?? 0;
      const isLocked = Boolean(inst.is_locked ?? inst.isLocked);
      const currentDigest = inst.current_prompt_digest || inst.promptDigest;
      const assignedDigests = inst.assigned_prompt_digests;
      const chars = inst.assigned_characters ?? inst.characters ?? [];
      const charArr = Array.isArray(chars) ? chars : (typeof chars === 'string' ? JSON.parse(chars) : []);
      const dirs = inst.cinematographic_directions ?? inst.cinematographicDirections ?? inst.cinematographicText ?? '';

      const parts: string[] = [
        `## Instruction ${num}`,
        `- paragraphId: ${paragraphId}`,
        `- pageId: ${pageId}`,
        `- chapterId: ${chapterId}`,
        `- imageIndex: ${imageIndex}`,
        ...(isLocked ? [`- isLocked: true`] : []),
        ...(currentDigest ? [`- currentPromptDigest: ${currentDigest}`] : []),
        ...(Array.isArray(assignedDigests) && assignedDigests.length > 0 ? [`- assignedPromptDigests: ${JSON.stringify(assignedDigests)}`] : [])
      ];
      if (charArr.length > 0) {
        parts.push(`**Characters:** ${charArr.join(', ')}`);
      }
      if (dirs && dirs.trim()) {
        parts.push(`<cinematographic-directions>\n${dirs.trim()}\n</cinematographic-directions>`);
      }
      return parts.join('\n\n');
    })
    .join('\n\n');
}
