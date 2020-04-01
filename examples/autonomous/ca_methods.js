'use strict';

const caf = require('caf_core');

exports.methods = {
    async __ca_init__() {
        this.state.counter = 0;
        this.$.session.limitQueue(1);
        return [];
    },
    async __ca_resume__(cp) {
        this.$.log.debug('Resuming with counter:' + cp.state.counter);
        return [];
    },
    async __ca_pulse__() {
        this.state.counter = this.state.counter + 1;
        if (this.state.counter % 5 === 0) {
            this.$.log.debug('counter %5 === 0 with ' + this.state.counter);
            this.$.session.notify([this.state.counter]);
        }
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
