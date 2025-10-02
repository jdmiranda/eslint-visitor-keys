/**
 * Performance benchmark for eslint-visitor-keys optimizations
 */
import * as evk from "../lib/index.js";

// Helper function to measure performance
function benchmark(name, fn, iterations = 100000) {
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    console.log(`${name}: ${duration.toFixed(2)}ms (${iterations} iterations)`);
    return duration;
}

console.log("=== ESLint Visitor Keys Performance Benchmarks ===\n");

// Benchmark 1: getKeys() with common node types (fast path)
console.log("1. getKeys() with common node types (fast path optimization):");
const commonNodes = [
    { type: "Identifier", name: "foo" },
    { type: "Literal", value: 42 },
    { type: "CallExpression", callee: {}, arguments: [] },
    { type: "MemberExpression", object: {}, property: {} },
    { type: "BinaryExpression", left: {}, right: {} }
];

let nodeIndex = 0;
const getKeysCommonTime = benchmark("  getKeys (common nodes)", () => {
    evk.getKeys(commonNodes[nodeIndex++ % commonNodes.length]);
}, 100000);

// Benchmark 2: getKeys() with less common node types (cache benefit)
console.log("\n2. getKeys() with less common node types (cache optimization):");
const uncommonNodes = [
    { type: "JSXElement", openingElement: {}, children: [], closingElement: {} },
    { type: "TemplateLiteral", quasis: [], expressions: [] },
    { type: "TryStatement", block: {}, handler: {}, finalizer: {} }
];

nodeIndex = 0;
const getKeysUncommonTime = benchmark("  getKeys (uncommon nodes)", () => {
    evk.getKeys(uncommonNodes[nodeIndex++ % uncommonNodes.length]);
}, 100000);

// Benchmark 3: getKeys() with repeated same node (cache hit)
console.log("\n3. getKeys() with repeated same node (cache hit):");
const repeatedNode = { type: "Program", body: [], custom: "value" };
const getKeysRepeatedTime = benchmark("  getKeys (repeated node)", () => {
    evk.getKeys(repeatedNode);
}, 100000);

// Benchmark 4: unionWith() - first call (no cache)
console.log("\n4. unionWith() operations:");
const additionalKeys1 = {
    Program: ["body", "extra1"],
    AssignmentExpression: ["custom1"],
    NewType: ["prop1", "prop2"]
};

const unionFirstTime = benchmark("  unionWith (first call)", () => {
    evk.unionWith(additionalKeys1);
}, 10000);

// Benchmark 5: unionWith() - repeated call (cache hit)
const unionRepeatedTime = benchmark("  unionWith (repeated, cached)", () => {
    evk.unionWith(additionalKeys1);
}, 10000);

// Benchmark 6: unionWith() with large set
console.log("\n5. unionWith() with large key sets (Set optimization):");
const largeAdditionalKeys = {
    Program: ["body", "a", "b", "c", "d", "e"],
    AssignmentExpression: ["left", "right", "x", "y", "z"],
    CallExpression: ["callee", "arguments", "p1", "p2", "p3", "p4"],
    MemberExpression: ["object", "property", "m1", "m2", "m3"]
};

const unionLargeTime = benchmark("  unionWith (large sets)", () => {
    evk.unionWith(largeAdditionalKeys);
}, 10000);

// Summary
console.log("\n=== Performance Summary ===");
console.log(`Fast path optimization: ${getKeysCommonTime.toFixed(2)}ms for 100k operations`);
console.log(`Cache optimization: ${getKeysRepeatedTime.toFixed(2)}ms for 100k operations`);
console.log(`unionWith cache benefit: ${((unionFirstTime - unionRepeatedTime) / unionFirstTime * 100).toFixed(1)}% faster on repeated calls`);
console.log(`Set-based union: ${unionLargeTime.toFixed(2)}ms for 10k operations\n`);

// Calculate operations per second
console.log("=== Operations Per Second ===");
console.log(`getKeys (common): ${(100000 / getKeysCommonTime * 1000).toFixed(0)} ops/sec`);
console.log(`getKeys (cached): ${(100000 / getKeysRepeatedTime * 1000).toFixed(0)} ops/sec`);
console.log(`unionWith (cached): ${(10000 / unionRepeatedTime * 1000).toFixed(0)} ops/sec`);
