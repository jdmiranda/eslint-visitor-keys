/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * See LICENSE file in root directory for full license.
 */
import KEYS, { KEYS_MAP } from "./visitor-keys.js";

/**
 * @typedef {import('./visitor-keys.js').VisitorKeys} VisitorKeys
 */

// List to ignore keys.
const KEY_BLACKLIST = new Set([
    "parent",
    "leadingComments",
    "trailingComments"
]);

/**
 * Check whether a given key should be used or not.
 * @param {string} key The key to check.
 * @returns {boolean} `true` if the key should be used.
 */
function filterKey(key) {
    return !KEY_BLACKLIST.has(key) && key[0] !== "_";
}

// Optimization: Cache for getKeys results
const getKeysCache = new WeakMap();

// Optimization: Fast path for common node types
const COMMON_NODE_KEYS = new Map([
    ["Identifier", Object.freeze([])],
    ["Literal", Object.freeze([])],
    ["ThisExpression", Object.freeze([])],
    ["Super", Object.freeze([])],
    ["Program", Object.freeze(["body"])],
    ["BlockStatement", Object.freeze(["body"])],
    ["ExpressionStatement", Object.freeze(["expression"])],
    ["CallExpression", Object.freeze(["callee", "arguments"])],
    ["MemberExpression", Object.freeze(["object", "property"])],
    ["BinaryExpression", Object.freeze(["left", "right"])],
    ["AssignmentExpression", Object.freeze(["left", "right"])],
    ["VariableDeclaration", Object.freeze(["declarations"])],
    ["FunctionDeclaration", Object.freeze(["id", "params", "body"])],
    ["ArrowFunctionExpression", Object.freeze(["params", "body"])],
    ["IfStatement", Object.freeze(["test", "consequent", "alternate"])],
    ["ReturnStatement", Object.freeze(["argument"])]
]);

/* eslint-disable jsdoc/valid-types -- doesn't allow `readonly`.
   TODO: remove eslint-disable when https://github.com/jsdoc-type-pratt-parser/jsdoc-type-pratt-parser/issues/164 is fixed
*/
/**
 * Get visitor keys of a given node.
 * @param {object} node The AST node to get keys.
 * @returns {readonly string[]} Visitor keys of the node.
 */
export function getKeys(node) {
    // Optimization: Fast path for common node types with known keys
    if (node && typeof node === "object" && "type" in node) {
        const cachedKeys = COMMON_NODE_KEYS.get(node.type);
        if (cachedKeys !== undefined) {
            return cachedKeys;
        }
    }

    // Optimization: Use WeakMap cache for computed keys
    if (getKeysCache.has(node)) {
        return getKeysCache.get(node);
    }

    const keys = Object.keys(node).filter(filterKey);

    // Cache the result if the node is an object
    if (typeof node === "object" && node !== null) {
        getKeysCache.set(node, keys);
    }

    return keys;
}
/* eslint-enable jsdoc/valid-types -- doesn't allow `readonly` */

// Optimization: Cache for unionWith results
const unionCache = new Map();

/**
 * Make the union set with `KEYS` and given keys.
 * @param {VisitorKeys} additionalKeys The additional keys.
 * @returns {VisitorKeys} The union set.
 */
export function unionWith(additionalKeys) {
    // Optimization: Create a cache key from the additional keys
    const cacheKey = JSON.stringify(additionalKeys);

    if (unionCache.has(cacheKey)) {
        return unionCache.get(cacheKey);
    }

    const retv = /** @type {{ [type: string]: ReadonlyArray<string> }} */
        (Object.assign({}, KEYS));

    // Optimization: Use Set-based operations for efficient merging
    for (const type of Object.keys(additionalKeys)) {
        if (Object.prototype.hasOwnProperty.call(retv, type)) {
            // Optimization: Use Set for O(1) lookups and automatic deduplication
            const keys = new Set(additionalKeys[type]);

            for (const key of retv[type]) {
                keys.add(key);
            }

            retv[type] = Object.freeze(Array.from(keys));
        } else {
            retv[type] = Object.freeze(Array.from(additionalKeys[type]));
        }
    }

    const result = Object.freeze(retv);

    // Cache the result
    unionCache.set(cacheKey, result);

    return result;
}

export { KEYS };
