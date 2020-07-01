const fs = require("fs").promises;
const jq = require("node-jq");

const arrayify = a => Array.isArray(a) ? a : (a !== undefined ? [a] : []);

function diffEntries(oldentry, newentry, {isHash: isHash, key: key, ignoreKeys: ignoreKeys} = {isHash: false, key: '', ignoreKeys: []}) {
  // we assume keys are the same
  let res = "";
  Object.keys(oldentry).forEach(k => {
    if (!Array.isArray(oldentry[k]) && oldentry[k] !== newentry[k] && !ignoreKeys.includes(k)) {
      res += `-  "${k}": "${oldentry[k]}",\n` + `+  "${k}": "${newentry[k]}",\n`;
    } else if (Array.isArray(oldentry[k])) {
      const diffarray = oldentry[k].filter(s => !newentry[k].includes(s)).map(s => '-       "' + s + '"')
            .concat(
              newentry[k].filter(s => !oldentry[k].includes(s)).map(s => '+       "' + s +'"')
            );
      if (diffarray.length) {
        res += `    "${k}": [\n` + diffarray.join("\n") + "\n     ],\n";
      }
    }
  });
  if (res.length) {
    let line;
    if (isHash) {
      line = '  "' + oldentry.___key + '": ' + "{\n";
    } else {
      line = '  {"id": "' + oldentry.id + '",' + "\n" ;
    };
    return line +
      res +
      "  },";
  }
  return false;
}


function jsodiff(oldentries, newentries, key, isHash, ignoreKeys = []) {
  const results = [];

  let prevDiff = false;
  let lastMatch;
  const additions = [];

  oldentries.forEach((dfn, index) => {
    let newentry = newentries.find(d => d[key] === dfn[key]);
    if (!newentry) {
      if (isHash) {
        results.push('- ' + dfn[key] + ': {…},');
      } else {
        results.push('- {"' + key + '": "' + dfn[key] + '"…},');
      }
      prevDiff = true;
      return;
    }
    // This assume the lists are ordered
    // addition
    let i = lastMatch ? newentries.findIndex(d => d[key] === lastMatch) + 1 : 0;
    while (lastMatch && i < newentries.length && dfn[key] !== newentries[i][key] && !additions.includes(key) ) { // FIXME: this doesn't work
      additions.push(key)
      if (isHash) {
        let copy = {...newentries[i]};
        delete copy.___key;
        results.push('+ "'  + newentries[i].___key + '": ' + JSON.stringify(clean));
      } else {
        results.push('+ ' + JSON.stringify(newentries[i]));
      }
      i++;
      prevDiff = true;
    }
    let diffentry = diffEntries(dfn, newentry, {ignoreKeys, key, isHash});
    if (diffentry) { // change
      results.push(diffentry);
      prevDiff = true;
    } else if (prevDiff) { // punctuate removal
      results.push('  {"id": "' + dfn[key] + '"…},');
      results.push('@@ -' + index + ' ' + newentries.findIndex(d => d[key] === dfn[key])  + ' @@');
      prevDiff = false;
    }
    lastMatch = dfn[key];
  });
  return results;
}


async function cli() {
  const argv = require('yargs')
        .alias('p', 'path')
        .describe('p', 'jq-path of the object to be compared in the global JSON file')
        .alias('k', 'key')
        .describe('k', 'name of the key to use as index for an array of objects')
        .alias('i', 'ignore-key')
        .describe('i', 'ignore diffs when they occur in the given subkey')
  //.array('i')
        .command(['diff <base> <new>', '$0'], 'Runs a JSON Object diff between files <base> and <new>', yargs => {
          yargs.positional('base', {
            describe: 'base file of the comparison',
            type: 'string'
          }).positional('new', {
          describe: 'target file of the comparison',
            type: 'string'
          }).demandOption(['base', 'new'])
        })
        .demandCommand(1)
        .argv;
  
  let old = JSON.parse(await fs.readFile(argv.base));
  let _new = JSON.parse(await fs.readFile(argv.new));
  if (argv.path) {
    old = JSON.parse(await jq.run(argv.path, old, {input: 'json'}));
    _new = JSON.parse(await jq.run(argv.path, _new, {input: 'json'}));
  }

  let oldentries = old;
  let newentries = _new;
  let key = argv.key;
  let isHash = false;
  if (!key) {
    key = "___key";
    isHash = true;
    oldentries = Object.keys(old).map(k => Object.assign({}, old[k], {___key: k}));
    newentries = Object.keys(_new).map(k => Object.assign({}, _new[k], {___key: k})).sort((a,b) => a[key].localeCompare(b[key]));
  }
  oldentries = oldentries.sort((a,b) => a[key].localeCompare(b[key]));
  newentries = newentries.sort((a,b) => a[key].localeCompare(b[key]));
  return jsodiff(oldentries, newentries, key, isHash, arrayify(argv.i));
}

/**************************************************
Export the extract method for use as module
**************************************************/
module.exports.jsodiff = jsodiff;


/**************************************************
Code run if the code is run as a stand-alone module
**************************************************/
if (require.main === module) {
  cli().then(results => console.log(results.join("\n"))).catch(e => {
    console.error(e);
    process.exit(64);
  });
}
