const fs = require("fs").promises;
const jq = require("node-jq");

const arrayify = a => Array.isArray(a) ? a : (a !== undefined ? [a] : []);

// from https://stackoverflow.com/questions/42817212/merge-two-sorted-arrays-into-one
function mergeSortedArrays(x, y) {
    let i = 0;
    let j = 0;
    const result = [];

    while (i < x.length && j < y.length) {
        // Skip negative numbers
        if (x[i] === -1) {
            x += 1;
            continue;
        }
        if (y[j] === -1) {
            y += 1;
            continue;
        }

        // Take the smaller of the two values, and add it to the output.
        // Note: the index (i or j) is only incremented when we use the corresponding value
        if (x[i] <= y[j]) {
            result.push(x[i]);
            i += 1;
        } else {
            result.push(y[j]);
            j += 1;
        }
    }

    // At this point, we have reached the end of one of the two arrays. The remainder of
    // the other array is all larger than what is currently in the output array

    while (i < x.length) {
        result.push(x[i]);
        i += 1;
    }

    while (j < y.length) {
        result.push(y[j]);
        j += 1;
    }

    return result;
}


function diffEntries(oldentry, newentry, {isHash: isHash, key: key, ignoreKeys: ignoreKeys} = {isHash: false, key: '', ignoreKeys: []}) {
  // we assume keys are the same
  let res = "";
  Object.keys(oldentry).forEach(k => {
    if (typeof oldentry[k] !== 'object' && oldentry[k] !== newentry[k] && !ignoreKeys.includes(k)) {
      const quote = typeof oldentry[k] === 'number' ? '': '"';
      res += `-  "${k}": ${quote}${oldentry[k]}${quote},\n` + `+  "${k}": ${quote}${newentry[k]}${quote},\n`;
    } else if (Array.isArray(oldentry[k])) {
      const diffarray = oldentry[k].filter(s => !newentry[k].includes(s)).map(s => '-       "' + s + '"')
            .concat(
              newentry[k].filter(s => !oldentry[k].includes(s)).map(s => '+       "' + s +'"')
            );
      if (diffarray.length) {
        res += `    "${k}": [\n` + diffarray.join("\n") + "\n     ],\n";
      }
    } // TODO deals with objects
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

  const keys = [...new Set(mergeSortedArrays(oldentries.map(d => d[key]).sort(),
                                 newentries.map(d => d[key]).sort()
                                            ))];

  keys.forEach((keyval, index) => {
    let oldentry = oldentries.find(d => d[key] === keyval);
    let newentry = newentries.find(d => d[key] === keyval);
    if (!newentry || !oldentry) {
      let line = "";
      if (!oldentry) {
        line += "+ ";
      } else {
        line += "- ";
      }
      if (isHash) {
        results.push(line + '"' + keyval + '": {…},');
      } else {
        results.push(line + '{"' + key + '": "' + keyval + '"…},');
      }
      return;
    }
    let diffentry = diffEntries(oldentry, newentry, {ignoreKeys, key, isHash});
    if (diffentry) { // change
      results.push(diffentry);
      prevDiff = true;
    } else if (prevDiff) { // punctuate removal
      results.push('  {"id": "' + keyval + '"…},');
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
