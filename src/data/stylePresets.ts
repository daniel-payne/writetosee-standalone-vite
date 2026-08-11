import { CHILDRENS_BOOK_INSTRUCTIONS } from './styles/childrensBook';
import { GRAPHIC_NOVEL_INSTRUCTIONS } from './styles/graphicNovel';
import { PHOTO_REALISTIC_INSTRUCTIONS } from './styles/photoRealistic';
import { MANGA_COMIC_INSTRUCTIONS } from './styles/mangaComic';
import { SUPERHERO_COMIC_INSTRUCTIONS } from './styles/superheroComic';
import { CLAYMATION_INSTRUCTIONS } from './styles/claymation';

export { CHILDRENS_BOOK_INSTRUCTIONS } from './styles/childrensBook';
export { GRAPHIC_NOVEL_INSTRUCTIONS } from './styles/graphicNovel';
export { PHOTO_REALISTIC_INSTRUCTIONS } from './styles/photoRealistic';
export { MANGA_COMIC_INSTRUCTIONS } from './styles/mangaComic';
export { SUPERHERO_COMIC_INSTRUCTIONS } from './styles/superheroComic';
export { CLAYMATION_INSTRUCTIONS } from './styles/claymation';

export const STYLE_PRESETS: Record<string, string> = {
  CHILDRENS_BOOK: CHILDRENS_BOOK_INSTRUCTIONS,
  GRAPHIC_NOVEL: GRAPHIC_NOVEL_INSTRUCTIONS,
  PHOTO_REALISTIC: PHOTO_REALISTIC_INSTRUCTIONS,
  MANGA_COMIC: MANGA_COMIC_INSTRUCTIONS,
  SUPERHERO_COMIC: SUPERHERO_COMIC_INSTRUCTIONS,
  CLAYMATION: CLAYMATION_INSTRUCTIONS,
};

export type StylePresetKey = keyof typeof STYLE_PRESETS;
