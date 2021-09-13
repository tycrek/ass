import fs from 'fs-extra';

// Don't trigger circular dependency during setup
if (require !== undefined && !require?.main?.filename.includes('setup.js'))
    var MIN_LENGTH = require('../setup').gfyIdSize; // skipcq: JS-0239, JS-0102

function getWord(list: string[], delim = '') {
    return list[Math.floor(Math.random() * list.length)].concat(delim);
}

function genString(count = MIN_LENGTH) {
    // For some reason these 3 lines MUST be inside the function
    const { path } = require('../utils');
    const adjectives = fs.readFileSync(path('./gfycat/adjectives.txt')).toString().split('\n');
    const animals = fs.readFileSync(path('./gfycat/animals.txt')).toString().split('\n');

    let gfycat = '';
    for (let i = 0; i < (count < MIN_LENGTH ? MIN_LENGTH : count); i++)
        gfycat += getWord(adjectives, '-');
    return gfycat.concat(getWord(animals));
};

export default ({ gfyLength }: { gfyLength: number }) => genString(gfyLength);
