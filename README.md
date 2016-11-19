# CAF.js (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app and gadgets.

See http://www.cafjs.com

## CAF CA
[![Build Status](http://ci.cafjs.com/api/badges/cafjs/caf_ca/status.svg)](http://ci.cafjs.com/cafjs/caf_ca)

This library provides components to create a CA.

A CA is an Actor, in the spirit of an Erlang/OTP `gen_server`, with a queue that serializes message processing, a location-independent name, some private state, and the ability to change behavior or interact with other CAs.

A CA processes a message in a transaction. External interactions are mediated by transactional plugins, and delayed until the message commits. Any non-commited changes to its internal state can be rolled back if errors are detected. State changes and pending interactions always checkpoint with a remote service before commiting. See {@link external:caf_components/gen_transactional} for details.

This makes it safe to kill, **at any time**, a node.js process hosting thousands of  CAs. The expectations of the external world are always consistent with the recovered CAs.

In fact, our favorite load-balancing strategy is just to kill hot processes, and randomly spread recovered CAs to other instances.

### Hello World (see `examples/helloworld`)

A CA method invocation is implemented by queueing and processing a message. CAs are defined by two sets of methods:

* *internal:* always prefixed by `__ca_` and called by the framework.
* *external:* called by the client library.

```
exports.methods = {
    __ca_init__: function(cb) {
        this.state.counter = 0;
        cb(null);
    },
    increment: function(cb) {
        this.state.counter = this.state.counter + 1;
        cb(null, this.state.counter);
    }
};
```

The *internal* method `__ca_init__` is called by the framework just once, initializing the state of the CA.

The object property `this.state` should contain a JSON-serializable value, and is managed transactionally as described above.

In contrast, `this.scratch` can contain anything, but it is not checkpointed or rolled back.

A CA is a sealed object, and application code should not try to add any properties outside `this.state` or `this.scratch`.

The *external* method `increment` is called by the client library, see `client.js` in the `examples` directory and {@link external:caf_cli}.

CA methods **always** return errors or results in a standard `node.js` callback, i.e., `cb`. This callback is a tail call that informs the framework that we are done processing this message, and we are ready for the next one.

As we will show next, callbacks are needed to enforce message serialization when methods contain asynchronous calls.

Moreover, the combination of a queue for message serialization, state isolation, and tail call callbacks, eliminates a common asynchronous API design flaw: *Releasing Zalgo* {@link http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony}.

In CAF an external caller cannot tell if the callback was called immediately, or at some point in the future.


### Crashy Counter (see `examples/crashy`)

Let's look at a more interesting CA.

```
exports.methods = {
     ...
    increment: function(crash, cb) {
        var self = this;
        var oldValue = this.state.counter;
        this.state.counter = this.state.counter + 1;
        setTimeout(function() {
            if (crash === 'Oops') {
                cb(new Error('Oops')); // Case 1
            } else if (crash === 'Really Oops') {
                throw new Error('Really Oops'); // Case 2
            } else {
                assert(self.state.counter === (oldValue + 1)); // Assertion 1
                cb(null, self.state.counter); // Case 3
            }
        }, 1000);
    }
}
```

*Assertion 1* is always true, even if `increment` is called by many concurrent clients. The CA serializes the requests, and will patiently wait for the timeout  before processing the next one.

The client can receive three different type of responses:

* *Case 1* An application error propagated by the client's callback. Changes to `this.state.counter` are rolled back.

* *Case 2* An uncaught error, assumed to be an application bug, that closes the client session with an error. The error is handled by the framework (we use a fresh node.js *domain* per request), and changes to `this.state.counter` are rolled back. Fix it!

* *Case 3* A new counter value returned in the client's callback.


### Autonomous Behavior (see `examples/autonomous`)

```
exports.methods = {
    ...
    __ca_resume__: function(cp, cb) {
        this.$.log.debug('Resuming with counter:' + cp.state.counter);
        cb(null);
    },
    __ca_pulse__: function(cb) {
        this.state.counter = this.state.counter + 1;
        cb(null);
    }
    ...
}
```

The *internal* method `__ca_resume__` is called every time we reload the CA state from a checkpoint `cp`. It allows customization after migration or failure recovery.

Even if nobody calls the external methods, declaring a method `__ca_pulse__` guarantees that the framework will periodically invoke it, enabling autonomous behavior.

#### Plugins

A CA extends its capabilities with a plugin architecture. CAF.js uses a component model {@link external:caf_components} to describe plugins with a configuration file `ca.json`. See `lib/ca.json` for an example.

A plugin is exposed to application code with a proxy (see {@link external:caf_components/gen_proxy}). These proxies become properties of the object `this.$`.

For example, the following CA uses two proxies: `log`, a logger plugin, and `session`, a plugin providing persistent sessions (see {@link external:caf_session}).

```
exports.methods = {
    ...
    __ca_pulse__: function(cb) {
        this.state.counter = this.state.counter + 1;
        if (this.state.counter % 5 === 0) {
            this.$.log.debug('counter %5 === 0 with ' + this.state.counter);
            this.$.session.notify([this.state.counter]);
        }
        cb(null);
    }
    ...
}
```

### Versioning (see `examples/versioning`)

When the CA implementation changes, the checkpointed CA state may be incompatible with the new code.

We use `semver` conventions, and the configuration property `stateVersion`, to track versions of `this.state`.

The value of `stateVersion` is stored in the checkpoint as property `this.state.__ca_version__`. When a CA resumes, it compares `this.state.__ca_version__` from the checkpoint with the desired value of `stateVersion`.

By default, if `stateVersion` satisfies semver expression `^this.state.__ca_version__` the state transparently upgrades. Otherwise, loading fails.

To override this failure, the CA needs to provide an implementation of `__ca_upgrade__`, a method called before processing any messages. This method knows how to upgrade `this.state` safely.

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
