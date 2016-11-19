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

var caf_comp = require('caf_components');
var genProxy = caf_comp.gen_proxy;

exports.newInstance = function($, spec, cb) {

    var that = genProxy.constructor($, spec);

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

    Object.freeze(that);
    cb(null, that);
};
