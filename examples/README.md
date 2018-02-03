## Running the examples

First, ensure that all dependencies are  installed. In top `caf` dir:

    yarn run installAll

Second, run locally a `redis-server` instance at the default port 6379 with no password. In ubuntu:

    apt-get install redis-server

and then, for example,  in the `examples/crashy` directory:

    node ca_methods.js

to start the server at port 3000, and

    node client.js

to run the client code.
