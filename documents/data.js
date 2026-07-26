const styleInstructions = [
    {
        name: 'Childrens Book',
        instructions: [
            'You are a illustrator for a children\'s book.',
            'The target persona is a boy or girl aged between 4 and 8 years old.',
            'The lighting is form all directions, creating a happy and childlike landscape.',
            'Keep the background in focus, and of the same style as the foreground object.',
            'Use bright colors and clear shapes to capture the attention of young readers.',
            'Do not illustrate any words, signs or speech bubbles unless specifically asked for in the <drawing-depiction>.',
            'Thr illustration is to fill the complete drawing area.',
            'Do not make any illustration with rounded edges, the completed illustration should be a rectangle.',
            'Do not draw any frame, boundary or any decoration around the image.',
            'Each illustration should be lively and expressive, conveying the emotions and actions of the characters clearly.',
            'The illustrations should be colorful, engaging, and simple enough for young children to understand.',
            'Ensure that the illustrations complement the text and help to tell the story visually.',
        ]
    },
    {
        name: 'Graphic Novel',
        instructions: [
            'You are an illustrator for an 18+ graphic novel / mature comic series.',
            'The target audience is young adults aged 18–25 (male or female readers).',
            'The lighting is dramatic and selective — strong chiaroscuro, neon accents, rim lighting, moody colored gels, or cinematic single-source light with deep shadows to create tension, intimacy, or atmosphere.',
            'Background and foreground share the same stylized art style; keep the environment detailed and immersive so it feels like a lived-in, believable world that supports the mood.',
            'Use a bold, vivid but slightly desaturated or high-contrast color palette — rich jewel tones, cyber-noir hues, blood reds, electric blues, bruised purples, acid greens — with striking accents to grab attention.',
            'Shapes are sharp, dynamic, and angular when conveying intensity; curves are confident and expressive when showing sensuality or grace.',
            'Do not include any readable text, signs, logos, or speech bubbles unless explicitly requested in the <drawing-depiction>.',
            'The illustration fills the entire rectangular canvas edge-to-edge with no borders, frames, vignettes, or decorative edges.',
            'Characters should feel alive, psychologically complex, and physically expressive — use body language, facial micro-expressions, tension in muscles/jaw/shoulders, and suggestive posing to convey desire, conflict, defiance, vulnerability, rage, seduction, melancholy, or other adult emotions.',
            'Anatomy can be stylized and idealized (longer limbs, sharper jawlines, accentuated curves/musculature) but remains believable and weighty — no exaggerated chibi or super-deformed proportions.',
            'The overall mood is cinematic, atmospheric, slightly dangerous, sensual, rebellious, introspective, hedonistic, or emotionally raw — never cute, innocent or saccharine.',
            'Illustrations should feel mature, visually striking, and emotionally charged, enhancing a story that deals with adult themes (relationships, power dynamics, identity, desire, violence, moral ambiguity, hedonism, trauma, etc.).',
        ],
        useLanguageFilter: false,
    },
    {
        name: 'Photo Realistic',
        instructions: [
            'Ultra-realistic cinematic photographic style, photorealistic quality, shot on professional 35mm lens camera with shallow depth of field.',
            'Designed as a single, full-page photograph with no panel borders, no gutters, no frames, and no multi-panel divisions.',
            'High-detail skin textures, natural lighting, realistic shadow falloff, subtle ambient reflections, and lifelike physical depth.',
            'Color palette is natural, rich, and cinematically balanced with accurate exposure and organic color grading.',
            'Characters are portrayed with natural human expressions, authentic physical postures, and true-to-life anatomy and proportions.',
            'Background scenery is realistic, detailed, and atmospheric, seamlessly matching the focal depth and lighting of the foreground subjects.',
            'No speech bubbles, no dialogue text, no sound effect lettering, and no borders or frames.',
            'The overall mood is immersive, realistic, and cinematic, bringing the scene to life as an authentic real-world photograph.',
        ]
    }
]


const story = `# Chapter 1
The cat sat on the mat, beside the fireplace. The storm raged outside, wind and heavy rain.

Mr Brown was a lumberjack, he had spent the day working in the woods, the wind an rain howling around him.

Mrs Brown was in the kitchen cooking, pots on the stove bubbling away. In here hands was a beef pie, she was about to put it in the oven.

Mr Brown made his way home through the woods, the wind an rain howling around him.

When he got home and opend the door, he saw Polly sleeping on the floor.
`

