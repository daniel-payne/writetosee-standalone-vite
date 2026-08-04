export interface Paragraph {
  paragraphNo: number;
  paragraphText: string;
  priorText: string;
  narrativeText: string;
  narrativeDigest: string;
}

export interface Page {
  pageNo: number;
  pageTitle: string;
  pageText: string;
  pageSummary: string;
  pageDigest: string;
  paragraphs: Paragraph[];
}

export interface Chapter {
  chapterNo: number;
  chapterTitle: string;
  chapterText: string;
  chapterSummary: string;
  chapterDigest: string;
  pages: Page[];
}

export interface Story {
  title: string;
  chapters: Chapter[];
}

export interface StoryRecord extends Story {
  id: string; // 'main'
}

export interface Style {
  drawingInstructions: string;
  panelPerParagraph: boolean;
  referenceUrl: string;
  referenceInstructions: string;
  useReferenceInstructions: boolean;
}

export interface StyleRecord extends Style {
  id: string; // 'main'
}

export interface Character {
  characterNo: number;
  characterName: string;
  referenceUrl: string;
  descriptionText: string;
  instructionsText: string;
}

export interface Summary {
  summaryId: number;
  digest: string;
  summaryText: string;
}

export interface ImageEntry {
  status: 'PROCESSING' | 'COMPLETE' | 'FAILED';
  styleText: string;
  cinematographicText: string;
  characterText: string;
  sceneText: string;
  narrativeText: string;
  promptDigest: string;
}

export interface Instruction {
  instructionNo: number;
  paragraphId: number;
  pageId: number;
  chapterId: number;
  imageIndex: number;
  cinematographicDirections: string;
  characters: string[];
  images: ImageEntry[];
}

export interface Prompt {
  digest: string;
  promptText: string;
}
