'use strict';

var caf = require('caf_core');

exports.methods = {
    __ca_init__: function(cb) {
        this.state.counter = 0;
        cb(null);
    },
    increment: function(cb) {
        this.state.counter = this.state.counter + 1;
        cb(null, this.state.counter);
    },
    getCounter: function(cb) {
        cb(null, this.state.counter);
    }
};

caf.init(module);
