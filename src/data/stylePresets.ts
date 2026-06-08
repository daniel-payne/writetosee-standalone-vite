export const STYLE_PRESETS: Record<string, string> = {
  CHILDRENS_BOOK: `
Vibrant, colorful children's book illustration style, bright colors, clear shapes, happy atmosphere, fameless, full-bleed, no white margins, edge-to-edge environment. Keep the background in focus and of the same style as the foreground.
Ensure that the illustrations complement the text, are lively and expressive, and simple enough for young children aged 4 to 8 years old to understand.
The target persona is a boy or girl aged between 4 and 8 years old.
The lighting is from all directions, creating a happy and childlike landscape.
Use bright colors and clear shapes to capture the attention of young readers.
Each illustration should be lively and expressive, conveying the emotions and actions of the characters clearly.
The illustrations should be colorful, engaging, and simple enough for young children to understand.
Ensure that the illustrations complement the text and help to tell the story visually.
`,
  GRAPHIC_NOVEL: `
You are an illustrator for an 18+ graphic novel / mature comic series.
The target audience is young adults aged 18–25 (male or female readers).
The lighting is dramatic and selective — strong chiaroscuro, neon accents, rim lighting, moody colored gels, or cinematic single-source light with deep shadows to create tension, intimacy, or atmosphere.
Background and foreground share the same stylized art style; keep the environment detailed and immersive so it feels like a lived-in, believable world that supports the mood.
Use a bold, vivid but slightly de-saturated or high-contrast color palette — rich jewel tones, cyber-noir hues, blood reds, electric blues, bruised purples, acid greens — with striking accents to grab attention.
Shapes are sharp, dynamic, and angular when conveying intensity; curves are confident and expressive when showing sensuality or grace.
Do not include any readable text, signs, logos, or speech bubbles unless explicitly requested in the <drawing-depiction>.
The illustration fills the entire rectangular canvas edge-to-edge with no borders, frames, vignettes, or decorative edges.
Characters should feel alive, psychologically complex, and physically expressive — use body language, facial micro-expressions, tension in muscles/jaw/shoulders, and suggestive posing to convey desire, conflict, defiance, vulnerability, rage, seduction, melancholy, or other adult emotions.
Anatomy can be stylized and idealized (longer limbs, sharper jawlines, accentuated curves/musculature) but remains believable and weighty — no exaggerated chibi or super-deformed proportions.
The overall mood is cinematic, atmospheric, slightly dangerous, sensual, rebellious, introspective, hedonistic, or emotionally raw — never cute, innocent or saccharine.
Illustrations should feel mature, visually striking, and emotionally charged, enhancing a story that deals with adult themes (relationships, power dynamics, identity, desire, violence, moral ambiguity, hedonism, trauma, etc.).
`,
  MANGA_COMIC: `
Authentic Japanese manga art style, highly detailed black and white ink line art with professional screen tone (halftone) shading.
Designed as a single, full-page splash illustration (splash page) with no panel borders, no gutters, and no multi-panel divisions.
Strong, clean black ink line-work, bold black shadows, high-contrast chiaroscuro rendering, and detailed hatching.
Characters are drawn in classic manga style with expressive, detailed faces, characteristic large expressive eyes, and stylized hair.
Dynamic action lines, speed lines, or abstract background patterns are integrated seamlessly to emphasize motion, impact, or intense emotion.
Detailed background scenery rendered in clean ink line art and screen tones, keeping the environment in perfect focus and stylistically unified with the characters.
No speech bubbles, no dialogue text, no sound effect lettering (onomatopoeia), and no borders or frames.
The overall atmosphere is dramatic, cinematic, and filled with energy, typical of high-quality manga splash art.
`,
  SUPERHERO_COMIC: `
Bold, dynamic superhero comic book illustration style, inspired by modern Marvel and DC comic splash pages.
Strong, clean ink line art with professional comic book coloring, rich color rendering, and dramatic high-contrast lighting.
Designed as a single, full-page splash illustration with no panel borders, no gutters, and no multi-panel divisions.
Characters have powerful heroic anatomy, dynamic athletic posing, and intense, expressive facial expressions.
Cinematic action framing, dramatic low-angle or high-energy perspective shots that make characters look heroic, powerful, and majestic.
Vibrant, saturated color palette with rich gradients, clean highlights, and deep, dramatic shadows.
Backgrounds are detailed environments (e.g., soaring skylines, epic battlefields, futuristic bases) rendered in matching detailed comic style.
No speech bubbles, no dialogue text, no sound effect lettering (like "POW" or "BOOM"), and no borders or frames.
`,
  CLAYMATION: `
Charming claymation stop-motion animation style, inspired by the classic look of Aardman animations like Wallace and Gromit.
Characters and objects have a tangible plasticine clay texture, with subtle thumbprints, visible seams, and soft hand-molded details.
Warm, cozy, and slightly whimsical atmosphere, with British charm, soft studio lighting, and gentle ambient shadows.
Designed as a single full-bleed, edge-to-edge illustration with no margins, frames, or borders.
Colorful and inviting color palette with slightly matte or semi-gloss finishes typical of real modeling clay.
Backgrounds are detailed clay-sculpted sets, kept in clear focus and matching the style of the characters.
No speech bubbles, no dialogue text, no sound effect lettering, and no borders or frames.
`
};

export type StylePresetKey = keyof typeof STYLE_PRESETS;
