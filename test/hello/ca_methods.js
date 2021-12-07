// Modifications copyright 2020 Caf.js Labs and contributors
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

exports.methods = {
    hello: function(msg, cb) {
        console.log('My name is:' + this.__ca_getName__());
        this.state.lastMsg = msg;
        cb(null, 'Bye:' + msg);
    },
    helloFail: function(msg, cb) {
        this.state.lastMsg = msg;
        var err = new Error('Something bad happened');
        cb(err);
    },
    helloException: function(msg, cb) {
        this.state.lastMsg = msg;
        var f = function() {
            var err = new Error('Something really bad happened');
            throw err;
        };
        f();
    },
    helloDelayException: function(msg, cb) {
        this.state.lastMsg = msg;
        var f = function() {
            var err = new Error('Something really bad happened');
            throw err;
        };
        setTimeout(f, 100);
    },
    getLastMessage: function(cb) {
        cb(null, this.state.lastMsg);
    },
    getQueueLength: function(cb) {
        cb(null, this.$.inq.queueLength());
    },
    delayMethod: function(value, cb) {
        this.$.inq.delayMethod('delayMethodImpl', [value], 900);
        cb(null);
    },
    delayMethodImpl: function(value, cb) {
        this.state.lastValue = value;
        cb(null);
    },
    getLastValue: function(cb) {
        cb(null, this.state.lastValue);
    }
};
