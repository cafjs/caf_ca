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
 * A proxy that allows a CA to access its input queue.
 *
 * @module caf_ca/proxy_inqueue
 * @augments external:caf_components/gen_proxy
 *
 */
// @ts-ignore: augments not attached to a class

const caf_comp = require('caf_components');
const genProxy = caf_comp.gen_proxy;

exports.newInstance = async function($, spec) {

    const that = genProxy.create($, spec);

    /**
     * Gets the number of pending messages in the input queue.
     *
     * @return {number} The number of messages in the input queue.
     *
     * @memberof! module:caf_ca/proxy_inqueue#
     * @alias queueLength
     */
    that.queueLength = function() {
        return $._.getQueue().length();

    };

    /**
     * Queues a method for future execution.
     *
     * The method may be invoked multiple times when there are failures.
     * Aborting the current request deletes the scheduled method.
     *
     * The message input queue is not transactional, or checkpointed, so method
     * execution is always "best effort", i.e., may be lost "in the network"...
     *
     * There are also no hard guarantees when the method will execute.
     * Depending on the size of the queue, it could take much longer than the
     * requested delay.
     *
     * The method will execute within its own system request. We can invoke
     * private  methods, i.e., with prefix `__ca_`, and the authorization
     * checks are bypassed.
     *
     * WARNING: Using a client-provided method name gives **full privileges**
     * to the client! Not a good idea...
     *
     * @param {string} methodName The method to be invoked.
     * @param {Array<jsonType>} args The arguments to the method.
     * @param {number=} delay A **minimum** delay in milliseconds to start the
     * method. If missing, the request will get queued immediately.
     *
     * @memberof! module:caf_ca/proxy_inqueue#
     * @alias delayMethod
     */
    that.delayMethod = function(methodName, args, delay) {
        $._.delayMethod(methodName, args, delay || 0);
    };


    Object.freeze(that);
    return [null, that];
};
