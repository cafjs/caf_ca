"use strict";
var caf_comp = require('caf_components');
var genProxy = caf_comp.gen_proxy;


/**
 * Factory method to create a goofy proxy.
 *
 * @see supervisor
 */
exports.newInstance = function($, spec,  cb) {

    try {
        var that = genProxy.create($, spec);

        that.setThrow = function(isThrown) {
            $._.setThrow(isThrown);
        };

        that.failMethod = function(failedMethod) {
            $._.failMethod(failedMethod);
        };

        that.setGoofyState = function(newState) {
            $._.setGoofyState(newState);
        };

        that.getGoofyState = function() {
            return $._.getGoofyState();
        };

        Object.freeze(that);
        cb(null, that);

    } catch (ex) {
        cb(ex);
    }
};
