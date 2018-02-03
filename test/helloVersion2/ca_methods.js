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
var semver = require('semver');
var util = require('util');

exports.methods = {
    async __ca_init__() {
        this.$.log.debug("---------------Calling init");
        return [];
    },
    async __ca_resume__(cp) {
        this.$.log.debug("---------------Calling resume");
        return [];
    },
    async __ca_pulse__() {
        this.$.log.debug("---------------Calling pulse");
        return [];
    },
    async __ca_upgrade__(newVersion) {
        var oldVersion = this.state.__ca_version__;
        if (semver.valid(oldVersion) && semver.valid(newVersion) &&
            semver.satisfies(newVersion, '^' + oldVersion)) {
            this.$.log.debug('update: minor version:automatic update of state');
        } else {
            // do some magic to this.state
            this.$.log.debug('update: major version:done some magic to state');
        }
        this.state.__ca_version__ = newVersion;
        return [];
    },
    async hello(msg) {
        this.$.log && this.$.log.debug('Hello');
        this.state.lastMsg = msg;
        return [null, 'Bye:' + msg];
    },
    async helloNotify(msg) {
        this.$.log && this.$.log.debug('HelloNotify');
        this.state.lastMsg = msg;
        this.$.session.notify(['hello', 'planet'], 'fooSession');
        return [null, 'Bye:' + msg];
    },
    async helloNotifyFail(msg) {
        this.$.log && this.$.log.debug('HelloNotify');
        this.state.lastMsg = msg;
        this.$.session.notify(['hello', 'planet'], 'fooSession');
        var err = new Error('Something bad happened');
        return [err, 'Bye:' + msg];
    },
    async helloNotifyException(msg) {
        this.$.log && this.$.log.debug('HelloNotify');
        this.state.lastMsg = msg;
        this.$.session.notify(['helloException', 'planet'], 'fooSession');
        var f = function() {
            var err = new Error('Something really bad happened');
            throw err;
        };
        var setTimeoutPromise = util.promisify(setTimeout);
        setTimeoutPromise(100);
        f();
    },
    async helloFail(msg) {
        this.state.lastMsg = msg;
        var err = new Error('Something bad happened');
        return [err];
    },
    async helloException(msg) {
        this.state.lastMsg = msg;
        var f = function() {
            var err = new Error('Something really bad happened');
            throw err;
        };
        f();
    },
    async helloDelayException(msg) {
        this.state.lastMsg = msg;
        var f = function() {
            var err = new Error('Something really bad happened');
            throw err;
        };
        var setTimeoutPromise = util.promisify(setTimeout);
        setTimeoutPromise(100);
        f();
    },
    async getLastMessage() {
        return [null, this.state.lastMsg];
    },
    async getQueueLength() {
        return [null, this.$.inq.queueLength()];
    }
};
