const fs = require("fs").promises;
const jq = require("node-jq");

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

const arrayify = a => Array.isArray(a) ? a : (a !== undefined ? [a] : []);


(async function() {
  let old = JSON.parse(await fs.readFile(argv.base));
  let _new = JSON.parse(await fs.readFile(argv.new));
  if (argv.path) {
    old = JSON.parse(await jq.run(argv.path, old, {input: 'json'}));
    _new = JSON.parse(await jq.run(argv.path, _new, {input: 'json'}));
  }

  let prevDiff = false;
  let lastMatch;

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
  };

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

  oldentries.forEach((dfn, index) => {
    let newentry = newentries.find(d => d[key] === dfn[key]);
    if (!newentry) {
      if (isHash) {
        console.log('- ' + dfn[key] + ': {…},');
      } else {
        console.log('- {"' + key + '": "' + dfn[key] + '"…},');
      }
      prevDiff = true;
      return;
    }
    // This assume the lists are ordered
    // addition
    let i = lastMatch ? newentries.findIndex(d => d[key] === lastMatch) + 1 : 0;
    while (lastMatch && i < newentries.length && dfn[key] !== newentries[i][key] ) {
      if (isHash) {
        let copy = {...newentries[i]};
        delete copy.___key;
        console.log('+ "'  + newentries[i].___key + '": ' + JSON.stringify(clean));
      } else {
        console.log('+ ' + JSON.stringify(newentries[i]));
      }
      i++;
      prevDiff = true;
    }
    let diffentry = diffEntries(dfn, newentry, {ignoreKeys:arrayify(argv.i), key, isHash});
    if (diffentry) { // change
      console.log(diffentry);
      prevDiff = true;
    } else if (prevDiff) { // punctuate removal
      console.log('  {"id": "' + dfn[key] + '"…},');
      console.log('@@ -' + index + ' ' + newentries.findIndex(d => d[key] === dfn[key])  + ' @@');
      prevDiff = false;
    }
    lastMatch = dfn[key];
  });
})().catch(e => {
  console.error(e);
  process.exit(1);
});
