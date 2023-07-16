// stupid quick script to extract markdown documentation of a specific function
// from a typedoc generated markdown file and insert it into README.md
// done because I want to document the most important main function in the README, rest of
// the documentation is in the documentation site
const fs = require('fs');

const extractText = (file, start, end) => {
    const text = fs.readFileSync(file, 'utf8');
    const regex = new RegExp(`(?=${start})([\\s\\S]*)${end}`, 'gm');
    return regex.exec(text)[1].trim();
};

const replaceMdLinks = (text) => {
    const regex = /\(([^)]+)\.md\)/g;
    const link = 'https://0x464e.github.io/slideshow-video/';
    return text.replace(regex, `(${link}$1)`);
};

const updateText = (file, start, end, text) => {
    const textFile = fs.readFileSync(file, 'utf8');
    const regex = new RegExp(`${start}([\\s\\S]*)${end}`, 'gm');
    const newTextFile = textFile.replace(regex, `${start}\n${text}\n${end}`);
    fs.writeFileSync(file, newTextFile, 'utf8');
};

const extractedText = extractText('docs-md/modules.md', '### createSlideshow', '#### Defined in');
const replacedText = replaceMdLinks(extractedText);
updateText(
    'README.md',
    '<!-- createSlideshow begin -->',
    '<!-- createSlideshow end -->',
    replacedText
);
