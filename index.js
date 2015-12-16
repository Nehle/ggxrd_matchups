var rp = require("request-promise"),
    Promise = require("bluebird"),
    jsdom   = require("jsdom"),
    debug   = require("debug")("ggxrd-stats"),
    fs      = require("fs");

var game = process.argv[2] === "pg2" ? "pg2" : "pg";

var baseUrl = "http://www.ggxrd.com/" + game + "/diagram_view.php";

debug("baseUrl: %o", baseUrl);

var japNames = {
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
    return "unk"
}

function makeCsv(matchups) {
    var chars = Object.keys(matchups);
    var lines = chars.map(c => {
        return c + ", " + chars.map(c2 => {
            return matchups[c][c2];
        }).join(", ");
    }).join("\n");
    return ", " + chars.join(", ") + "\n" + lines;
}

var allcharacters;
var env = Promise.promisify(jsdom.env);
env(baseUrl, ["http://code.jquery.com/jquery.js"])
    .then(function (window) {
        debug("jsdom succeeded");
        var $ = window.jQuery;
        var keys = $.makeArray($("option"))
            .map(i => $(i).attr("value"))
            .filter(s => s != "all");
        allcharacters = keys;
        return keys;
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
       var matchups = {};
       windows.forEach(window => {
           var $ = window.jQuery;           
           var charTitle = $(".rankBox > p").text();
           var me = getCharacter(charTitle);
           matchups[me] = {};
           matchups[me][me] = 5; //seems reasonable
           debug("gettings stats for %s", me);
           $.makeArray($("div.rankBox ul li")).forEach(el => {
              var $el = $(el);
              var opponent = getCharacter($el.text());
              var rank = $el.find(".rankBoxNum").text();
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