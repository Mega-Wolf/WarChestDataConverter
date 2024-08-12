const assert = require("assert");
var fs = require("fs");

// let currentID = 1;
// let idConversions = {};

function convertID(id) {
    // I ended up ignoring that

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

        to[attribute] = from[attribute];
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

function main() {
    firstJson = JSON.parse(fs.readFileSync("./Complete.json").toString());
    // firstJson = JSON.parse(fs.readFileSync("./CompleteSelf.json").toString());

    let changes = [];
    let stringCounts = {};

    let final = {};

    for (let i = 0; i < firstJson.length - 1; ++i) {
        let a = convertOuter(firstJson[i]);
        let b = convertOuter(firstJson[i + 1]);
        let delta = diff(a, b);

        if (i === 0)  {
            final.first = a;
        }

        changes.push(delta);

        // let explodedChanges = [];
        // explode(explodedChanges, delta, []);

        // listStrings(stringCounts, explodedChanges);

        // changes.push(explodedChanges);
    }
    
    // console.log(JSON.stringify(changes, null, 0));

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

    stringArray = [];
    for (let i = 0; i < stringCountsAsObjects.length; ++i) {
        stringArray.push(stringCountsAsObjects[i].K + " : " + stringCountsAsObjects[i].V);
    }

    

    

    console.log(JSON.stringify(stringArray));
    // console.log(JSON.stringify(stringCounts));

    const replacementList = [
        "activePlayerId", "draftingPlayerId", "id", "numOfPlayers", "turnOrder", "ranked", "winningScore", "timeLimit", "winningTeamId",
        "nobility", "royalGuardType", "customUnits", "choosePlayOrder",
        "altFootman", "altLancer", "altMarshal", "altTrebuchet", "mastery", "blitz", "twoPlayersFullBoard",
        "teamId", "hasInitiative", "prevSkillRating", "nextSkillRating",
        "unitTypeId", "state", "position",
        "assignedUnitId", "ownerUnitTypeId",
        "controlledBases", "color",

        "in_bag", "in_hand", "in_supply", "in_reserve", "discarded_facedown", "discarded_faceup", "deployed",

        "players", "units", "forts", "poisonTokens", "teams", "settings", "recruited", "eliminated"
    ];

    // [
    //     abcd h m o r t w

    //     AB D FGH L M O R S T U


    //     ab d h m o r t

    //     "a", "draftingPlayerId", "id", "numOfPlayers", "o", "r", "w", "timeLimit",
    //     "nobility", "G", "customUnits", "choosePlayOrder",
    //     "F", "L", "M", "T", "m", "b", "twoPlayersFullBoard",
    //     "t", "h", "prevSkillRating", "nextSkillRating",
    //     "unitTypeId", "state", "position",
    //     "A", "O",
    //     "controlledBases", "c",

    //     "B", "H", "S", "R", "D", "U", "d",
    // ]

    final.changes = changes;
    final = JSON.stringify(final);

    // for (replace of replacementList) {
    //     final = final.replaceAll(replace, "a");
    // }

    fs.writeFileSync("./CondensedCompleteUnfinished.json", final);

    // console.log(JSON.stringify(firstJson[0], null, 2));

    // console.log(JSON.stringify(convertedJson, null, 2));

    //console.log(JSON.stringify(convertedJson, null, 0));

    // let delta = diff(convertedJson1, convertedJson2);


    // console.log(JSON.stringify(delta, null, 0));

    console.log("DONE")
}

main();