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
 * A handler object that wraps all the application methods of a CA.
 *
 * @name plug_ca_handler
 * @namespace
 * @augments gen_handler
 *
 */
var genHandler = require('./gen_handler');
var caf_comp = require('caf_components');

/**
 * Factory method to create a handler object.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genHandler.constructor($, spec);

        $._.$.log && $._.$.log.debug('New handler object');

        // make proxies visible to application code
        Object.keys($.ca.$).forEach(function(compName) {
                                        var comp = $.ca.$[compName];
                                        if (comp.__ca_isPlugCA__) {
                                            that.$[compName] = comp.$.proxy;
                                        }
                                    });

        // Make CA name visible
        that.__ca_getName__ = function() {
            return  $.ca.__ca_getName__();
        };

        //Object.seal(that); // need to add first_message methods
        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
