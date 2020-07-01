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
node jsodiff.js -k id list1.json list2.sjon
```
will output
```diff
  {"id": "user2",
-  "name": "Bob",
+  "name": "Eve",
-  "age": "12",
+  "age": "16",
  },
+ {"id": "user3"…},
```

Given the two following JSON files with associative arrays of JSON objects:

hash1.json:
```json
{
 "user1": {"name": "Alice", "age": 42},
 "user2": {"name": "Bob", "age": 12}
}
```

hash2.json:
```json
{
 "user1": {"name": "Alice", "age": 42},
 "user2" :{"name": "Eve", "age": 16},
 "user3": {"name": "Carol", "age": 25}
}
```
```sh
node jsodiff.js list1.json list2.sjon
```
will output
```diff
"user2": {
-  "name": "Bob",
+  "name": "Eve",
-  "age": "12",
+  "age": "16",
  },
+ "user3": {…},
```