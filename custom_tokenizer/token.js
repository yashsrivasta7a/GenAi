import fs from 'fs';
import PromptSync from 'prompt-sync';
const prompt = PromptSync();

const specialToken = ["<START>", "<END>", "<UNK>"];

const corpus = fs.readFileSync('vocab.txt', 'utf-8');


function buildVocab(text) {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const uniqueWords = [...new Set(words)];

    const dict = {};
    specialToken.forEach((token, idx) => {
        dict[token] = idx;
    });
    uniqueWords.forEach((word, idx) => {
        dict[word] = idx + specialToken.length;
    });
    return dict;
}

const dict = buildVocab(corpus);

fs.writeFileSync('dict.json', JSON.stringify(dict, null, 2));
console.log("Dictionary is built and saved:", dict);


function encode(text, vocab) {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    return [vocab["<START>"], ...words.map(w => vocab[w] ?? vocab["<UNK>"]), vocab["<END>"]];
}

function decode(tokens, vocab) {
    const reverseDict = Object.fromEntries(Object.entries(vocab).map(([k, v]) => [v, k]));
    return tokens.map(t => reverseDict[t] ?? "<UNK>").join(' ');
}

let input = prompt("Please enter your string: ");
const encoded = encode(input, dict);
console.log("Encoded:", encoded);

const decoded = decode(encoded, dict);
console.log("Decoded:", decoded);
