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
 * Generic Cloud Assistant.
 *
 *
 * @module caf_ca/gen_ca
 * @augments external:caf_components/gen_transactional
 */
// @ts-ignore: augments not attached to a class

const caf_comp = require('caf_components');
const genTransactional = caf_comp.gen_transactional;
const async = caf_comp.async;
const json_rpc = require('caf_transport').json_rpc;

exports.constructor = function($, spec) {

    const that = genTransactional.constructor($, spec);

    var justCreated = false;

    /**
     * Run-time type information.
     *
     * @type {boolean}
     *
     * @memberof! module:caf_ca/gen_ca#
     * @alias __ca_isCA__
     */
    that.__ca_isCA__ = true;

    /**
     * Whether this CA was recently created.
     *
     * @return {boolean} True if this CA was recently created.
     *
     * @memberof! module:caf_ca/gen_ca#
     * @alias __ca_isJustCreated__
     */
    that.__ca_isJustCreated__ = function() {
        return justCreated;
    };

    /**
     * Sets the value of a flag that indicates
     * this CA was recently created.
     *
     * @param {boolean} value A new value.
     * @return {boolean} The old value.
     *
     * @memberof! module:caf_ca/gen_ca#
     * @alias __ca_setJustCreated__
     */
    that.__ca_setJustCreated__ = function(value) {
        const old = justCreated;
        justCreated = value;
        return old;
    };

    /**
     * Returns the name of this CA.
     *
     * @return {string} The name of this CA.
     *
     * @memberof! module:caf_ca/gen_ca#
     * @alias __ca_getName__
     */
    that.__ca_getName__ = function() {
        return spec.name;
    };

    /**
     * Returns the application name.
     *
     * @return {string} The application name.
     *
     * @memberof! module:caf_ca/gen_ca#
     * @alias __ca_getAppName__
     */
    that.__ca_getAppName__ = function() {
        return $._.__ca_getAppName__();
    };


    /**
     * Queues a message to be processed by this CA.
     *
     * @param {Object} msg A message to be processed.
     * @param {cbType} cb A callback function to propagate a response to the
     *  caller.
     *
     * @memberof! module:caf_ca/gen_ca#
     * @alias __ca_process__
     */
    that.__ca_process__ = function(msg, cb) {
        if ((that.__ca_isShutdown__) || (!that.$.inq)) {
            const err = json_rpc.newSysError(msg,
                                             json_rpc.ERROR_CODES.shutdownCA,
                                             'CA cannot process message');
            cb(null, json_rpc.reply(err));
        } else {
            that.$.inq.process(msg, cb);
        }
    };

    /**
     * Checks for progress processing messages.
     *
     * Using this method CAF detects hanged CAs and shuts them down.
     *
     * @see cron_ripper
     *
     * @return {boolean} True if message queue is empty or at least one
     * message was processed since the last call to `__ca_progress__`.
     *
     *
     * @memberof! module:caf_ca/gen_ca#
     * @alias __ca_progress__
     */
    that.__ca_progress__ = function() {
        return that.$.inq.progress();
    };


    /**
     * Queues a pulse message for this CA, enabling autonomous
     * computation.
     *
     * @param {cbType} cb A callback function to continue after
     * the pulse message.
     *
     * @see cron_pulser
     *
     * @memberof! module:caf_ca/gen_ca#
     * @alias __ca_pulse__
     */
    that.__ca_pulse__ = function(cb) {
        const msg = json_rpc.systemRequest(that.__ca_getName__(),
                                           '__ca_pulse__');
        that.__ca_process__(msg, cb);
    };


    /**
     * Polls for pending notification messages.
     *
     * @param {Object} request A notification request message.
     * @param {cbType} cb A callback called when there is a new
     * notification message (or timeout).
     *
     * @memberof! module:caf_ca/gen_ca#
     * @alias __ca_pull__
     */
    that.__ca_pull__ = function(request, cb) {
        if (that.$.session) {
            that.$.session.pull(request, cb);
        } else {
            const err = new Error('Internal Error: pull with no session');
            err['request'] = request;
            cb(err);
        }
    };


    /* Two different ways of stopping a CA: shutdown and destroy.
     *
     * Shutdown ignores the current running state of the CA and does not
     * checkpoint or call any methods. It is what you need when the CA is
     * hanged or want it to migrate.
     *
     * No new checkpoints, processed messages or pulled session messages
     * should occur  after shutdown. Shutdown CAs eventually get
     * removed from the lookup service and GC.
     *
     * Destroy is a shutdown that also deletes any permanent state associated
     * with the CA. Restarting a CA with the same id just means a fresh new CA.
     *
     */

    /**
     * Destroys this CA permanently by deleting its checkpointed state.
     *
     * Destroyed CAs cannot be resumed and input/output queues are
     *  immediately discarded.
     *
     * @param {Object=} data An optional hint on how to perform the shutdown.
     * @param {cbType} cb A callback function to continue after clean-up.
     *
     * @memberof! module:caf_ca/gen_ca#
     * @alias __ca_destroy__
     */
    that.__ca_destroy__ = function(data, cb) {
        async.series (
            [
                function(cb0) {
                    that.__ca_shutdown__(data, cb0);
                },
                function(cb0) {
                    try {
                        $._.$.cp.deleteState(that.__ca_getName__(), cb0);
                    } catch (ex) {
                        $._.$.log &&
                            $._.$.log.warn('Checkpointing service missing');
                        cb0(ex);
                    }
                }
            ],
            function(error, data) {
                if (error) {
                    $._.$.log && $._.$.log.error('Cannot delete state');
                }
                cb(error, data);
            });
    };

    return that;
};
