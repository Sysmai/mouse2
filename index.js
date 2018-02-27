if (process.version.slice(1).split(".")[0] < 8) throw new Error("Node 8.0.0 or higher is required. Update Node on your system.");

function getObjects(obj, key, val) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == "object") {
            objects = objects.concat(getObjects(obj[i], key, val));
        } else if (i == key && obj[key] == val) {
            objects.push(obj);
        }
    }
    return objects;
}

const Discord = require("discord.js");
const {promisify} = require("util");
const readdir = promisify(require("fs").readdir);
const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");
const request = require("request-promise-native");
const charactersData = require("./modules/characters.js");
const shipsData = require("./modules/ships.js");


const client = new Discord.Client();

// Here we load the config and functions files
client.config = require("./config.js");
require("./modules/functions.js")(client);

// Aliases and commands are put in collections where they can be read from,
// catalogued, listed, etc.
client.commands = new Enmap();
client.aliases = new Enmap();
client.swgohData = new Enmap();

// Setting up the Enhanced Map module
client.settings = new Enmap({provider: new EnmapLevel({name: "settings"})});
client.pointsTable = new Enmap({provider: new EnmapLevel({name: "points"})});
client.profileTable = new Enmap({provider: new EnmapLevel({name: "profiles"})});
client.cache = new Enmap({provider: new EnmapLevel({name: "cache"})});

const init = async () => {

    // Now we load **commands** into memory, as a collection
    const cmdFiles = await readdir("./commands/");
    client.log("log", `Loading ${cmdFiles.length} commands:`, "Loading");
    cmdFiles.forEach(f => {
        if (!f.endsWith(".js")) return;
        const response = client.loadCommand(f);
        if (response) console.log(response);
    });

    // Then we load events, which will include our message and ready event.
    const evtFiles = await readdir("./events/");
    client.log("log", `Loading ${evtFiles.length} events:`, "Loading");
    evtFiles.forEach(file => {
        try {
            const eventName = file.split(".")[0];
            const event = require(`./events/${file}`);
            client.log("log", `Loading Event: ${eventName}...`, "Loading");
            client.on(eventName, event.bind(null, client));
            delete require.cache[require.resolve(`./events/${file}`)];
        } catch (err) {
            client.log("log", `Unable to load event ${file}: ${err}`, "Error!!");
        }

    });

    // Generate a cache of client permissions
    client.levelCache = {};
    for (let i = 0; i < client.config.permLevels.length; i++) {
        const thisLevel = client.config.permLevels[i];
        client.levelCache[thisLevel.name] = thisLevel.level;
    }

    // GET and merge character databases
    const charactersURL = "https://swgoh.gg/api/characters/";
    const charactersOptions = { uri: charactersURL, json: true };
    let charactersAPI = [];

    await request(charactersOptions)
        .then(function(body) {
            charactersAPI = body;
        })
        .catch(function(err) {
            client.log = ("log", `Character Request Failure: ${err}`, "Error");
        });

    // Loop through our character array, find the matching characters in the swgoh.gg api
    // and merge its data into ours.
    for (var i = 0; i < charactersData.length; i++) {

        const chData = getObjects(charactersAPI, "name", charactersData[i].name);

        if (chData.length == 1) Object.assign(charactersData[i], chData[0]);
        else console.log("Multiple results found for character: ", charactersData[i].name);
    }

    // GET and merge ship databases
    const shipsURL = "https://swgoh.gg/api/ships/";
    const shipsOptions = { uri: shipsURL, json: true };
    let shipsAPI = [];

    await request(shipsOptions)
        .then(function(body) {
            shipsAPI = body;
        })
        .catch(function(err) {
            client.log = ("log", `Ships Request Failure: ${err}`, "Error");
        });

    // Loop through our ships array, find the matching ships in the swgoh.gg api
    // and merge its data into ours.
    for (var j = 0; i < shipsData.length; j++) {

        const sData = getObjects(shipsAPI, "name", shipsData[j].name);

        if (sData.length == 1) Object.assign(shipsData[j], sData[0]);
        else console.log("Multiple results found for ship: ", shipsData[j].name);
    }

    client.swgohData.set("charactersData", charactersData);
    client.swgohData.set("shipsData", shipsData);

    client.login(client.config.token);

};

init();
