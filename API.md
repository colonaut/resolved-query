## Modules

<dl>
<dt><a href="#module_resolveQuery">resolveQuery</a> ⇒ <code><a href="#ResolvedQuery">Promise.&lt;ResolvedQuery&gt;</a></code></dt>
<dd><p>Retrieve a Promise on a ResolvedQuery instance</p>
</dd>
</dl>

## Classes

<dl>
<dt><a href="#ResolvedQuery">ResolvedQuery</a></dt>
<dd></dd>
</dl>

<a name="module_resolveQuery"></a>

## resolveQuery ⇒ <code>[Promise.&lt;ResolvedQuery&gt;](#ResolvedQuery)</code>
Retrieve a Promise on a ResolvedQuery instance

**Returns**: <code>[Promise.&lt;ResolvedQuery&gt;](#ResolvedQuery)</code> - Only, if no callback is given  

| Param | Type | Description |
| --- | --- | --- |
| query |  | The query object |
| resolved_schema | <code>ResolvedSchema</code> |  |
| [callback] | <code>function</code> | (Error, ResolvedQuery) |

**Example**  
```js
const resolveQuery = require('resolved-query');
//usage as promise
resolveQuery({})
 .then(resolved_query) => {...}
 .catch(err) => {...}
//usage with callback
resolveQuery({}, (err, resolved_query) => {...})
```
<a name="ResolvedQuery"></a>

## ResolvedQuery
**Kind**: global class  

* [ResolvedQuery](#ResolvedQuery)
    * [new ResolvedQuery(query_data, keys)](#new_ResolvedQuery_new)
    * [.isNumber(key)](#ResolvedQuery+isNumber) ⇒ <code>boolean</code>
    * [.isArray(key)](#ResolvedQuery+isArray) ⇒ <code>boolean</code>
    * [.match(model, callback)](#ResolvedQuery+match) ⇒ <code>boolean</code>
    * [.keys()](#ResolvedQuery+keys) ⇒ <code>Array</code>
    * [.value(key)](#ResolvedQuery+value) ⇒ <code>Array</code> &#124; <code>String</code> &#124; <code>Number</code>
    * [.expr(key)](#ResolvedQuery+expr) ⇒ <code>string</code>

<a name="new_ResolvedQuery_new"></a>

### new ResolvedQuery(query_data, keys)

| Param | Type | Description |
| --- | --- | --- |
| query_data | <code>Object</code> | Result of the resolve function |
| keys | <code>Array.&lt;string&gt;</code> |  |

<a name="ResolvedQuery+isNumber"></a>

### resolvedQuery.isNumber(key) ⇒ <code>boolean</code>
**Kind**: instance method of <code>[ResolvedQuery](#ResolvedQuery)</code>  

| Param | Type |
| --- | --- |
| key | <code>string</code> | 

<a name="ResolvedQuery+isArray"></a>

### resolvedQuery.isArray(key) ⇒ <code>boolean</code>
**Kind**: instance method of <code>[ResolvedQuery](#ResolvedQuery)</code>  

| Param | Type |
| --- | --- |
| key | <code>string</code> | 

<a name="ResolvedQuery+match"></a>

### resolvedQuery.match(model, callback) ⇒ <code>boolean</code>
**Kind**: instance method of <code>[ResolvedQuery](#ResolvedQuery)</code>  

| Param | Type |
| --- | --- |
| model | <code>object</code> | 
| callback | <code>function</code> | 

<a name="ResolvedQuery+keys"></a>

### resolvedQuery.keys() ⇒ <code>Array</code>
**Kind**: instance method of <code>[ResolvedQuery](#ResolvedQuery)</code>  
**Returns**: <code>Array</code> - The keys of the query  
<a name="ResolvedQuery+value"></a>

### resolvedQuery.value(key) ⇒ <code>Array</code> &#124; <code>String</code> &#124; <code>Number</code>
**Kind**: instance method of <code>[ResolvedQuery](#ResolvedQuery)</code>  
**Returns**: <code>Array</code> &#124; <code>String</code> &#124; <code>Number</code> - The given query pattern for key  

| Param |
| --- |
| key | 

<a name="ResolvedQuery+expr"></a>

### resolvedQuery.expr(key) ⇒ <code>string</code>
**Kind**: instance method of <code>[ResolvedQuery](#ResolvedQuery)</code>  
**Returns**: <code>string</code> - expression  

| Param |
| --- |
| key | 

