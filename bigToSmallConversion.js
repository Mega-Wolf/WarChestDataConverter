const assert = require("assert");
var fs = require("fs");

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

function convertID(id) {
    // This was meant to change those long ids to shorter ones, but it seemed like it wasn't worth it
    return id;
}

function copyAttributes(from, to, attributes) {
    for (const attribute of attributes) {
        assert(from[attribute] !== undefined, attribute);

        if (from[attribute] === null) { continue; }

        // to[attribute] = from[attribute];
        // TODO: Don't know which of the versions I prefer
        if (Array.isArray(from[attribute])) {
            to[attribute] = from[attribute];
        } else {
            to[attribute] = from[attribute] + "";
        }
    }
}

function convertOuter(bigData) {
    // Basically converts a snapshot to a smaller form of the snapshot
    // Things that use an id that are inside an array (players, forts, units, etc.) are converted to a key-value thing where the id is now the key

    let newData = {};

    copyAttributes(bigData, newData, ["activePlayerId", "draftingPlayerId", "id", "numOfPlayers", "turnOrder", "ranked", "winningScore", "timeLimit", "winningTeamId"]);
    copyAttributes(bigData, newData, ["nobility", "royalGuardType", "customUnits", "choosePlayOrder", "timeLimit", "draftType"]);

    newData.settings = {};
    copyAttributes(bigData.settings, newData.settings, ["altFootman", "altLancer", "altMarshal", "altTrebuchet", "mastery", "blitz", "twoPlayersFullBoard"]);

    // Players
    newData.players = {};
    for (const player of bigData.players) {
        let newPlayer = {};

        copyAttributes(player, newPlayer, ["teamId", "hasInitiative", "prevSkillRating", "nextSkillRating" ]);

        newPlayer.username = player.user.username;

        newPlayer.units = {};
        for (const unit of player.units) {
            newUnit = {};
            copyAttributes(unit, newUnit, ["unitTypeId", "state", "position"]);

            let unitID = unit["id"];
            unitID = convertID(unitID);

            newPlayer.units[unitID] = newUnit;
        }
        
        let playerID = player["id"];
        playerID = convertID(playerID);
        newData.players[playerID] = newPlayer;
    }

    // Forts
    newData.forts = {};
    for (const fort of bigData.forts) {
        let newFort = {};

        copyAttributes(fort, newFort, ["position"]);
        let fortID = fort["id"];
        fortID = convertID(fortID);
        newData.forts[fortID] = newFort;
    }

    // Poison
    newData.poisonTokens = {};
    for (const poison of bigData.poisonTokens) {
        let newPoison = {};

        copyAttributes(poison, newPoison, ["assignedUnitId", "ownerUnitTypeId"]);
        let poisonID = poison["id"];
        poisonID = convertID(poisonID);
        newData.poisonTokens[poisonID] = newPoison;
    }

    // Teams
    newData.teams = {};
    for (const team of bigData.teams) {
        let newTeam = {};

        copyAttributes(team, newTeam, ["controlledBases", "color"]);
        let teamID = team["id"];
        teamID = convertID(teamID);
        newData.teams[teamID] = newTeam;
    }

    // Decrees
    newData.decrees = {};
    for (const decree of bigData.decrees) {
        let newDecree = {};

        copyAttributes(decree, newDecree, ["whiteTeamId", "blackTeamId"]);
        let decreeID = decree["id"];
        decreeID = convertID(decreeID);
        newData.decrees[decreeID] = newDecree;
    }

    return newData;
}

function diff(first, second) {
    let delta = {};

    // Check for changes
    for (const key in second) {

        let valueNew = second[key];
        let valueOld = first[key];

        let isArrayNew = Array.isArray(valueNew);
        let isArrayOld = Array.isArray(valueOld);

        let isObjectNew = !isArrayNew && valueNew instanceof Object;
        let isObjectOld = !isArrayOld && valueOld instanceof Object;

        if (isArrayNew && isArrayOld) {
            // Cheating a bit here
            if (JSON.stringify(valueNew) !== JSON.stringify(valueOld)) {
                delta[key] = valueNew;
            }
        } else if (isObjectNew && isObjectOld) {
            // Note: I have converted some of the arrays to objects and use the id as key (this is especially necessary due to the decoy tokens)
            let innerDelta = diff(valueOld, valueNew);
            if (Object.keys(innerDelta) != 0) {
                delta[key] = innerDelta;
            }
        } else {
            if (valueNew !== valueOld) {
                delta[key] = valueNew;
            }
        }
    }

    // Check what has been deleted
    for (const key in first) {
        let valueNew = second[key];
        if (valueNew === undefined) {
            let valueOld = first[key];
            if (valueOld !== undefined) {
                delta[key] = undefined;
            }
        }
    }

    return delta;
}

