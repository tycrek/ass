const fs = require('fs-extra');
const adjectives = fs.readFileSync('./generators/gfycat/adjectives.txt').toString().split('\n');
const animals = fs.readFileSync('./generators/gfycat/animals.txt').toString().split('\n');
const MIN_LENGTH = require('../setup').gfyIdSize;

function genString(count = MIN_LENGTH) {
    let gfycat = '';
    for (let i = 0; i < (count < MIN_LENGTH ? MIN_LENGTH : count); i++)
        gfycat += getWord(adjectives, '-');
    return gfycat.concat(getWord(animals));
};

function getWord(list, delim = '') {
    return list[Math.floor(Math.random() * list.length)].concat(delim);
}

module.exports = ({ gfyLength }) => genString(gfyLength);
