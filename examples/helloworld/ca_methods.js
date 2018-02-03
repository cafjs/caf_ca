'use strict';

var caf = require('caf_core');

exports.methods = {
    async __ca_init__() {
        this.state.counter = 0;
        return [];
    },
    async increment() {
        this.state.counter = this.state.counter + 1;
        return [null, this.state.counter];
    },
    async getCounter() {
        return [null, this.state.counter];
    }
};

caf.init(module);
