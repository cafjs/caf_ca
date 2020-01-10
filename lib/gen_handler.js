/*!
 Copyright 2013 Hewlett-Packard Development Company, L.P.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
'use strict';
/**
 * Generic CA handler plug.
 *
 * A handler combines custom application methods with private state.
 *
 * CAF binds methods to the handler object, enabling user code to
 * access CA state using `this`, i.e., a traditional, non-functional,
 * object abstraction.
 *
 *
 * @module caf_ca/gen_handler
 * @augments external:caf_components/gen_transactional
 *
 */
// @ts-ignore: augments not attached to a class

var assert = require('assert');
var caf_comp = require('caf_components');
var genTransactional = caf_comp.gen_transactional;
var myUtils = caf_comp.myUtils;
var async = caf_comp.async;
var semver = require('semver');
var getParNames = require('get-parameter-names');

var DEFAULT_STATE_VERSION='0.1.0';

exports.constructor = function($, spec) {

    var that = genTransactional.constructor($, spec);

    assert.equal(typeof(spec.env.methodsFileName), 'string',
                 "'spec.env.methodsFileName' is not a string");

    let methods;
    methods = $._.$.loader.__ca_loadResource__(spec.env.methodsFileName)
        .methods;

    // capture before user code overrides them.
    var super__ca_init__ = myUtils.superior(that, '__ca_init__');
    var super__ca_resume__ = myUtils.superior(that, '__ca_resume__');

    var onlyFun = myUtils.onlyFun(methods);
    myUtils.mixin(that, onlyFun);

    let user__ca_init__;
    user__ca_init__ = typeof onlyFun['__ca_init__'] === 'function' ?
        onlyFun['__ca_init__'] :
        null;
    user__ca_init__ = myUtils.wrapAsyncFunction(user__ca_init__, that);

    let user__ca_resume__;
    user__ca_resume__ = typeof onlyFun['__ca_resume__'] === 'function' ?
        onlyFun['__ca_resume__'] :
        null;
    user__ca_resume__ = myUtils.wrapAsyncFunction(user__ca_resume__, that);

    let user__ca_pulse__;
    user__ca_pulse__ = typeof onlyFun['__ca_pulse__'] === 'function' ?
        onlyFun['__ca_pulse__'] :
        null;
    user__ca_pulse__ = myUtils.wrapAsyncFunction(user__ca_pulse__, that);

    let user__ca_upgrade__;
    user__ca_upgrade__ = typeof onlyFun['__ca_upgrade__'] === 'function' ?
        onlyFun['__ca_upgrade__'] :
        null;
    user__ca_upgrade__ = myUtils.wrapAsyncFunction(user__ca_upgrade__, that);
    // begin, prepare and abort are protected from user override.

    var metaMethods = null;

    var computeMeta = function() {
        var computeMetaImpl = function() {
            var result = {};
            Object.keys(that)
                .filter(function(m) {
                    return ((m.indexOf('__ca_') !== 0) &&
                            (typeof that[m] === 'function'));
                })
                .forEach(function(m) {
                    var meta = getParNames(that[m]).map(function(x) {
                        return x.trim();
                    });
                    // Get rid of the callback argument if not async
                    if (that[m].constructor.name === 'AsyncFunction') {
                        // assumed async functions do not provide a callback
                        result[m] = meta;
                    } else {
                        result[m] = meta.slice(0, meta.length -1);
                    }
                });
            return result;
        };

        if (metaMethods === null) {
            metaMethods = computeMetaImpl();
        }
        return metaMethods;
    };

    /**
     * Run-time type information.
     *
     * @type {boolean}
     *
     * @memberof! module:caf_ca/gen_handler#
     * @alias __ca_isHandler__
     */
    that.__ca_isHandler__ = true;

    /**
     * JSON-serializable representation of a CA's private state.
     *
     * The contents of this variable are always checkpointed before
     * any state externalization.
     *
     * The key `__ca_version__` refers to the schema version for
     * `this.state`.
     *
     * @type {Object}
     * @memberof! module:caf_ca/gen_handler#
     * @alias state
     */
    that.state = {__ca_version__: DEFAULT_STATE_VERSION};

    /**
     * Contains anything, but it is not guaranteed to be preserved across
     * message invocations.
     *
     * Scratch is used for caching since in most cases it will be preserved
     * across messages.
     *
     * It can also help debugging, since its value is never rolled back.
     *
     * @type {Object}
     * @memberof! module:caf_ca/gen_handler#
     * @alias scratch
     */
    that.scratch = {};

    /**
     * Enables autonomous computation by processing pulse messages that
     * CAF periodically sends to all CAs.
     *
     * @param {cbType} cb A callback to continue after pulse.
     *
     * @memberof! module:caf_ca/gen_handler#
     * @alias __ca_pulse__
     */
    that.__ca_pulse__= function(cb) {
        if (user__ca_pulse__) {
            user__ca_pulse__(cb);
        } else {
            cb(null);
        }
    };

    /**
     * A dummy method that ensures a CA is active.
     *
     * The 'Touch' method should not have any side-effects and is present in
     * all CAs.
     *
     * It also returns in the callback metadata of the methods (an object
     * with keys the method names, and values and array with the argument names)
     *
     * `Touch` makes latency of the first command in a session more
     * predictable. It can also guarantee that `pulse` methods are regularly
     * invoked after a failure, even without active clients.
     *
     *
     * @param {cbType} cb A callback to continue after 'touch'. It returns
     * an object with CA methods metadata, where a key is a method name and
     * a value is an array with arguments names.
     *
     * @memberof! module:caf_ca/gen_handler#
     * @alias __external_ca_touch__
     */
    that.__external_ca_touch__ = function(cb) {
        cb(null, computeMeta());
    };


    /**
     * A method that aggregates multiple method invocations in a single message.
     * The failure of one of them will abort changes for all of them,
     * as if they were all executed in one transaction.
     *
     *  SECURITY WARNING:
     *     *** Granting access to this method means that ANY method of this CA
     *         can be called ***
     *
     *
     * type of invocationType is {method: string, meta : Array.<string>,
     *                            args: Array.<caf.json>}
     * @param {Array.<invocationType>} multiArgs An array
     * @param {cbType} cb A callback to return the results of the last method.
     *
     * @memberof! module:caf_ca/gen_handler#
     * @alias __external_ca_multi__
     */
    that.__external_ca_multi__ = function(multiArgs, cb) {
        var lastRes = null;
        async.eachSeries(multiArgs, function(x, cb1) {
            var args = x.args;
            args.push(function(err, res) {
                if (err) {
                    cb1(err);
                } else {
                    lastRes = res;
                    cb1(null);
                }
            });
            var f = myUtils.wrapAsyncFunction(that[x.method], that);
            f.apply(that, args);
        }, function(err) {
            cb(err, lastRes);
        });
    };

    /**
     * Destroys this CA permanently by deleting its checkpointed state.
     *
     * Destroyed CAs cannot be resumed and input/output queues are
     *  immediately discarded.
     *
     * @param {Object=} data An optional hint on how to perform the shutdown.
     * @param {cbType} cb A callback function to continue after clean-up.
     *
     * @memberof! module:caf_ca/gen_handler#
     * @alias __ca_destroy__
     */
    that.__ca_destroy__ = function(data, cb) {
        $.ca.__ca_destroy__(data, cb);
    };

    /**
     * Versions the checkpointed state of a resumed CA so that is consistent
     * with its expected version `props.$.stateVersion`, set in file `ca.json`.
     *
     * A resumed CA always calls this function once, just before it starts
     * processing messages.
     *
     * The default policy is to use semantic versioning, and automatically
     * upgrade the version if `newVersion` satifies `^oldVersion` (first
     * non-zero number cannot change, but the next ones can).
     *  Otherwise, we return an error in the callback.
     *
     * It is expected that applications will override this function
     *  to upgrade between non-compatible versions.
     *
     * @param {string} newVersion The new version label after upgrading the
     *  state.
     * @param {cbType} cb A callback to continue after versioning the state.
     *
     * @memberof! module:caf_ca/gen_handler#
     * @alias __ca_upgrade__
     */
    that.__ca_upgrade__ = function(newVersion, cb) {
        if (user__ca_upgrade__) {
            user__ca_upgrade__(newVersion, cb);
        } else {
            var oldVersion = that.state.__ca_version__;
            if (semver.valid(oldVersion) && semver.valid(newVersion) &&
                semver.satisfies(newVersion, '^' + oldVersion)) {
                that.state.__ca_version__ = newVersion;
                cb(null);
            } else {
                var err = new Error('Cannot version state');
                err['newVersion'] = newVersion;
                err['oldVersion'] = oldVersion;
                err['state'] = that.state;
                cb(err);
            }
        }
    };

    /* We want to execute the user defined '__ca_init__' or '__ca_resume__'
     * methods as if they were invoked during the processing of a message,
     * so that we can use transactions, state checkpointing, and so on...
     *
     * The strategy is to delay the actual execution of those methods until
     * a 'first_message' gets processed. By then all the other subsystems
     *  required to process this message have been properly initialized.
     *
     */

    that.__ca_init__ = function(cb) {
        that.__ca_first_message__ = function(cb0) {
            delete that.__ca_first_message__;
            var version = that.$.props && that.$.props.stateVersion ||
                    DEFAULT_STATE_VERSION;
            that.state = {
                __ca_version__: version,
                __ca_uid__: myUtils.uniqueId()
            };
            // enable IoT mixin initialization
            let iotInit;
            iotInit = typeof that['__ca_iot_init__'] === 'function' ?
                myUtils.superior(that, '__ca_iot_init__') :
                null;

            async.series([
                function(cb1) {
                    super__ca_init__(cb1);
                },
                function(cb1) {
                    if (iotInit) {
                        try {
                            iotInit(cb1);
                        } catch (ex) {
                            cb1(ex);
                        }
                    } else {
                        cb1(null);
                    }
                },
                function(cb1) {
                    if (user__ca_init__) {
                        try {
                            user__ca_init__(cb1);
                        } catch (ex) {
                            cb1(ex);
                        }
                    } else {
                        cb1(null);
                    }
                }
            ], cb0);
        };
        cb(null, null);
    };

    that.__ca_resume__ = function(cp, cb) {
        that.__ca_first_message__ = function(cb0) {
            var newVersion = that.$.props && that.$.props.stateVersion ||
                    DEFAULT_STATE_VERSION;
            delete that.__ca_first_message__;
            async.series([
                function(cb1) {
                    // load state before upgrading it.
                    super__ca_resume__(cp, cb1);
                },
                function(cb1) {
                    try {
                        that.__ca_upgrade__(newVersion, cb1);
                    } catch (ex) {
                        cb1(ex);
                    }
                },
                function(cb1) {
                    if (user__ca_resume__) {
                        try {
                            user__ca_resume__(cp, cb1);
                        } catch (ex) {
                            cb1(ex);
                        }
                    } else {
                        cb1(null);
                    }
                }
            ], cb0);
        };
        cb(null, null);
    };

    return that;
};
