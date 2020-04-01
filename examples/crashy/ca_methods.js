'use strict';

const caf = require('caf_core');
const assert = require('assert');
const util = require('util');

const setTimeoutPromise = util.promisify(setTimeout);

exports.methods = {
    async __ca_init__() {
        this.state.counter = 0;
        return [];
    },
    async increment(crash) {
        const oldValue = this.state.counter;
        this.state.counter = this.state.counter + 1;
        await setTimeoutPromise(1000);
        if (crash === 'Oops') {
            return [new Error('Oops')];
        } else if (crash === 'Really Oops') {
            throw new Error('Really Oops');
        } else {
            assert(this.state.counter === (oldValue + 1));
            return [null, this.state.counter];
        }
    },
    async getCounter() {
        return [null, this.state.counter];
    }
};

caf.init(module);
