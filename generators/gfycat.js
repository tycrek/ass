const fs = require('fs-extra');
const adjectiveList = fs.readFileSync("./generators/gfycat/adjectives.txt", "utf-8").split('\n');
const animalsList = fs.readFileSync("./generators/gfycat/animals.txt", "utf-8").split('\n');

function genString(adjCount) {
    let adjectivesString = "";
    for (i = 0; i < adjCount; i++) adjectivesString += genAdjective();
    return adjectivesString + genAnimal();
};

function genAnimal() {
    return animalsList[Math.floor(Math.random()*animalsList.length)];
}

function genAdjective() {
    return adjectiveList[Math.floor(Math.random()*adjectiveList.length)] + "-";
}

module.exports = (adjectives) => genString(adjectives);
