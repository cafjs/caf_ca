/*!
Copyright 2014 Hewlett-Packard Development Company, L.P.

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
 * Main package module.
 *
 * @module caf_ca/main
 *
 */

/* eslint-disable max-len */
/**
 * @external caf_components/gen_transactional
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_transactional.html}
 */

/**
 * @external caf_components/gen_plug_ca
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_plug_ca.html}
 */

/**
 * @external caf_components/gen_proxy
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_proxy.html}
 */

/**
 * @external caf_cli
 * @see {@link https://cafjs.github.io/api/caf_cli/index.html}
 */

/**
 * @external caf_session
 * @see {@link https://cafjs.github.io/api/caf_session/index.html}
 */

/**
 * @external caf_security
 * @see {@link https://cafjs.github.io/api/caf_security/index.html}
 */

/**
 * @external caf_sharing
 * @see {@link https://cafjs.github.io/api/caf_sharing/index.html}
 */

/**
 * @external caf_pubsub
 * @see {@link https://cafjs.github.io/api/caf_pubsub/index.html}
 */


/**
 * @external caf_components
 * @see {@link https://cafjs.github.io/api/caf_components/index.html}
 */
/* eslint-enable max-len */

exports.ca_main = require('./ca_main');
exports.plug_ca_inqueue = require('./plug_ca_inqueue');
exports.proxy_inqueue = require('./proxy_inqueue');
exports.plug_ca_handler = require('./plug_ca_handler');
exports.proxy_handler = require('./proxy_handler');

// external packages
exports.semver = require('semver');

// module

/**
 * Exports the `module` for this package.
 *
 * @return {Object} A `module` for this package.
 *
 * @memberof! module:caf_ca/main
 * @alias getModule
 */
exports.getModule = function() {
    return module;
};
