'use strict';

var caf = require('caf_core');
var assert = require('assert');

exports.methods = {
    __ca_init__: function(cb) {
        this.state.counter = 0;
        cb(null);
    },
    increment: function(crash, cb) {
        var self = this;
        var oldValue = this.state.counter;
        this.state.counter = this.state.counter + 1;
        setTimeout(function() {
            if (crash === 'Oops') {
                cb(new Error('Oops'));
            } else if (crash === 'Really Oops') {
                throw new Error('Really Oops');
            } else {
                assert(self.state.counter === (oldValue + 1));
                cb(null, self.state.counter);
            }
        }, 1000);
    },
    getCounter: function(cb) {
        cb(null, this.state.counter);
    }
};

caf.init(module);
