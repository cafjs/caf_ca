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

var util = require('util');

exports.methods = {
    async hello(msg) {
        console.log('My name is:' + this.__ca_getName__());
        this.state.lastMsg = msg;
        return [null, 'Bye:' + msg];
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
