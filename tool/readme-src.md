jsodiff produces a compact diff of a list of JSON objects that all share a common key, or of an associative arrays of JSON objects.

The aim of this tool is to simplify comparing well-strucuted JSON data; it does not aim to be a generic JSON diff tool.

It also focuses on compactness over exhaustivity - e.g. it signals objects that are in only one of the two files only by their id, not with their full content.

For instance, given the two following JSON files with list of JSON objects:

<!-- test/cli/list -->

Given the two following JSON files with associative arrays of JSON objects:

<!-- test/cli/hash -->

## Command line options
<!-- test/cli/help -->

## Advanced examples

### --ignore-field
The `--ignore-field` option allows to indicate one (or more by repeating the option) set of fields in the list of objects that should be ignored when comparing one list with another.

<!-- test/cli/ignore-field -->
(ignoring that the `age` field is different in the two `user2` records)


### --path

The `--path` option allows to only compare a subtree of a JSON file by specifying the path using the syntax of [jq](https://stedolan.github.io/jq/manual/).

<!-- test/cli/path -->
(looking only at the array of objects in the "users" field of the "data" field of the top-level object)
