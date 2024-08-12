const assert = require("assert");
var fs = require("fs");

const stringList = [
"players","units","state","in_hand","activePlayerId","null","in_bag","position","discarded_faceup","in_supply","deployed","discarded_facedown","eliminated","recruited","false","poisonTokens","assignedUnitId","teams","controlledBases","hasInitiative","true","in_reserve","white","black","forts","undefined","unitTypeId",
"winningTeamId","draftingPlayerId","ranked","customUnits","choosePlayerOrder","teamId","prevSkillRating","nextSkillRating","username","ownerUnitTypeId","color","id","numOfPlayers","turnOrder","winningScore","timeLimit","nobility","royalGuardType","choosePlayOrder","settings","altFootman","altLancer","altMarshal","altTrebuchet","mastery","blitz","twoPlayersFullBoard",

    "1,0","2,0","3,0","4,0","5,0","6,0",
"0,1","1,1","2,1","3,1","4,1","5,1","6,1",
"0,2","1,2","2,2","3,2","4,2","5,2","6,2",
"0,3","1,3","2,3","3,3","4,3","5,3","6,3",
"0,4","1,4","2,4","3,4","4,4","5,4","6,4",
"0,5","1,5","2,5","3,5","4,5","5,5","6,5",
"0,6","1,6","2,6","3,6","4,6","5,6"
];

let currentID = 1;
let idConversions = {};

function convertID(id) {
    // Note: I ended up not doing that

    // let replacement = idConversions[id];
    // if (replacement === undefined) {
    //     replacement = currentID++;
    //     idConversions[id] = replacement;
    // }
    // return replacement;
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
    let newData = {};

    copyAttributes(bigData, newData, ["activePlayerId", "draftingPlayerId", "id", "numOfPlayers", "turnOrder", "ranked", "winningScore", "timeLimit", "winningTeamId"]);
    copyAttributes(bigData, newData, ["nobility", "royalGuardType", "customUnits", "choosePlayOrder"]);

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

    // TODO(Tobi, 2024-08-11): The decrees still are missing

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

function explode(changes, obj, keys) {
    const isArray = Array.isArray(obj);
    const isObject = obj instanceof Object;

    if (isArray) {
        // NOTE: I assume that arrays only contain primitives and are therefore deemed values
        let change = {};
        change.K = keys;
        change.V = obj;
        changes.push(change);
    } else if (isObject) {
        for (const key in obj) {
            let keysToPass = [...keys];
            keysToPass.push(key);
            explode(changes, obj[key], keysToPass);
        }
    } else {
        // This is actually a value
        let change = {};
        change.K = keys;
        change.V = obj;
        changes.push(change);
    }
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

function valToShort(number) {
    if (number < 10) {
        return number + "";
    } else if (number < 36) {
        return String.fromCharCode(number - 10 + 97);
    } else {
        let modified = number - 36;

        let firstSign = modified / 26;
        let secondSign = modified % 26;

        firstSign = String.fromCharCode(firstSign + 65);
        secondSign = String.fromCharCode(secondSign + 65);

        return firstSign + secondSign;
    }
}

function main() {
    firstJson = JSON.parse(fs.readFileSync("./Complete.json").toString());
    //firstJson = JSON.parse(fs.readFileSync("./CompleteSelf.json").toString());

    let changes = [];
    let stringCounts = {};

    let final = {};

    for (let i = 0; i < firstJson.length - 1; ++i) {
        let a = convertOuter(firstJson[i]);
        let b = convertOuter(firstJson[i + 1]);
        let delta = diff(a, b);

        if (i === 0)  {
            listStrings(stringCounts, a);
            final.first = a;
        }

        // changes.push(delta);

        let explodedChanges = [];
        explode(explodedChanges, delta, []);

        for (let j = 0; j < explodedChanges.length; ++j) {
            listStrings(stringCounts, explodedChanges[j].K);
            listStrings(stringCounts, explodedChanges[j].V);
        }

        changes.push(explodedChanges);
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

    let stringDictionary = {};
    let stringDictionaryCount = 0;
    for (let i = 0; i < 18; ++i) {
        let str = stringList[i];
        let replacement = valToShort(stringDictionaryCount++);
        stringDictionary[str] = replacement;
    }
    for (let i = 0; i < nonStandardStrings.length; ++i) {
        let str = nonStandardStrings[i];
        let replacement = valToShort(stringDictionaryCount++);
        stringDictionary[str] = replacement;
    }
    for (let i = 18; i < stringList.length; ++i) {
        let str = stringList[i];
        let replacement = valToShort(stringDictionaryCount++);
        stringDictionary[str] = replacement;
    }

    let newChanges = [];

    for (const change of changes) {
        let newChange = {};
        newChanges.push(newChange);
        for (let i = 0; i < change.length; ++i) {
            let k = change[i].K;
            let v = change[i].V;

            let keyString = "";
            for (let k_i = 0; k_i < k.length; ++k_i) {
                keyString += stringDictionary[k[k_i]];
            }
            newChange[keyString] = v;
        }
    }
        
    final.changes = newChanges;

    final = JSON.stringify(final);

    for (const stringKey in stringDictionary) {
        let replacement = stringDictionary[stringKey];
        final = final.replaceAll('"'+stringKey+'"', '"'+replacement+'"');
    }

    // final = JSON.stringify(final);

    console.log(JSON.stringify(nonStandardStrings));

    final = "{\"strings\":" + JSON.stringify(nonStandardStrings) + "," + final.substring(1);

    fs.writeFileSync("./CondensedCompleteUnfinished.json", final);

    console.log("DONE")
}

main();