const style = {
    storyTitle: 'The Hero\'s Journey',
    drawingInstructions: [
        'You are a illustrator for a children\'s book.',
        'The target persona is a boy or girl aged between 4 and 8 years old.',
        'The lighting is form all directions, creating a happy and childlike landscape.',
        'Keep the background in focus, and of the same style as the foreground object.',
        'Use bright colors and clear shapes to capture the attention of young readers.',
        'Do not illustrate any words, signs or speech bubbles unless specifically asked for in the <drawing-depiction>.',
        'Thr illustration is to fill the complete drawing area.',
        'Do not make any illustration with rounded edges, the completed illustration should be a rectangle.',
        'Do not draw any frame, boundary or any decoration around the image.',
        'Each illustration should be lively and expressive, conveying the emotions and actions of the characters clearly.',
        'The illustrations should be colorful, engaging, and simple enough for young children to understand.',
        'Ensure that the illustrations complement the text and help to tell the story visually.',
    ],
    link: 'https://i.pinimg.com/474x/34/d3/0d/34d30dad987dc4bc1a8f7275b3a178e8.jpg',
    linkInstructions: [
        '** CRITICAL ARTISTIC STYLE REFERENCE OVERRIDE**',
        'The following image defines the artistic style, color palette, and overall aesthetic you should use for the generation. ',
        'Please emulate this visual style, but do not copy the specific subjects.',
        'Mixed media illustration combining pen and watercolor.',
        'Characterized by a charming, whimsical, and slightly nostalgic aesthetic.',
        'Evokes the style of a loosely illustrated children\'s book.',
        'Features prominent, hand-drawn, dark outlines with a distinctly sketchy quality.',
        'Linework is organic and imperfect, showing varying thickness and occasional overlaps.',
        'Edges are defined by both expressive sketch lines and soft, diffused watercolor washes.',
        'Shading is applied with soft, translucent watercolor washes.',
        'Lighting is soft and ambient, without dramatic contrasts or explicit light sources.',
        'Volume is subtly suggested through simple color fills and gentle gradations within washes.',
        'Renders surfaces with a natural, matte, paper-like finish rather than glossy or reflective materials.',
        'Employs a largely natural and subdued color palette.',
        'Features soft, muted background tones with more vibrant, naturalistic colors for key elements.',
        'Colors are applied with transparent watercolor techniques, often showing slight bleed or uneven coverage.',
        'Exhibits a distinct watercolor paper texture and fluid brushstrokes.',
        'Details are simplified and stylized, focusing on overall form rather than intricate realism.',
        'Backgrounds are rendered with abstract, soft watercolor washes, providing a minimalist context.',
        'Forms are generally soft, rounded, and organically shaped.',
        'Subjects feature stylized, slightly exaggerated proportions common in character illustration.'
    ],
}

const publication = {
    lines: [
        { chapter: 1, page: 1, parararagh: 1, panel: 1, characters: ['Polly'], text: 'The cat sat on the mat, beside the fireplace. The storm raged outside, wind and heavy rain.' },
        { chapter: 1, page: 1, parararagh: 2, panel: 2, characters: ['Mr Brown'], text: 'Mr Brown was a lumberjack, he had spent the day working in the woods, the wind an rain howling around him.', priorText: 'The cat sat on the mat, beside the fireplace. The storm raged outside, wind and heavy rain.' },
        { chapter: 1, page: 1, parararagh: 3, panel: 3, characters: ['Mrs Brown'], text: 'Mrs Brown was in the kitchen cooking, pots on the stove bubbling away. In here hands was a beef pie, she was about to put it in the oven.', priorText: 'Mr Brown was a lumberjack, he had spent the day working in the woods, the wind an rain howling around him.' },
        { chapter: 1, page: 1, parararagh: 4, panel: 4, characters: ['Mr Brown'], text: 'Mr Brown made his way home through the woods, the wind an rain howling around him.', priorText: 'Mrs Brown was in the kitchen cooking, pots on the stove bubbling away. In here hands was a beef pie, she was about to put it in the oven.' },
        { chapter: 1, page: 1, parararagh: 5, panel: 5, characters: ['Mr Brown', 'Polly'], text: 'When he got home and opend the door, he saw Polly sleeping on the floor.', priorText: 'Mr Brown made his way home through the woods, the wind an rain howling around him.' },
    ],

    pageSummaries: [
        { hapter: 1, page: 1, text: '' }
    ],

    chapterSummaries: [
        { hapter: 1, text: '' }
    ],

    characters: [
        'Mr Brown',
        'Polly',
        'Mrs Brown'
    ]

}


