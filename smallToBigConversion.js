const fs = require('fs');
const readline = require('readline');

const stringList = [
    "players","units","state","in_hand","activePlayerId","null","in_bag","position","discarded_faceup","in_supply","deployed","discarded_facedown","eliminated","recruited","false","poisonTokens","assignedUnitId","teams","controlledBases","hasInitiative","true","in_reserve","white","black","forts","undefined","unitTypeId",
    "winningTeamId","draftingPlayerId","ranked","customUnits","choosePlayerOrder","teamId","prevSkillRating","nextSkillRating","username","ownerUnitTypeId","color","id","numOfPlayers","turnOrder","winningScore","timeLimit","nobility","royalGuardType","choosePlayOrder","settings","altFootman","altLancer","altMarshal","altTrebuchet","mastery","blitz","twoPlayersFullBoard","whiteTeamId", "blackTeamId","decrees","decreeTypeId","timeLimit","draftType","elimination_draft","random","draft",
    
        "1,0","2,0","3,0","4,0","5,0","6,0",
    "0,1","1,1","2,1","3,1","4,1","5,1","6,1",
    "0,2","1,2","2,2","3,2","4,2","5,2","6,2",
    "0,3","1,3","2,3","3,3","4,3","5,3","6,3",
    "0,4","1,4","2,4","3,4","4,4","5,4","6,4",
    "0,5","1,5","2,5","3,5","4,5","5,5","6,5",
    "0,6","1,6","2,6","3,6","4,6","5,6"
];

let lala = 0;

async function processLineByLine() {
    const fileStream = fs.createReadStream('append.json');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    let start = Date.now();
    for await (let line of rl) {
        // Each line in input.txt will be successively available here as `line`.
        lala++;
        if (lala % 1000 == 0) {
            console.log(lala);
        }

        if (line[0] !== '{') { continue; }

        if (line[line.length - 1] == ",") {
            line = line.substring(0, line.length - 1);
        }

        let parsedMatch = JSON.parse(line);

        replacementStrings = [];
        for (let i = 0; i < 18; ++i) {
            replacementStrings.push(stringList[i]);
        }
        for (let i = 0; i < parsedMatch.strings.length; ++i) {
            replacementStrings.push(parsedMatch.strings[i]);
        }
        for (let i = 18; i < stringList.length; ++i) {
            replacementStrings.push(stringList[i]);
        }

        // NOTE: The back and forth of parse and stringify is quite dumb

        let firstAsString = JSON.stringify(parsedMatch.first);
        let changesAsString = JSON.stringify(parsedMatch.changes);

        for (let replacement_i = 0; replacement_i < replacementStrings.length; ++replacement_i) {
            firstAsString = firstAsString.replaceAll('"#'+replacement_i+'"', '"'+replacementStrings[replacement_i]+'"');
            changesAsString = changesAsString.replaceAll('"#'+replacement_i+'"', '"'+replacementStrings[replacement_i]+'"');
        }

        parsedMatch.first = JSON.parse(firstAsString);
        parsedMatch.changes = JSON.parse(changesAsString);

        fs.writeFileSync("./TestRecreate.json", JSON.stringify(parsedMatch));

        return;

    }
    let after = Date.now();

    console.log((after - start) / 1000 + " seconds elapsed");
}

processLineByLine();
