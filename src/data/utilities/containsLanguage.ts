const WORD_LISTS: Record<string, Set<string>> = {
    english: new Set([
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
        'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
        'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
        'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one',
        'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out',
        'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
        'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know'
    ]),
    french: new Set([
        'le', 'la', 'de', 'un', 'une', 'et', 'à', 'il', 'elle', 'est',
        'pas', 'que', 'qui', 'aller', 'les', 'en', 'ça', 'faire', 'tout',
        'on', 'mais', 'nous', 'vous', 'pour', 'dans', 'ce', 'qui', 'sur',
        'ne', 'se', 'par', 'plus', 'pouvoir', 'avec', 'dire', 'savoir'
    ]),
    german: new Set([
        'der', 'die', 'das', 'und', 'sein', 'in', 'ein', 'zu', 'haben',
        'ich', 'werden', 'sie', 'von', 'nicht', 'mit', 'es', 'sich',
        'auch', 'auf', 'für', 'an', 'er', 'so', 'dass', 'können',
        'dies', 'als', 'ihr', 'ja', 'wie', 'bei', 'oder', 'wir'
    ]),
    italian: new Set([
        'il', 'la', 'di', 'e', 'un', 'una', 'a', 'in', 'che', 'non',
        'si', 'da', 'lo', 'per', 'con', 'ma', 'come', 'questo', 'quello',
        'su', 'mi', 'io', 'sono', 'essere', 'avere', 'fare', 'tutto',
        'cosa', 'molto', 'più', 'anche', 'loro', 'lei', 'lui'
    ]),
    portuguese: new Set([
        'o', 'a', 'de', 'e', 'um', 'uma', 'para', 'em', 'não', 'é',
        'com', 'do', 'da', 'os', 'as', 'mas', 'por', 'se', 'como',
        'que', 'ele', 'ela', 'eu', 'isso', 'muito', 'mais', 'foi',
        'já', 'quando', 'mesmo', 'minha', 'meu', 'seu', 'sua'
    ]),
    spanish: new Set([
        'el', 'la', 'de', 'y', 'un', 'una', 'a', 'en', 'que', 'no',
        'es', 'con', 'por', 'para', 'lo', 'como', 'su', 'este', 'pero',
        'más', 'o', 'ir', 'si', 'mi', 'yo', 'todo', 'esta', 'hacer',
        'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'te'
    ])
};

export default function containsLanguage(text: string, language = 'english', minLength = 10) {
    if (!text || typeof text !== 'string') return false;

    const str = text.trim();
    if (str.length < minLength) return false; // too short to judge

    // Normalize language key
    const langKey = language.toLowerCase();
    const commonWords = WORD_LISTS[langKey] || WORD_LISTS['english'];

    // Remove common punctuation and numbers, keep letters (including accented ones) and spaces
    // \u00C0-\u00FF covers most Latin-1 Supplement characters (accents, umlauts, etc.)
    const clean = str.toLowerCase().replace(/[^a-z\u00C0-\u00FF\s]/g, '');

    if (clean.length < minLength) return false;

    const words = clean.split(/\s+/).filter(word => word.length > 0);

    // If almost no alphabetic content
    if (words.length === 0) return false;

    // Count how many real words we recognize
    let realWordCount = 0;
    let totalWords = 0;

    for (const word of words) {
        if (word.length >= 1 && word.length <= 20) { // reasonable word length
            totalWords++;
            if (commonWords?.has(word)) {
                realWordCount++;
            }
        }
    }

    // Also check for excessive repetition of same characters (e.g. "aaaaaaa")
    const hasRepeatedChars = /(.)\1{6,}/.test(str); // 7+ same chars in a row

    // Consonant check is tricky for some languages, but generally valid for these western languages
    // Relaxed slightly for languages that might have clusters, but 10 consonants in a row is still suspicious
    const hasTooManyConsonants = /^[^aeiouy\u00C0-\u00FF]{10,}$/i.test(clean.replace(/\s/g, ''));

    // High percentage of common words + no red flags = likely the target language
    if (hasRepeatedChars || hasTooManyConsonants) return false;

    const realWordRatio = totalWords > 0 ? realWordCount / totalWords : 0;

    // Adjust threshold as needed:
    // 0.15 means at least ~15% of words are very common words for that language
    return realWordRatio >= 0.15 || realWordCount >= 3;
}