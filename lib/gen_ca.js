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
 * Generic Cloud Assistant.
 *
 *
 * @name gen_ca
 * @namespace
 * @augments caf_components/gen_transactional
 */
var caf_comp = require('caf_components');
var genTransactional = caf_comp.gen_transactional;
var async = caf_comp.async;
var json_rpc = require('caf_transport');


/**
 * Constructor method for a generic CA.
 *
 * @see caf_components/gen_component
 *
 */
exports.constructor = function($, spec) {

    var that = genTransactional.constructor($, spec);

    /**
     * Run-time type information.
     *
     * @type {boolean}
     * @name gen_ca#__ca_isCA__
     */
    that.__ca_isCA__ = true;


    /**
     * Returns the name of this CA.
     *
     * @return {string} The name of this CA.
     *
     */
    that.__ca_getName__ = function() {
        return spec.name;
    };

    /**
     * Queues a message to be processed by this CA.
     *
     * @param {Object} msg A message to be processed.
     * @param {caf.cb} cb A callback function to continue after
     * processing the message and to propagate a response to the caller.
     *
     *
     * @name gen_ca#__ca_process__
     * @function
     */
    that.__ca_process__ = function(msg, cb) {
        if ((that.__ca_isShutdown__) || (!that.$.inq)) {
            var err = json_rpc.newSysError(msg,
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
     * CAF detects hanged CAs and shuts them down.
     *
     * @see cron_ripper
     *
     * @return {boolean} True if message queue is empty or at least one
     * message was processed since the last call to `progress`.
     *
     *
     * @name gen_ca#__ca_progress__
     * @function
     */
    that.__ca_progress__ = function() {
        return that.$.inq.progress();
    };


    /**
     * Queues a pulse message for this CA to enable autonomous
     * computation.
     *
     * @param {caf.cb} cb A callback function to continue after
     * processing the pulse message.
     *
     * @see cron_pulser
     *
     * @name gen_ca#__ca_pulse__
     * @function
     */
    that.__ca_pulse__ = function(cb) {
        var msg = json_rpc.systemRequest(that.__ca_getName__(),
                                         '__ca_pulse__');
        that.__ca_process__(msg, cb);
    };


    /**
     * Polls for pending notification messages.
     *
     * @param {Object} request A notification request message.
     * @param {caf.cb} cb A callback called when there is a new
     * notification message (or timeout).
     *
     * @name gen_ca#__ca_pull__
     * @function
     */
    that.__ca_pull__ = function(request, cb) {
        if (that.$.session) {
            that.$.session.pull(request, cb);
        } else {
            var err = new Error('Internal Error: pull with no session');
            err.request = request;
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
     * @param {caf.cb} cb A callback function to continue after clean-up.
     *
     * @name gen_ca#__ca_destroy__
     * @function
     */
    that.__ca_destroy__ = function(data, cb) {
        async.series (
            [
                function(cb0) {
                    that.__ca_shutdown__(data, cb0);
                },
                function(cb0) {
                    if ($._.$.cp) {
                        $._.$.cp.deleteState(that.__ca_getName__(), cb0);
                    } else {
                        $._.$.log &&
                            $._.$.log.warn('Checkpointing not enabled');
                        cb0(null);
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
