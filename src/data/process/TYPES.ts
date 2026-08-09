export interface Paragraph {
  paragraph_no: number;
  paragraphNo?: number;
  chapter_no: number;
  chapterNo?: number;
  page_no: number;
  pageNo?: number;
  paragraph_text: string;
  paragraphText?: string;
  prior_text?: string;
  priorText?: string;
  preceding_text?: string;
  precedingText?: string;
  narrative_summary?: string;
  narrativeSummary?: string;
  narrativeText?: string;
  narrative_digest?: string;
  narrativeDigest?: string;
  [key: string]: any;
}

export interface Page {
  page_no: number;
  pageNo?: number;
  chapter_no: number;
  chapterNo?: number;
  page_title: string;
  pageTitle?: string;
  page_text: string;
  pageText?: string;
  page_summary?: string;
  pageSummary?: string;
  page_digest?: string;
  pageDigest?: string;
  paragraphs?: Paragraph[];
  [key: string]: any;
}

export interface Chapter {
  chapter_no: number;
  chapterNo?: number;
  story_id?: string;
  storyId?: string;
  chapter_title: string;
  chapterTitle?: string;
  chapter_text: string;
  chapterText?: string;
  chapter_summary?: string;
  chapterSummary?: string;
  chapter_digest?: string;
  chapterDigest?: string;
  pages?: Page[];
  [key: string]: any;
}

export interface Story {
  story_id?: string;
  id?: string; // 'main'
  story_title?: string;
  title?: string;
  story_text?: string;
  story_summary?: string;
  story_digest?: string;
  chapters?: Chapter[];
  [key: string]: any;
}

export interface StoryRecord extends Story {
  id: string; // 'main'
}

export interface Style {
  story_id?: string;
  id?: string; // 'main'
  drawing_instructions: string;
  drawingInstructions?: string;
  panel_per_paragraph: boolean;
  panelPerParagraph?: boolean;
  reference_url?: string;
  referenceUrl?: string;
  reference_instructions?: string;
  referenceInstructions?: string;
  use_reference_instructions: boolean;
  useReferenceInstructions?: boolean;
  style_hash?: string;
  styleHash?: string;
  storyTitle?: string;
  linkInstructions?: string;
  [key: string]: any;
}

export interface StyleRecord extends Style {
  id: string; // 'main'
}

export interface Character {
  character_id?: string;
  characterId?: string;
  character_no: number;
  characterNo?: number;
  character_name: string;
  characterName?: string;
  name?: string;
  reference_url?: string;
  referenceUrl?: string;
  image?: string;
  description_text: string;
  descriptionText?: string;
  description?: string;
  instructions_text: string;
  instructionsText?: string;
  instructions?: string;
  cropBox?: { x: number; y: number; width: number; height: number };
  [key: string]: any;
}

export interface Summary {
  summaryId?: number;
  summary_digest?: string;
  digest?: string;
  summary_text: string;
  summaryText?: string;
  [key: string]: any;
}

export interface ImageEntry {
  status: 'PROCESSING' | 'SAVED' | 'FAILED' | 'COMPLETE';
  styleText?: string;
  cinematographicText?: string;
  characterText?: string;
  sceneText?: string;
  narrativeText?: string;
  promptDigest: string;
  [key: string]: any;
}

export interface ImageEntity {
  image_digest: string;
  image_status: 'PROCESSING' | 'SAVED' | 'FAILED';
  created_at: Date | string;
  [key: string]: any;
}

export interface Instruction {
  instructionNo?: number;
  paragraph_no?: number;
  paragraphNo?: number;
  paragraphId?: number;
  page_no?: number;
  pageNo?: number;
  pageId?: number;
  chapter_no?: number;
  chapterNo?: number;
  chapterId?: number;
  imageIndex?: number;
  cinematographic_directions?: string | null;
  cinematographicDirections?: string;
  cinematographicText?: string;
  assigned_characters?: string[] | string | null;
  characters?: string[];
  assigned_prompt_digests?: string[] | string | null;
  current_prompt_digest?: string | null;
  promptDigest?: string;
  images?: ImageEntry[];
  is_locked?: boolean | null;
  isLocked?: boolean;
  [key: string]: any;
}

export interface Prompt {
  prompt_digest?: string;
  digest?: string;
  prompt_text: string;
  promptText?: string;
  style_text?: string;
  cinematographic_text?: string;
  character_text?: string;
  narrative_text?: string;
  scene_text?: string;
  [key: string]: any;
}
