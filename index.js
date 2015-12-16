var rp = require("request-promise"),
    Promise = require("bluebird"),
    jsdom   = require("jsdom"),
    debug   = require("debug")("ggxrd-stats"),
    fs      = require("fs");

const game = process.argv[2] === "pg2" ? "pg2" : "pg";
const baseUrl = "http://www.ggxrd.com/" + game + "/diagram_view.php";

debug("baseUrl: %o", baseUrl);

const japNames = {
    "Sol": "ソル",
    "Ky": "カイ",
    "May": "メイ",
    "Millia": "ミリア",
    "Zato": "ザトー",
    "Potemkin": "ポチ",
    "Chipp": "チッ",
    "Faust": "ファウ",
    "Axl": "アク",
    "Venom": "ヴェノ",
    "Slayer": "スレ",
    "I-No": "イノ",
    "Bedman": "ベッドマン",
    "Ramlethal": "ラムレザル",
    "Sin": "シン",
    "Elphelt": "エルフェルト",
    "Leo": "レオ",
    "Jam": "蔵土縁紗夢",
    "Johnny": "ジョニー",
    "Jack-O": "ジャック・オー"
}

function getCharacter(text) {
    for(var key in japNames) {
        if (text.indexOf(japNames[key]) !== -1)
            return key
    }
    debug("UNKNOWN %s", text);
    return "UNKNOWN"
}

function makeCsv(matchups) {
    const chars = Object.keys(matchups);
    const lines = chars.map(c => {
        return c + ", " + chars.map(c2 => {
            return matchups[c][c2];
        }).join(", ");
    }).join("\n");
    return ", " + chars.join(", ") + "\n" + lines;
}

var env = Promise.promisify(jsdom.env);
env(baseUrl, ["http://code.jquery.com/jquery.js"])
    .then(function (window) {
        debug("jsdom succeeded");
        const $ = window.jQuery;
        return $.makeArray($("option"))
            .map(i => $(i).attr("value"))
            .filter(s => s != "all");
    })
    .then(function (chars) {
        debug("Got characters", chars)
        return Promise.all(chars.map(c => {  
            return rp({
                method: "POST",
                uri: baseUrl,
                form: {
                    mode: "character",
                    character: c
                }
            })
        }));
    })
    .then(function (results) {
        debug("All pages downloaded, parsing")
        return Promise.all(results.map(r => {
           return env(r, ["http://code.jquery.com/jquery.js"]);
        }));
    })
    .then(function (windows) {
       debug("All pages parsed");
       const matchups = {};
       windows.forEach(window => {
           const $ = window.jQuery;
           const charTitle = $(".rankBox > p").text();
           const me = getCharacter(charTitle);
           matchups[me] = {};
           matchups[me][me] = 5; //seems reasonable
           debug("gettings stats for %s", me);
           $.makeArray($("div.rankBox ul li")).forEach(el => {
              const $el = $(el);
              const opponent = getCharacter($el.text());
              const rank = $el.find(".rankBoxNum").text();
              matchups[me][opponent] = rank; 
           });
       });
       return matchups
    })
    .then(makeCsv)
    .then(function (csv) {
        fs.writeFileSync("matchups_" + game + ".csv", csv);
    })
    .catch(function (err) {
        console.log(err); 
    });