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
    "__ca_init__" : function(cb) {
        this.$.log.debug("++++++++++++++++Calling init");
        cb(null);
    },
    "__ca_resume__" : function(cp, cb) {
        this.$.log.debug("++++++++++++++++Calling resume");
        cb(null);
    },
    "__ca_pulse__" : function(cb) {
        this.$.log.debug("++++++++++++++++Calling pulse");
        cb(null);
    },
    hello: function(msg, cb) {
        this.$.log && this.$.log.debug('Hello');
        this.state.lastMsg = msg;
        cb(null, 'Bye:' + msg);
    },
    helloNotify: function(msg, cb) {
        this.$.log && this.$.log.debug('HelloNotify');
        this.state.lastMsg = msg;
        this.$.session.notify(['hello', 'planet'], 'fooSession');
        cb(null, 'Bye:' + msg);
    },
    helloNotifyFail: function(msg, cb) {
        this.$.log && this.$.log.debug('HelloNotify');
        this.state.lastMsg = msg;
        this.$.session.notify(['hello', 'planet'], 'fooSession');
        var err = new Error('Something bad happened');
        cb(err, 'Bye:' + msg);
    },
    helloNotifyException: function(msg, cb) {
        this.$.log && this.$.log.debug('HelloNotify');
        this.state.lastMsg = msg;
        this.$.session.notify(['helloException', 'planet'], 'fooSession');
        var f = function() {
            var err = new Error('Something really bad happened');
            throw err;
        };
        setTimeout(f, 100);
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
    getGoofyState: function(cb) {
        cb(null, this.$.goofy.getGoofyState());
    },
    setGoofyState: function(newState, cb) {
        this.$.goofy.setGoofyState(newState);
        cb(null);
    },
    noJSONSerializableState: function(newState, cb) {
        var p = {};
        p.x = p; // circular non-serializable
        this.state.noSerializable = p;
        this.$.goofy.setGoofyState(newState);
        cb(null);
    },
    setThrow: function(isThrown, cb) {
        this.$.goofy.setThrow(isThrown);
        cb(null);
    },
    failMethodsAndApply: function(failM, executeM, args, cb) {
        var self = this;
        Array.isArray(failM) &&
            failM.forEach(function(x) {
                              self.$.goofy.failMethod(x);
                          });
        if (typeof executeM === 'string') {
            args.push(cb);
            this[executeM].apply(this, args);
        } else {
            cb(null);
        }
    }
};
