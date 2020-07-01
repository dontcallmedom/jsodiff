const { assert } = require('chai');
const { jsodiff } = require("../jsodiff")

const diffTests = [
  {
    title: "reports no diff when the two inputs are the same",
    base: [],
    target: [],
    results: []
  },
  {
    title: "reports a single line of removal when target has an object less than base",
    base: [{id: "foo", "text": "bar"}],
    target: [],
    results: ['- {"id": "foo"…},']
  },
  {
    title: "reports a single line of addition when target has an object more than base",
    base: [],
    target: [{id: "foo", "text": "bar"}],
    results: ['+ {"id": "foo"…},']
  },
  {
    title: "reports the property diff when target has an object more with data different fom base",
    base: [{id: "foo", "text": "baz"}],
    target: [{id: "foo", "text": "bar"}],
    results: [`  {"id": "foo",
-  "text": "baz",
+  "text": "bar",
  },`]
  },
];

describe("Test diff", () => {
  diffTests.forEach(t => {
    it(t.title, () => assert.deepEqual(jsodiff(t.base, t.target, t.key || 'id', t.isHash || false), t.results));
  })
});
