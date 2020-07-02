const { assert } = require('chai');
const exec   = require('child_process').exec;
const fs = require("fs");

const tests = [
  {title: "runs the diff on lists with explicit key",
   dir: "list"},
  {title: "runs the diff on a hash",
   dir: "hash"},
  {title: "runs the diff on lists ignoring a field",
   dir: "ignore-field"},
  {title: "runs the diff on an embedded list via a defined path",
   dir: "path"}
];

describe("Testing the command line interface", () => {
  tests.forEach(t => {
    it(t.title, (done) => {
      const dir = 'test/cli/' + t.dir + '/';
      fs.readFile(dir + 'stdout', 'utf-8', (errFile, out) => {
        if (errFile) return done(errFile);
        fs.readFile(dir + 'options', 'utf-8', (errFile, options) => {
          // we ignore errors since options is optional :)
          const command = 'node jsodiff ' + (options ? options + " " : "" ) + dir + '/file1.json ' + dir + '/file2.json';
          exec(command, 'utf-8', (err, stdout, stderr) => {
            if (err) return done(err);
            assert.equal(out, stdout);
            done();
          });
        });
      });
    })
  });
})
