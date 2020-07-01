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
  const additions = [];

  oldentries.forEach((dfn, index) => {
    let newentry = newentries.find(d => d[key] === dfn[key]);
    if (!newentry) {
      if (isHash) {
        results.push('- "' + dfn[key] + '": {…},');
      } else {
        results.push('- {"' + key + '": "' + dfn[key] + '"…},');
      }
      return;
    }
    let diffentry = diffEntries(dfn, newentry, {ignoreKeys, key, isHash});
    if (diffentry) { // change
      results.push(diffentry);
      prevDiff = true;
    } else if (prevDiff) { // punctuate removal
      results.push('  {"id": "' + dfn[key] + '"…},');
    }
  });
  newentries.forEach((dfn, index) => {
    let oldentry = oldentries.find(d => d[key] === dfn[key]);
    if (!oldentry) {
      if (isHash) {
        results.push('+ "' + dfn[key] + '": {…},');
      } else {
        results.push('+ {"' + key + '": "' + dfn[key] + '"…},');
      }
      return;
    }
  });
  return results;
}


async function cli() {
  const argv = require('yargs')
        .alias('p', 'path')
        .describe('p', 'jq-path of the object to be compared in the global JSON file')
        .alias('k', 'key')
        .describe('k', 'name of the key to use as index for an array of objects')
        .alias('i', 'ignore-field')
        .describe('i', 'ignore diffs when they occur in the given field of the objects being compared')
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
  let isHash = !Array.isArray(oldentries);
  if (isHash) {
    key = "___key";
    oldentries = Object.keys(old).map(k => Object.assign({}, old[k], {___key: k}));
    newentries = Object.keys(_new).map(k => Object.assign({}, _new[k], {___key: k})).sort((a,b) => a[key].localeCompare(b[key]));
  } else if (!key) {
    key = "id";
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