const characters = [
    {
        name: 'Mrs. Brown',
        referenceUrl: 'https://www.shutterstock.com/image-photo/grandma-cartoon-no-background-600nw-2573538049.jpg',
        drawingInstructions: [
            'An elderly woman with a stout, rounded body type.',
            'She is presented in a highly stylized, 3D cartoon aesthetic with soft, rounded features.',
            'Her face shape is broad and slightly oval, wider at the cheeks and tapering towards the chin.',
            'Her eyes are small, simple black dots (#000000), spaced widely apart.',
            'Her eyebrows are thin, curved, and match her hair color, gray/white (#E8E8E8).',
            'Her nose is small, rounded, and button-like, protruding slightly from her face.',
            'Her mouth is wide, curved upwards in a gentle, cheerful smile.',
            'Her lips are thin, well-defined, and soft pink (#E0A898).',
            'Her ears are simple, rounded, with attached lobes, partially obscured by hair.',
            'She has prominent smile lines around her mouth and eyes, and two horizontal wrinkles on her forehead.',
            'Her hair is styled in a neat, high bun on top of her head, swept back from her face.',
            'Her hair is light gray, almost silver white (#E8E8E8), appearing smooth and straight.',
            'A scarlet red (#CC0000) hair tie secures her bun.',
            'Her skin tone is a light peach (#F2D1BE) with warm undertones.',
            'Her skin texture is smooth, typical of a cartoon style, with no visible freckles, moles, or scars.',
            'Soft rose pink (#F5C5B5) blush is applied to her cheeks.',
            'She has chibi-like body proportions, with a large head-to-body ratio, approximately 1:2.',
            'Her shoulders are broad, appearing wider than her hips, and her limbs are short and stout.',
            'Her posture is upright, slightly hunched as if engaged in an activity.',
            'She wears a dark teal (#3C7D73) simple inner dress or long tunic.',
            'She wears an open-front, knitted cardigan that is burnt orange (#F08D58) in color.',
            'The cardigan features a pattern of peach puff (#FFDAB9) and terra cotta (#E05842) floral or leaf shapes.',
            'Her cardigan has long sleeves and a loose fit.',
            'She wears round, black (#000000) framed glasses positioned on her nose bridge.',
            'She has small, round, aqua teal (#52B4AA) stud earrings.',
            'She is holding two silver (#A0A0A0) knitting needles, actively knitting a piece of fabric.',
            'The knitted fabric in progress is aqua teal (#52B4AA) and appears to be in a stockinette stitch.',
            'A ball of aqua teal (#52B4AA) yarn rests on the floor next to her, connected to her knitting project.',
            'She wears dark espresso black (#3D2B2B) mary jane style flats.'
        ]
    },
    {
        name: 'Polly',
        drawingInstructions: [
            'Polly is a white and ginger striped short-haired cat.'
        ]
    }
]


const panels = [
    {
        panel: 0,
        columns: 6,
        image: '01-001.png',
        video: '01-001.mp4',
        texts: [
            {
                position: 'top-[-20px] left-8',
                text: 'The penny has dropped, after spending 2 days reading antigravity-awesome-skills, \n I have realised Skills.md is just declarative programming on steroids.',
            }
        ]
    },
    {
        panel: 1,
        columns: 3,
        image: '02-001.png',
        texts: [
            { position: 'top-[-20px] left-[20px]', rotate: '-rotate-3', width: 'w-auto', text: 'Let me explain.' },
            { position: 'bottom-[-30px] right-[-30px]', width: 'w-full', text: 'The managers who have just fired employees because they think AI with a few people can do a better job, have killed their companies.' }
        ]
    },
]

