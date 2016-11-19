'use strict';
var semver = require('semver');
var caf = require('caf_core');

exports.methods = {
    __ca_init__: function(cb) {
        this.state.myCounter = 0;
        cb(null);
    },
    __ca_upgrade__: function(newVersion, cb) {
        var oldVersion = this.state.__ca_version__;
        if (semver.valid(oldVersion) && semver.valid(newVersion) &&
            semver.satisfies(newVersion, '^' + oldVersion)) {
            this.$.log.debug('update: minor version:automatic update of state');
        } else {
            // do some magic to this.state
            this.$.log.debug('update: major version mismatch ' + newVersion );
            this.state.myCounter = this.state.counter;
            delete this.state.counter;
        }
        this.state.__ca_version__ = newVersion;
        cb(null);
    },
     increment: function(cb) {
        this.state.myCounter = this.state.myCounter + 1;
        cb(null, this.state.myCounter);
    },
    getCounter: function(cb) {
        cb(null, this.state.myCounter);
    }
};

caf.init(module);
