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
 * A proxy that allows read-only access to properties common to all CAs.
 *
 * By convention this proxy is called `props`.
 *
 * This means that a property  like `stateVersion`, defined in `ca.json`, can
 * be accessed as:
 *
 *    `this.$.props.stateVersion`
 *
 * from application code.
 *
 * @module caf_ca/proxy_handler
 * @augments external:caf_components/gen_proxy
 *
 */
// @ts-ignore: augments not attached to a class

const caf_comp = require('caf_components');
const genProxy = caf_comp.gen_proxy;

exports.newInstance = async function($, spec) {

    const that = genProxy.create($, spec);

    Object.keys(spec.env || {})
        .forEach(function(x) {
            that[x] = spec.env[x]; // assumed immutable
        });

    Object.freeze(that);
    return [null, that];
};
