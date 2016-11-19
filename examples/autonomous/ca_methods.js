'use strict';

var caf = require('caf_core');

exports.methods = {
    __ca_init__: function(cb) {
        this.state.counter = 0;
        this.$.session.limitQueue(1);
        cb(null);
    },
    __ca_resume__: function(cp, cb) {
        this.$.log.debug('Resuming with counter:' + cp.state.counter);
        cb(null);
    },
    __ca_pulse__: function(cb) {
        this.state.counter = this.state.counter + 1;
        if (this.state.counter % 5 === 0) {
            this.$.log.debug('counter %5 === 0 with ' + this.state.counter);
            this.$.session.notify([this.state.counter]);
        }
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
