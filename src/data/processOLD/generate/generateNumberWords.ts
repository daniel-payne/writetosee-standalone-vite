export default function generateNumberWords(num: number): string {
    if (num === 0) return 'zero';

    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const thousands = ['', 'thousand', 'million'];

    let words = '';
    let chunkCount = 0;

    while (num > 0) {
        if (num % 1000 !== 0) {
            let chunk = num % 1000;
            let chunkWords = '';

            if (chunk >= 100) {
                chunkWords += ones[Math.floor(chunk / 100)] + ' hundred ';
                chunk %= 100;
            }
            if (chunk >= 20) {
                chunkWords += tens[Math.floor(chunk / 10)] + ' ';
                chunk %= 10;
            }
            if (chunk > 0) {
                chunkWords += ones[chunk] + ' ';
            }

            chunkWords += thousands[chunkCount] + ' ';
            words = chunkWords + words;
        }
        num = Math.floor(num / 1000);
        chunkCount++;
    }

    return words.trim().replace(/\s+/g, ' ');
}