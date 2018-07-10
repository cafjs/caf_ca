# CAF.js (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app and gadgets.

See http://www.cafjs.com

## CAF CA
[![Build Status](https://travis-ci.org/cafjs/caf_ca.svg?branch=master)](https://travis-ci.org/cafjs/caf_ca)

This library provides components to create a CA.

A CA is an Actor, in the spirit of an Erlang/OTP `gen_server`, with a queue that serializes message processing, a location-independent name, some private state, and the ability to change behavior, or interact with other CAs.

A CA processes a message in a transaction. External interactions are mediated by transactional plugins, and delayed until the message commits. Any non-commited changes to its internal state can be rolled back if errors are detected. State changes and pending interactions always checkpoint with a remote service before commiting. See {@link external:caf_components/gen_transactional} for details.

This makes it safe to kill, **at any time**, a node.js process hosting thousands of  CAs. The expectations of the external world are always consistent with the recovered CAs.

In fact, our favorite load-balancing strategy is to just kill hot processes, and randomly spread recovered CAs to other instances.

### Hello World (see `examples/helloworld`)

CA methods are **always** asynchronous methods. They can be implemented using the `async/await` pattern, or using standard callbacks. In the first case we emulate the callback by returning an array with an error/data pair.

When the method returns this array, or invokes the callback as a tail call, the framework knows that the message has been fully processed, and your application is ready for the next one. This enforces message serialization.

Never throw in a method to propagate an application error. An unhandled exception closes the client session. This makes it easier to find programming errors.

CAs have two sets of methods:

* *internal:* always prefixed by `__ca_` and called by the framework.
* *external:* called remotely by the client library.

```
exports.methods = {
    async __ca_init__() {
        this.state.counter = 0;
        return [];
    },
    async increment() {
        this.state.counter = this.state.counter + 1;
        return [null, this.state.counter];
    }
};
```

The *internal* method `__ca_init__` is called by the framework just once, initializing the state of the CA.

The object property `this.state` should contain a JSON-serializable value, and is managed transactionally as described above.

In contrast, `this.scratch` can contain anything, but is not checkpointed or rolled back.

A CA is a sealed object, and application code should not try to add any properties outside `this.state` or `this.scratch`.

*External* methods, such as `increment`, are called by the client library, see `client.js` in the `examples` directory and {@link external:caf_cli}.


### Crashy Counter (see `examples/crashy`)

Let's look at a more interesting CA.

```
var setTimeoutPromise = util.promisify(setTimeout);
exports.methods = {
     ...
    async increment(crash) {
        var oldValue = this.state.counter;
        this.state.counter = this.state.counter + 1;
        await setTimeoutPromise(1000);
        if (crash === 'Oops') {
            return [new Error('Oops')];// Case 1
        } else if (crash === 'Really Oops') {
            throw new Error('Really Oops'); // Case 2
        } else {
            assert(this.state.counter === (oldValue + 1)); // Assertion 1
            return [null, this.state.counter]; // Case 3
        }
    }
}
```

*Assertion 1* is always true, even if `increment` is called by many concurrent clients. The CA serializes the requests, and will patiently wait for the timeout  before processing the next one.

The client can receive three different type of responses:

* *Case 1* An application error propagated by the client's callback. Changes to `this.state.counter` are rolled back.

* *Case 2* An unhandled error, assumed to be an application bug, that closes the client session with an error. The framework also recovers from this error, with changes to `this.state.counter` being rolled back.

* *Case 3* A new counter value returned in the client's callback.


### Autonomous Behavior (see `examples/autonomous`)

```
exports.methods = {
    ...
    async __ca_resume__(cp) {
        this.$.log.debug('Resuming with counter:' + cp.state.counter);
        return [];
    },
    async __ca_pulse() {
        this.state.counter = this.state.counter + 1;
        return [];
    }
    ...
}
```

Declaring a method `__ca_pulse__` guarantees that the framework will periodically invoke it, enabling autonomous behavior.

The method `__ca_resume__` is called every time we reload the CA state from a checkpoint `cp`. It allows customization after migration or failure recovery.


#### Plugins

A CA extends its capabilities with a plugin architecture. CAF.js uses a component model {@link external:caf_components} to describe plugins with a configuration file `ca.json`. See `lib/ca.json` for an example.

A plugin is exposed to application code with a security proxy (see {@link external:caf_components/gen_proxy}). These proxies are properties of the object `this.$`.

For example, the following CA uses two proxies: `log`, a logger plugin, and `session`, a plugin providing persistent sessions (see {@link external:caf_session}).

```
exports.methods = {
    ...
    async __ca_pulse__() {
        this.state.counter = this.state.counter + 1;
        if (this.state.counter % 5 === 0) {
            this.$.log.debug('counter %5 === 0 with ' + this.state.counter);
            this.$.session.notify([this.state.counter]);
        }
        return [];
    }
    ...
}
```

### Versioning (see `examples/versioning`)

(This example uses callbacks instead of `async/await`. Both are first-class citizens of the platform, but if you use node 8 or newer, we recommend `async/await` because programs are easier to read.)

When the implementation of a CA changes, the checkpointed state may be incompatible with the new code.

We use `semver` conventions, and the configuration property `stateVersion`, to track versions of `this.state`.

The value of `stateVersion` is stored in the checkpoint as property `this.state.__ca_version__`. When a CA resumes, it compares `this.state.__ca_version__` from the checkpoint with the desired value of `stateVersion`.

By default, if `stateVersion` satisfies semver expression `^this.state.__ca_version__` the state transparently upgrades. Otherwise, loading fails.

To avoid this failure, the CA needs to provide an implementation of `__ca_upgrade__`, a method called before processing any messages. This method knows how to upgrade `this.state` safely.

For example, changing `this.state.counter` to `this.state.myCounter`:

```
exports.methods = {
    ...
    __ca_upgrade__: function(newVersion, cb) {
        var oldVersion = this.state.__ca_version__;
        if (semver.valid(oldVersion) && semver.valid(newVersion) &&
            semver.satisfies(newVersion, '^' + oldVersion)) {
            this.$.log.debug('update: minor version:automatic update of state');
        } else {
            // do some magic to this.state
            this.$.log.debug('update: major version mismatch ' + newVersion );
            this.state.myCounter = this.state.counter;
            delete this.state.counter;
        }
        this.state.__ca_version__ = newVersion;
        cb(null);
    },
    increment: function(cb) {
        this.state.myCounter = this.state.myCounter + 1;
        cb(null, this.state.myCounter);
    }
    ...
}
```

### Much More...

* Sharing Actors {@link external:caf_sharing}

* Security {@link external:caf_security}

* Persistent Sessions {@link external:caf_session}

* Pub/Sub {@link external:caf_pubsub}
