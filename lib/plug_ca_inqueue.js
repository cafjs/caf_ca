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
 * A plug object that manages the input message queue for a CA.
 *
 *
 * @module caf_ca/plug_ca_inqueue
 * @augments external:caf_components/gen_plug_ca
 *
 */
var domain = require('domain');
var caf_comp = require('caf_components');
var async = caf_comp.async;
var myUtils = caf_comp.myUtils;
var genPlugCA = caf_comp.gen_plug_ca;
var json_rpc = require('caf_transport').json_rpc;
var ERROR_CODES = json_rpc.ERROR_CODES;

/*
 * The behavior of this queue is quite different from a traditional message
 *  queue, such as RabbitMQ:
 *
 *  First, queueing messages is not transactional with respect to
 *   message processing.
 *
 *  Second, messages are not persisted, and their processing is best effort.
 *
 * A client only knows that a message was received after it receives
 * a reply with the result of its processing. There is no other ACK
 * mechanism. At that point CAF current checkpoint will reflect this processing,
 * making  its internal state always consistent with externally
 *  visible actions.
 *
 * See `caf_session` for how to provide stronger guarantees on top of this
 *  basic abstraction.
*/

exports.newInstance = function($, spec, cb) {
    try {
        var that = genPlugCA.constructor($, spec);
        var queue = null;

        var messagesProcessed = 0;

        var lastMessagesProcessed = -1;

        $._.$.log && $._.$.log.debug('New inQueue Manager plug');

        /**
         *  Gets the input message queue of this CA.
         *
         * @return {Object} The input message queue of this CA. This queue
         * provides a `length()` method to find out the number of pending
         *  messages.
         *
         * @memberof! module:caf_ca/plug_ca_inqueue#
         * @alias getQueue
         */
        that.getQueue = function() {
            return queue;
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
         * @memberof! module:caf_ca/plug_ca_inqueue#
         * @alias progress
         */
        that.progress = function() {
            var result = true;
            if ((messagesProcessed === lastMessagesProcessed) &&
                (queue.length() > 0)) {
                result = false;
            }
            lastMessagesProcessed = messagesProcessed;
            return result;
        };

        /*
         *  See that.process()
         */
        var handleError = function(error, cb) {
            var doShutdown = function() {
                var cb0 = function(err0) {
                    if (err0) {
                        $._.$.log &&
                            $._.$.log.fatal('handleError: Critical shutdown' +
                                            ' failed, exiting '
                                            + myUtils.errToPrettyStr(err0));
                         // critical shutdown failed
                        process.exit(1);
                    } else {
                        cb(null, json_rpc.reply(error));
                    }
                };
                $.ca.__ca_shutdown__(null, cb0);
            };

            var doAbort = function() {
                var cb0 = function(err0) {
                    if (err0) {
                        // abort failed, try something more drastic
                        $._.$.log &&
                            $._.$.log.error('handleError: Error in abort, ' +
                                            'force shutdown '
                                            + myUtils.errToPrettyStr(err0));
                        doShutdown();
                    } else {
                        cb(null, json_rpc.reply(error));
                    }
                };
                $.ca.__ca_abort__(cb0);
            };

            if (error.name === 'AppError') {
                $._.$.log && $._.$.log.trace('handleError: AppError aborting: '
                                             + myUtils.errToPrettyStr(error));
                doAbort();
            } else if (error.name === 'SystemError') {
                if ((error.code === ERROR_CODES.commitFailure) ||
                    (error.code === ERROR_CODES.checkpointFailure)) {
                    /* Error while committing or persisting the commit decision.
                     *
                     * Not enough to abort, force a CA shutdown.
                     *
                     * When this CA recovers from the shutdown,
                     * if the checkpoint made it to persistent
                     * storage it will redo the commit actions (*always* assumed
                     *  to be idempotent).
                     *
                     * We cannot imply that `checkpointFailure` means it did
                     * not make it to storage. That's the reason
                     * we have to shutdown, because it may have been logged as
                     * pending to be committed...
                     */
                    $._.$.log &&
                        $._.$.log.debug('handleError: SysError shutdown CA: '
                                        + myUtils.errToPrettyStr(error));
                    doShutdown();
                } else {
                    $._.$.log &&
                        $._.$.log.debug('handleError: SysError aborting: '
                                        + myUtils.errToPrettyStr(error));
                    doAbort();
                }
            } else {
                // This is a bug, all the errors should be App or System by now.
                var msg = (error && (typeof error === 'object' ?
                                     myUtils.errToPrettyStr(error) :
                                     JSON.stringify(error)));
                $._.$.log && $._.$.log.fatal('handleError: error is neither'
                                             + ' App or System ' + msg);
                process.exit(1);
            }
        };

        /**
         * Queues a message to be processed by this CA.
         *
         *  Errors during msg processing can come from:
         *
         *  1) An exception thrown during its processing.
         *  2) An error argument returned in the call method callback
         *  3) An error argument in any of the other callbacks in the pipeline.
         *
         * The general strategy to deal with errors is as follows:
         *
         *  a) Try to roll back the transaction by doing abort
         *  b) If abort fails do a shutdown of the CA
         *  c) If shutdown fails exit node.js .
         *
         * In terms of notifying the client we use the following strategy:
         *
         *  In case (1,a) treat it a system level error using `exceptionThrown`.
         *  We treat the same exceptions in the call method and in internal
         *  components. We want to encourage application/system code to not
         *  let propagate errors that way, and catch them and convert them to
         *  type 2). The carrot is that they get better reporting...
         *
         *  In case (2,a) treat it as an application level error
         * (i.e., json_rpc.appReply), this means using a tuple (i.e., array)
         * with error/data in the result field to encode node.js callback
         *  semantics.
         *
         *  In case (3,a) treat it as a system level error: For example,
         *  if any of the sub-systems returned an error in
         * the prepare phase use a `prepareFailure` error.
         *
         *  In case  (*,b) return the error as in (*,a) but log the cause of
         * the CA shutdown.
         *
         *  In case (*, c) do nothing, just log and die.
         *
         * A special case are `commitFailure` and `checkpointFailure` system
         * errors since they cannot safely abort, they can only be recovered by
         * CA shutdown.
         *
         * @param {Object} msg A message to be processed.
         * @param {caf.cb} cb A callback function to continue after
         * processing the message and to propagate a response to the caller.
         *
         *
         * @memberof! module:caf_ca/plug_ca_inqueue#
         * @alias process
         */
        that.process = function(msg, cb) {
            var cb0 = function(err, data) {
                if (err) {
                    handleError(err, cb);
                } else {
                    cb(err, data);
                }
            };
            queue.push(msg, cb0);
        };

        var super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb0) {
            if (queue.length() !== 0) {
                $._.$.log &&
                    $._.$.log.warn('Warning: shutting down CA with ' +
                                   queue.length() + ' unprocessed messages');
            }
            super__ca_shutdown__(data, cb0);
        };

        var worker = function(msg, cbTop) {
            /**
             * Wraps error into a SystemError
             */
            var toSysErrorF = function(msg, code, errorStr, cb) {
                return function(error, data) {
                    if (error) {
                        error = json_rpc.newSysError(msg, code, errorStr,
                                                     error);
                    }
                    cb(error, data);
                };
            };

            var callResponse;
            var snapshot;
            // domains may trigger multiple error calls
            var cb = myUtils
                .callJustOnce(function(err, data) {
                    $._.$.log &&
                                      $._.$.log.debug('Ignore Call >1: err:' +
                                                      myUtils
                                                      .errToPrettyStr(err) +
                                                      ' data:' +
                                                      JSON.stringify(data));
                }, cbTop);
            var dom = domain.create();
            dom.on('error', function(err) {
                $._.$.log && $._.$.log.debug('got exception in queue' +
                                                    err.toString());
                dom.dispose();
                cb(json_rpc.newSysError(msg, ERROR_CODES.exceptionThrown,
                                              'Exception in queue', err));
            });

            var mainF = function() {
                json_rpc.metaFreeze(msg);//to trust meta-data after user methods
                async.series(
                    [
                        function(cb0) {
                            messagesProcessed = messagesProcessed + 1;
                            if ($.ca.__ca_isShutdown__) {
                                // CA shutdown, abort
                                cb0(json_rpc.newSysError(msg,
                                                        ERROR_CODES.shutdownCA,
                                                        'CA shutdown'));
                            } else {
                                var cb1 = toSysErrorF(msg,
                                                      ERROR_CODES.beginFailure,
                                                      'beginFailed', cb0);
                                // notAuthorized error, client should not retry
                                var cb1Auth =
                                    toSysErrorF(msg, ERROR_CODES.notAuthorized,
                                                'Not Authorized', cb0);
                                var cb2 = function(err, data) {
                                    if (err && (err.code === ERROR_CODES
                                                .notAuthorized)) {
                                        cb1Auth(err, data);
                                    } else {
                                        cb1(err, data);
                                    }
                                };
                                $.ca.__ca_begin__(msg, cb2);
                            }
                        },
                        function(cb0) {
                            var cb1 = function(error, data) {
                                var reply = data;
                                if (!error) {
                                    reply = (json_rpc.isNotification(msg) ?
                                             null :
                                             json_rpc.reply(error, msg, data));
                                    callResponse = reply;
                                }
                                cb0(error, reply);
                            };
                            // call method
                            json_rpc.call(msg, $.ca.$.handler, cb1);
                        },
                        function(cb0) {
                            // prepare
                            var cb1 = toSysErrorF(msg,
                                                  ERROR_CODES.prepareFailure,
                                                  'prepareFailed', cb0);
                            var cb2 = function (err, data) {
                                if (err) {
                                    cb1(err);
                                } else {
                                    try {
                                        snapshot = JSON.stringify(data);
                                    } catch (ex) {
                                        err = ex;
                                    }
                                    cb1(err, snapshot);
                                }
                            };
                            $.ca.__ca_prepare__(cb2);
                        },
                        function(cb0) {
                            // update state
                            var cb1 = toSysErrorF(msg,
                                                  ERROR_CODES.checkpointFailure,
                                                  'updateState', cb0);
                            try {
                                $._.$.cp.updateState($.ca.__ca_getName__(),
                                                     snapshot, cb1);
                            } catch (ex) {
                                $._.$.log &&
                                    $._.$.log.warn('Checkpointing srv missing' +
                                                   ': snapshot:' + snapshot);
                                cb1(ex);
                            }
                        },
                        function(cb0) {
                            // commit
                            var cb1 = toSysErrorF(msg,
                                                  ERROR_CODES.commitFailure,
                                                  'commitFailure', cb0);
                            $.ca.__ca_commit__(cb1);
                        }
                    ],
                    function(error) {
                        if (error) {
                            cb(error);
                        } else {
                            cb(null, callResponse);
                        }
                    });
            };
            dom.run(mainF);
        };
        queue = async.queue(worker, 1); // serialize

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
