// Modifications copyright 2020 Caf.js Labs and contributors
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
 * A container component that assembles and manages one Cloud Assistant.
 *
 * @module caf_ca/ca_main
 * @augments module:caf_ca/gen_ca
 */
// @ts-ignore: augments not attached to a class

const assert = require('assert');
const caf_comp = require('caf_components');
const async = caf_comp.async;
const genCA = require('./gen_ca');
const json_rpc = require('caf_transport').json_rpc;
const myUtils = caf_comp.myUtils;

exports.newInstance = function($, spec, cb) {
    try {
        // passing the result of a security check.
        const blockCreate = spec.env.blockCreate;
        delete spec.env.blockCreate;
        blockCreate && $._.$.log && $._.$.log.warn('Blocking CA create ' +
                                                    spec.name);
        // ensure that partial failures shutdown the CA
        var doNotRestart = false;

        const that = genCA.create($, spec);
        that.$.ca = that;
        const getLeaseTimout = function () {
            // Give priority to the platform definition, leaseTimeout in
            // 'ca.json' is just for testing.
            if ($._.$.lease) {
                return $._.$.lease.getLeaseTimeout();
            } else {
                return spec.env.leaseTimeout;
            }
        };
        const leaseTimeout = getLeaseTimout(); // in seconds
        assert.equal(typeof leaseTimeout, 'number',
                     "'spec.env.leaseTimeout' is not a number");
        var stateCP = null;
        async.series(
            [
                function(cb0) {
                    try {
                        // Ensure we have a lease.
                        if (leaseTimeout > 0) {
                            $._.$.cp.grabLease(that.__ca_getName__(),
                                               leaseTimeout, cb0);
                        } else {
                            $._.$.log &&
                                $._.$.log.warn('Not grabbing a lease');
                            cb0(null);
                        }
                    } catch (ex) {
                        cb0(ex);
                    }
                },
                function(cb0) {
                    // force initialization of lazy components.
                    that.__ca_checkup__(null, cb0);
                },
                function(cb0) {
                    const cb1 = function(err, val) {
                        if (!err) {
                            stateCP = val;
                        }
                        cb0(err, val);
                    };
                    try {
                        $._.$.cp.getState(that.__ca_getName__(), cb1);
                    } catch (ex) {
                        cb1(ex);
                    }
                },
                function(cb0) {
                    if (typeof stateCP === 'string') {
                        try {
                            const cpObj = JSON.parse(stateCP);
                            that.__ca_resume__(cpObj, cb0);
                        } catch (err) {
                            cb0(err);
                        }
                    } else {
                        if (blockCreate) {
                            const error = new Error('Only owners create CAs');
                            error['code'] = json_rpc.ERROR_CODES.notAuthorized;
                            error['notAuthorized'] = true;
                            error['target'] = spec.name;
                            $._.$.log &&
                                $._.$.log.warn('Blocking create CA ' +
                                               myUtils.errToPrettyStr(error));
                            cb0(error);
                        } else {
                            that.__ca_setJustCreated__(true);
                            that.__ca_init__(cb0);
                        }
                    }
                },
                function(cb0) {
                    // this is where the real resume/init happens
                    const cb1 = function(err, result) {
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
                                        that.__ca_shutdown__(null, cb2);
                                    } else {
                                        cb2(null);
                                    }
                                }
                            ], function(errIgnore) {
                                // ignore shutdown failure
                                if (errIgnore) {
                                    retErr.shutdownError = errIgnore;
                                }
                                cb0(retErr, result);
                            });
                        }
                    };
                    const msg = json_rpc.systemRequest(that.__ca_getName__(),
                                                       '__ca_first_message__');
                    that.__ca_process__(msg, cb1);
                }
            ],
            function(err) {
                if (err) {
                    $._.$.log && $._.$.log.error('Cannot create CA' +
                                                 myUtils.errToPrettyStr(err));
                    cb(err);
                } else {
                    // should not recover without a full shutdown
                    doNotRestart = true;
                    cb(err, that);
                }
            });


        const super__ca_checkup__ = myUtils.superior(that, '__ca_checkup__');
        that.__ca_checkup__ = function(data, cb) {
            if (doNotRestart) {
                data = myUtils.mixin({doNotRestart: true}, data || {});
            }
            super__ca_checkup__(data, cb);
        };

    } catch (err) {
        cb(err);
    }
};
