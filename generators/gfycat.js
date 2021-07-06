const fs = require('fs-extra');
const adjectives = fs.readFileSync('./generators/gfycat/adjectives.txt').toString().split('\n');
const animals = fs.readFileSync('./generators/gfycat/animals.txt').toString().split('\n');

// Don't trigger circular dependency during setup
if (!require.main.filename.includes('setup.js'))
    var MIN_LENGTH = require('../setup').gfyIdSize; // skipcq: JS-0239, JS-0102

function getWord(list, delim = '') {
    return list[Math.floor(Math.random() * list.length)].concat(delim);
}

function genString(count = MIN_LENGTH) {
    let gfycat = '';
    for (let i = 0; i < (count < MIN_LENGTH ? MIN_LENGTH : count); i++)
        gfycat += getWord(adjectives, '-');
    return gfycat.concat(getWord(animals));
};

module.exports = ({ gfyLength }) => genString(gfyLength);
