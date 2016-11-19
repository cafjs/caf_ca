## Running the versioning example

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
