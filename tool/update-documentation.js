const {transcludeString } = require('hercule');
const fs = require("fs");

const readme = fs.readFileSync('tool/readme-src.md', 'utf-8');

const last = a => a[a.length -1];

function testPathToTransclusions(path) {
  const hasFile = fs.existsSync(path + "/file1.json");
  const hasOptions = fs.existsSync(path + "/options");
  const name = last(path.split('/'));
  return (hasFile ? `${name}1.json:` + "\n```json\n" + `:[${name}1.json](${path}/file1.json)` + "\n```\n\n"
          + `${name}2.json:` + "\n```json\n" + `:[${name}2.json](${path}/file2.json)` + "\n```\n\n" : "")
    + "```sh\nnode jsodiff.js" + (hasOptions ? ` :[](${path}/options)`: "") + (hasFile ? ` ${name}1.json ${name}2.json` : "") + "\n```\n"
    + (hasFile ? "will output\n"
       + "```diff\n" : "```\n") + `:[diff](${path}/stdout)` + "\n```\n";

}

const readmeWithTransclusions = readme.replace(/<!-- ([-a-z\\\/]+) -->/g, (match, path) => testPathToTransclusions(path))

transcludeString(readmeWithTransclusions, (err, output) => {
  if (err) {
    console.error(err);
    process.exit(2);
  }
  console.log(output);
});
