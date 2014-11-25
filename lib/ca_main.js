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
 * A container component that assembles and manages one Cloud Assistant
 * as described in `ca.json`.
 *
 * A typical CA has multiple plug_ca components, each with its own state,
 * and containing a stateless, frozen proxy. The proxy facilitates secure
 *  multi-tenancy by narrowing interfaces. The plug interacts with
 * framework-level components common to all the CAs hosted in same node.js
 *  process.
 *
 * The state of a CA and its plugins is managed transactionally using a 2PC
 * protocol, which relies on an external checkpointing service for durability.
 *  See caf_components/gen_transactional for details.
 *
 * @name caf_ca/ca
 * @namespace
 * @augments caf_ca/gen_ca
 */

var assert = require('assert');
var caf_comp = require('caf_components');
var async = caf_comp.async;
var genCA = require('./gen_ca');
var json_rpc = require('caf_transport');
var myUtils = caf_comp.myUtils;

/**
 * Factory method to create a CA.
 *
 * Do not call this method directly, use `instance()` in the `fact`
 * service (`caf_core/plug_factory`) to avoid duplicates, grab leases,
 *  and register CAs properly.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genCA.constructor($, spec);
        that.$.ca = that;
        var leaseTimeout = spec.env.leaseTimeout; // in seconds
        assert.equal(typeof leaseTimeout, 'number',
                     "'spec.env.leaseTimeout' is not a number");
        var stateCP = null;
        async.series(
            [
                function(cb0) {
                    // Ensure we have a lease.
                    if (($._.$.cp) && (leaseTimeout > 0)) {
                        $._.$.cp.grabLease(that.__ca_getName__(),
                                           leaseTimeout, cb0);
                    } else {
                        $._.$.log &&
                            $._.$.log.warn('Not grabbing a lease');
                        cb0(null);
                    }
                },
                function(cb0) {
                    // force initialization of lazy components.
                    that.__ca_checkup__(null, cb0);
                },
                function(cb0) {
                    var cb1 = function(err, val) {
                        if (!err) {
                            stateCP = val;
                        }
                        cb0(err, val);
                    };
                    if ($._.$.cp) {
                        $._.$.cp.getState(that.__ca_getName__(), cb1);
                    } else {
                        $._.$.log &&
                            $._.$.log.warn('Checkpointing not enabled');
                        cb1(null, null);
                    }
                },
                function(cb0) {
                    if (typeof stateCP === 'string') {
                        try {
                            var cpObj = JSON.parse(stateCP);
                            that.__ca_resume__(cpObj, cb0);
                        } catch( err) {
                            cb0(err);
                        }
                    } else {
                        that.__ca_init__(cb0);
                    }
                },
                function(cb0) {
                    // this is where the real resume/init happens
                    var cb1 = function(err, result) {
                        if (err) {
                            cb0(err);
                        } else {
                            var retErr = null;
                            /*
                             * Errors during init or resume are mapped to
                             *  system or app errors that abort initialization.
                             *
                             * This is not enough, it leaves the CA in an
                             * uninitialized state, and errors get ignored.
                             *
                             * Instead we need to shutdown the CA, and propagate
                             * errors in the callback.
                             */
                            if (json_rpc.isSystemError(result) ||
                                (json_rpc.getAppReplyError(result))) {
                                retErr = result;
                            }
                            async.series([
                                             function(cb2) {
                                                 if (retErr) {
                                                    that.__ca_shutdown__(null,
                                                                         cb2);
                                                 } else {
                                                     cb2(null);
                                                 }
                                             }
                                         ], function(errIgnore, ignore) {
                                             // ignore shutdown failure
                                             cb0(retErr, result);
                                         });
                        }
                    };
                    var msg = json_rpc
                        .systemRequest(that.__ca_getName__(),
                                       '__ca_first_message__');
                    that.__ca_process__(msg, cb1);
                }
            ],
            function(err, data) {
                if (err) {
                    $._.$.log && $._.$.log.error('Cannot create CA' +
                                                 myUtils.errToPrettyStr(err));
                    cb(err);
                } else {
                    cb(err, that);
                }
            });
    } catch (err) {
        cb(err);
    }
};


