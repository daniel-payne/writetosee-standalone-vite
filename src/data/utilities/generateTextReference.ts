export default function generateTextReference(input: string, wordLength = 20, addRandomNumber = 2) {
    if (input == null) {
        return null
    }

    const words = input.toLowerCase().replace(/\s+/g, '-').split('-')

    const text = words.map(word => word.substring(0, wordLength)).join('-')

    if (addRandomNumber > 0) {
        return text + '-' + Math.floor((Math.random() * Math.pow(10, addRandomNumber))).toString()
    }

    return text
}