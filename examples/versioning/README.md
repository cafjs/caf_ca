## Running the versioning example

This example shows how to upgrade your program without losing state, even if the new code uses an incompatible schema.

First cleanup redis

    redis-cli flushall

Run first version in `runFirst` directory

    node ca_methods.js
    node client.js

Kill the node.js server process

Run second version in `runSecond` directory

    node ca_methods.js
    node client.js

The counter state should propagate to the second version

## Callbacks vs async/await

This example uses callbacks instead of async/await. Callbacks are compatible with node 6, and they could be marginally faster. However, the recommended option is async/await because the code is typically easier to read.

In CAF.js we can mix asynchronous methods of different types. However,  a method using callbacks should never use the `async` tag. Similarly, we should never return an array *and* call the callback. To avoid this kind of mistakes it is recoommended to choose a consistent style for all the methods.
