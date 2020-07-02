jsodiff produces a compact diff of a list of JSON objects that all share a common key, or of an associative arrays of JSON objects.

The aim of this tool is to simplify comparing well-strucuted JSON data; it does not aim to be a generic JSON diff tool.

It also focuses on compactness over exhaustivity - e.g. it signals objects that are in only one of the two files only by their id, not with their full content.

For instance, given the two following JSON files with list of JSON objects:

list1.json:
```json
[
 {"id": "user1", "name": "Alice", "age": 42},
 {"id": "user2", "name": "Bob", "age": 12}
]
```

list2.json:
```json
[
 {"id": "user1", "name": "Alice", "age": 42},
 {"id": "user2", "name": "Eve", "age": 16},
 {"id": "user3", "name": "Carol", "age": 25}
]
```

```sh
node jsodiff.js -k id list1.json list2.json
```
will output
```diff
  {"id": "user2",
-  "name": "Bob",
+  "name": "Eve",
-  "age": 12,
+  "age": 16,
  },
+ {"id": "user3"…},
```


Given the two following JSON files with associative arrays of JSON objects:

hash1.json:
```json
{
  "user1": { "name": "Alice", "age": 42},
  "user2": { "name": "Bob", "age": 12}
}
```

hash2.json:
```json
{
  "user1": { "name": "Alice", "age": 42},
  "user3": { "name": "Carol", "age": 25},
  "user2": { "name": "Eve", "age": 16}
}
```

```sh
node jsodiff.js hash1.json hash2.json
```
will output
```diff
  "user2": {
-  "name": "Bob",
+  "name": "Eve",
-  "age": 12,
+  "age": 16,
  },
+ "user3": {…},
```


## Command line options
```sh
node jsodiff.js --help
```
```
jsodiff.js <base> <new>

Runs a JSON Object diff between files <base> and <new>

Commands:
  jsodiff.js diff <base> <new>  Runs a JSON Object diff between files <base> and
                                <new>                                  [default]

Positionals:
  base  base file of the comparison                          [string] [required]
  new   target file of the comparison                        [string] [required]

Options:
  --help              Show help                                        [boolean]
  --version           Show version number                              [boolean]
  -p, --path          jq-path of the object to be compared in the global JSON
                      file
  -k, --key           name of the key to use as index for an array of objects
  -i, --ignore-field  ignore diffs when they occur in the given field of the
                      objects being compared
```


## Advanced examples

### --ignore-field
The `--ignore-field` option allows to indicate one (or more by repeating the option) set of fields in the list of objects that should be ignored when comparing one list with another.

ignore-field1.json:
```json
[
 {"id": "user1", "name": "Alice", "age": 42},
 {"id": "user2", "name": "Bob", "age": 12}
]
```

ignore-field2.json:
```json
[
 {"id": "user1", "name": "Alice", "age": 42},
 {"id": "user2", "name": "Eve", "age": 16},
 {"id": "user3", "name": "Carol", "age": 25}
]
```

```sh
node jsodiff.js -k id -i age ignore-field1.json ignore-field2.json
```
will output
```diff
  {"id": "user2",
-  "name": "Bob",
+  "name": "Eve",
  },
+ {"id": "user3"…},
```

(ignoring that the `age` field is different in the two `user2` records)


### --path

The `--path` option allows to only compare a subtree of a JSON file by specifying the path using the syntax of [jq](https://stedolan.github.io/jq/manual/).

path1.json:
```json
{
 "title": "My data file",
 "data": {
  "users": [
    {"id": "user1", "name": "Alice", "age": 42},
    {"id": "user2", "name": "Bob", "age": 12}
   ]
  }
}
```

path2.json:
```json
{
 "title": "My data file",
 "data": {
  "users": [
    {"id": "user1", "name": "Alice", "age": 42},
    {"id": "user2", "name": "Eve", "age": 12}
   ]
  }
}
```

```sh
node jsodiff.js -k id -p '.data.users' path1.json path2.json
```
will output
```diff
  {"id": "user2",
-  "name": "Bob",
+  "name": "Eve",
  },
```

(looking only at the array of objects in the "users" field of the "data" field of the top-level object)

