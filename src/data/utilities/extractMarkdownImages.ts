export default function extractMarkdownImages(text: string) {
    // Regex to match ![description](url)
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;

    // Find all matches in the text
    const matches = [...text.matchAll(regex)];

    // Map the results to desired object structure
    return matches.map(match => ({
        description: match[1], // The text inside the square brackets []
        url: match[2]          // The URL inside the parentheses ()
    }));
}
