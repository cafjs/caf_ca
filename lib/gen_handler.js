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
"use strict";
/**
 * Generic CA handler plug.
 *
 * A handler combines custom application methods with CA-private state.
 *
 * CAF binds methods to the handler object enabling user code to
 * access CA state using `this`, i.e., a traditional, non-functional,
 * object abstraction.
 *
 *
 * @name caf_ca/gen_handler
 * @namespace
 * @augments caf_components/gen_transactional
 *
 */
var assert = require('assert');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var async = caf_comp.async;
var semver = require('semver');

var genTransactional = require('./gen_transactional');

var DEFAULT_STATE_VERSION='0.1.0';

/**
 * Constructor method for a generic CA handler plug.
 *
 * @see caf_components/gen_component
 *
 */
exports.constructor = function($, spec) {

    var that = genTransactional.constructor($, spec);

    /*
     * Backup state to provide transactional behavior for the handler.
     *
     */
    var stateBackup = '';


    /**
     * Run-time type information.
     *
     * @type {boolean}
     * @name caf_ca/gen_handler#isHandler
     */
    that.isHandler = true;

    /**
     * JSON-serializable representation of CA private state.
     *
     * The contents of this variable are always checkpointed before
     * any state externalization.
     *
     * The key '__ca_version__' refers to the schema version for this
     * state. The CA method  `__ca_resume__` uses this metadata to decide
     *  whether to transform state or fail an update.
     *
     *
     * @type {Object}
     * @name caf_ca/gen_handler#state
     */
    that.state = {__ca_version__: DEFAULT_STATE_VERSION};

    /**
     * Contains anything but it is not guaranteed to be preserved across
     * message invocations.
     *
     * It is useful for caching since in most cases it will be preserved
     * across messages.
     *
     * @type {Object}
     * @name caf_ca/gen_handler#scratch
     */
    that.scratch = {};

    /**
     * Enables autonomous computation by processing pulse messages that
     * CAF periodically sends to all CAs.
     *
     * @param {caf.cb} cb A callback to continue after pulse.
     * @name  caf_ca/gen_handler#__ca_pulse__
     * @function
     */
    that.__ca_pulse__= function(cb) {
        cb(null);
    };

    /**
     * Dummy method that can be called remotely to ensure a CA is active.
     * The 'Touch' method should not have any side-effects and is present in
     * all CAs.
     *
     * 'Touch' makes latency of the first command in a  session more
     * predictable. It can also guarantee that 'pulse' methods are regularly
     * invoked after a failure, even without active clients.
     *
     *
     * @param {caf.cb} cb A callback to continue after 'touch'.
     *
     * @name caf_ca/gen_handler#__external_ca_touch__
     * @function
     */
    that.__external_ca_touch__ = function(cb) {
        cb(null);
    };

    /**
     * Versions the checkpointed state of a resumed CA to be consistent with
     * its expected version in 'ca.json' (i.e., `props.$.stateVersion`).
     *
     * A resumed CA always calls this function once, just before it starts
     * processing messages.
     *
     * The default policy is to use semantic versioning, and automatically
     * upgrade the version if 'newVersion' satifies '^oldVersion' (first
     * non-zero number cannot change, but the next ones can).
     *  Otherwise, we return an error in the callback.
     *
     * It is expected that applications will override this function
     *  to upgrade between non-compatible versions.
     *
     * @param {string} newVersion The new version label after upgrading the
     *  state.
     * @param {caf.json} myState The state to version.
     * @param {caf.cbb} cb A callback to continue after versioning the state.
     *
     * @name caf_ca/gen_handler#__ca_versionState__
     * @function
     *
     */
    that.__ca_versionState__ = function(newVersion, myState, cb) {
        var oldVersion = myState.__ca_version__;
        if (semver.valid(oldVersion) && semver.valid(newVersion) &&
            semver.satisfies(newVersion, '^' + oldVersion)) {
            myState.__ca_version__ = newVersion;
            cb(null);
        } else {
            var err = new Error("Cannot version state");
            err.newVersion = newVersion;
            err.oldVersion = oldVersion;
            err.state = myState;
            cb(err);
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

    var super__ca_init__ = myUtils.superior(that, '__ca_init__');
    /**
     * @see caf_components/gen_transactional#__ca_init__
     *
     * @name caf_ca/gen_handler#__ca_init__
     * @function
     */
    that.__ca_init__ = function(cb) {
        that.__ca_first_message__ = function(cb0) {
            delete that.__ca_first_message__;
            var version = that.$.props && that.$.props.stateVersion ||
                DEFAULT_STATE_VERSION;
            that.state = {__ca_version__: version};
            super__ca_init__(cb0);
        };
        cb(null, null);
    };

    var super__ca_resume__ = myUtils.superior(that, '__ca_resume__');
    /**
     * @see caf_components/gen_transactional#__ca_resume__
     *
     * @name caf_ca/gen_handler#__ca_resume__
     * @function
     */
    that.__ca_resume__ = function(cp, cb) {
        that.__ca_first_message__ = function(cb0) {
            that.state = cp.state;
            var version = that.$.props && that.$.props.stateVersion ||
                DEFAULT_STATE_VERSION;
            that.state = that.state || {__ca_version__: version};
            delete that.__ca_first_message__;
            async.series([
                             function(cb1) {
                                 that.__ca_versionState__(version, that.state,
                                                          cb1);
                             },
                             function(cb1) {
                                 super__ca_resume__(cp, cb1);
                             }
                         ], cb0);
        };
        cb(null, null);
    };



    var super__ca_begin__ = myUtils.superior(that, '__ca_begin__');
    /**
     * @see caf_components/gen_transactional#__ca_begin__
     *
     * @name caf_ca/gen_handler#__ca_begin__
     * @function
     *
     */
    that.__ca_begin__= function(msg, cb) {
        stateBackup = JSON.stringify(that.state);
        super__ca_begin__(msg, cb);
    };

    var super__ca_prepare__ = myUtils.superior(that, '__ca_prepare__');
    /**
     * @see caf_components/gen_transactional#__ca_prepare__
     *
     * @name caf_ca/gen_handler#__ca_prepare__
     * @function
     *
     */
    that.__ca_prepare__ =  function(cb) {
        super__ca_prepare__(function(err, data) {
                                if (err) {
                                    cb(err, data);
                                } else {
                                    data.state = that.state;
                                    cb(err, data);
                                }
                            });
    };

    var super__ca_abort__ = myUtils.superior(that, '__ca_abort__');
    /**
     * @see caf_components/gen_transactional#__ca_abort__
     *
     * @name caf_ca/gen_handler#__ca_abort__
     * @function
     *
     */
    that.__ca_abort__= function(cb) {
        if (stateBackup) {
            that.state = JSON.parse(stateBackup);
        }
        super__ca_abort__(cb);
    };

    return that;
};