function listStrings(dict, obj) {
    const isArray = Array.isArray(obj);
    const isObject = obj instanceof Object;

    if (isArray) {
        for (const value of obj) {
            listStrings(dict, value);
        }
    } else if (isObject) {
        for (const key in obj) {

            let valueInDict = dict[key];
            if (valueInDict !== undefined) {
                dict[key] = valueInDict + 1;
            } else {
                dict[key] = 1;
            }

            listStrings(dict, obj[key]);
        }
    } else {
        // This is actually a value
        // if (typeof obj == 'string') {
            let objAsString = obj + "";
            let valueInDict = dict[objAsString];
            if (valueInDict !== undefined) {
                dict[objAsString] = valueInDict + 1;
            } else {
                dict[objAsString] = 1;
            }
        // }
    }
}

function valToShortSymbol(number) {
    return "#"+number;
    
    // NOTE: zip is better than me compressing stuff :/

    // if (number < 10) {
    //     return "#" + number + "";
    // } else if (number < 36) {
    //     return "#" + String.fromCharCode(number - 10 + 97);
    // } else {
    //     let modified = number - 36;

    //     let firstSign = modified / 26;
    //     let secondSign = modified % 26;

    //     firstSign = String.fromCharCode(firstSign + 65);
    //     secondSign = String.fromCharCode(secondSign + 65);

    //     return "#" + firstSign + secondSign;
    // }
}

function bigJsonToCompactVersion(firstJson, decreeJson) {
    let changes = [];
    let stringCounts = {};

    let final = {};

    let a = convertOuter(firstJson[0]);
    for (let i = 0; i < firstJson.length - 1; ++i) {
        let b = convertOuter(firstJson[i + 1]);
        let delta = diff(a, b);
        
        if (i === 0)  {
            listStrings(stringCounts, a);
            final.first = a;
        }
        
        changes.push(delta);
        a = b;

        listStrings(stringCounts, delta);
    }

    stringCountsAsObjects = [];
    for (const key in stringCounts) {
        let myObj = {};
        myObj.K = key;
        myObj.V = stringCounts[key];
        stringCountsAsObjects.push(myObj);
    }
    stringCountsAsObjects.sort(function (a, b) {
        return b.V - a.V;
    });

    let nonStandardStrings = [];
    for (let s of stringCountsAsObjects) {
        if (stringList.includes(s.K)) { continue; }
        nonStandardStrings.push(s.K);
    }

    final.changes = changes;

    // Decrees part two; I just copy the important stuff of decrees into the "decrees" part of "first"; I ignore the string counting; but that isn't really important anyway
    for (const decree of decreeJson) {
        let decreeID = decree["id"];
        decreeID = convertID(decreeID);

        let updatedDecree = final.first.decrees[decreeID];
        copyAttributes(decree, updatedDecree, ["decreeTypeId"]);
    }

    final = JSON.stringify(final);

    let stringDictionaryCount = 0;
    for (let i = 0; i < 18; ++i) {
        let str = stringList[i];
        let replacement = valToShortSymbol(stringDictionaryCount++);
        final = final.replaceAll('"'+str+'"', '"'+replacement+'"');
    }
    for (let i = 0; i < nonStandardStrings.length; ++i) {
        let str = nonStandardStrings[i];
        let replacement = valToShortSymbol(stringDictionaryCount++);
        final = final.replaceAll('"'+str+'"', '"'+replacement+'"');
    }
    for (let i = 18; i < stringList.length; ++i) {
        let str = stringList[i];
        let replacement = valToShortSymbol(stringDictionaryCount++);
        final = final.replaceAll('"'+str+'"', '"'+replacement+'"');
    }

    final = "{\"strings\":" + JSON.stringify(nonStandardStrings) + "," + final.substring(1);

    return final;
}

function main() {

    let start = Date.now();
    
    let final = ["[\n"];

    // NOTE: A big part of the runtime is reading/parsing the jsons; in the example here, I just moved it out of the loop (which is obviously cheating :D)


    const decreeJson = JSON.parse(fs.readFileSync("./decrees.json").toString());
    const firstJson = JSON.parse(fs.readFileSync("./Complete.json").toString());

    // IMPORTANT: in the output file; one line = one match; everything else makes it a lot more complicated to read the data in again

    for (let i = 0; i < 1000; ++i) {
        if (i !== 0) {
            final.push(",\n");
        }
        const compacted = bigJsonToCompactVersion(firstJson, decreeJson);

        final.push(compacted);
    }
    final.push("\n]\n");

    let after = Date.now();

    console.log ((after - start) / 1000 + " seconds elapsed");

    // NOTE: I just copied the text from above 100 times so that I have a file with 100k entries to check if my converter in the other direction works properly
    let alternative = final.join("");
    var stream = fs.createWriteStream("append.json", {flags:'w'}, );
    for (let i = 0; i < 100; ++i) {
        stream.write(alternative);
    }
    stream.end();

    console.log("DONE");
}

main();
