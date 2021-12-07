var async = require('caf_components').async;
var json_rpc = require('caf_transport').json_rpc;

var hello = require('./hello/main.js');


var app = hello;
module.exports = {
    setUp: function (cb) {
        var self = this;
        app.load(null, {name: 'top1'}, 'all.json', null,
                 function(err, $) {
                     if (err) {
                         console.log('setUP Error' + err);
                         console.log('setUP Error $' + $);
                         // ignore errors here, check in method
                         cb(null);
                     } else {
                         self.$ = $;
                         cb(err, $);
                     }
                 });
    },

    tearDown: function (cb) {
        var self = this;
        if (!this.$) {
            cb(null);
        } else {
            async.series([
                function(cb0) {
                    if (this.doDestroy && self.$.top1 && self.$.top1.$.ca) {
                        self.$.top1.$.ca.__ca_destroy__(null, cb0);
                    } else {
                        cb0(null);
                    }
                },
                function(cb0) {
                    if ( self.$.top1) {
                        self.$.top1.__ca_shutdown__(null, cb0);
                    } else {
                        cb0(null);
                    }
                }
            ], cb);
        }
    },

    helloworld : function (test) {
        test.expect(29);
        var self = this;
        var ca1;
        var meta = {"hello":["msg"],"helloFail":["msg"],
                "helloException":["msg"],
                "helloDelayException":["msg"],
                    "getLastMessage":[],"getQueueLength":[],
                    "delayMethod": ['value'],
                    "delayMethodImpl": ['value'],
                    "getLastValue": [],
                    "__external_ca_touch__": [],
                    "__external_ca_multi__": [ 'multiArgs' ],
                    "__external_ca_destroy__": [ 'data' ]
                   };

        test.equal(typeof(self.$.top1.$.ca), 'object',
                   'Cannot create CA');
        async.series([
            function(cb) {
                self.$.top1.$.ca.__ca_pulse__(cb);
            },
            function(cb) {
                test.ok(self.$.top1.$.ca.__ca_progress__());
                test.equals(self.$.top1.$.ca.__ca_getName__(),
                            'ca');
                cb(null);
            },
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                            json_rpc.getAppReplyData(data);
                    test.equals(resp, 'Bye:hi');
                    cb(null);
                };
                var msg = json_rpc
                        .systemRequest('ca', 'hello' ,
                                       'hi');

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                            json_rpc.getAppReplyData(data);
                    console.log(JSON.stringify(resp));
                    test.deepEqual(meta, resp);
                    cb(null);
                };
                var msg = json_rpc
                        .systemRequest('ca',
                                       '__external_ca_touch__');

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },

            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                            json_rpc.getAppReplyError(data);
                    console.log(JSON.stringify(resp));
                    test.ok(resp.stack);
                    cb(null);
                };
                var msg = json_rpc
                        .systemRequest('ca', 'helloFail' ,
                                       'ignore');

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            // no state change
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                            json_rpc.getAppReplyData(data);
                    test.equals(resp, 'hi');
                    cb(null);
                };
                var msg = json_rpc
                        .systemRequest('ca',
                                       'getLastMessage');

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            // exception thrown
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                            json_rpc
                            .getSystemErrorCode(data);
                    console.log(JSON.stringify(resp));
                    test.equals(resp,
                                json_rpc.ERROR_CODES.
                                exceptionThrown);
                    cb(null);
                };
                var msg = json_rpc
                        .systemRequest('ca',
                                       'helloException' ,
                                       'ignore');

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            // no state change
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                            json_rpc.getAppReplyData(data);
                    test.equals(resp, 'hi');
                    cb(null);
                };
                var msg = json_rpc
                        .systemRequest('ca',
                                       'getLastMessage');

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            // exception thrown background
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                            json_rpc
                            .getSystemErrorCode(data);
                    console.log(JSON.stringify(resp));
                    test.equals(resp,
                                json_rpc.ERROR_CODES.
                                exceptionThrown);
                    cb(null);
                };
                var msg = json_rpc
                        .systemRequest('ca',
                                       'helloDelayException' ,
                                       'ignore');

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            // no state change
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                            json_rpc.getAppReplyData(data);
                    test.equals(resp, 'hi');
                    cb(null);
                };
                var msg = json_rpc
                        .systemRequest('ca',
                                       'getLastMessage');

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            // queue
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                            json_rpc
                            .getAppReplyData(data);
                    console.log(JSON.stringify(resp));
                    test.equals(resp, 0);
                    cb(null);
                };
                var msg = json_rpc
                        .systemRequest('ca',
                                       'getQueueLength');

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            // delay method
            function(cb) {
                 const cb1 = function(err, data) {
                    test.ifError(err);
                    cb(null);
                };
                const msg = json_rpc.systemRequest('ca', 'delayMethod',
                                                   'myvalue');
                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            function(cb) {
                setTimeout(() => cb(null), 1000);
            },
            function(cb) {
                const cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                            json_rpc
                            .getAppReplyData(data);
                    console.log(JSON.stringify(resp));
                    test.equals(resp, 'myvalue');
                    cb(null);
                };
                const msg = json_rpc.systemRequest('ca', 'getLastValue');

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            //destroy
            function(cb) {
                ca1 = self.$.top1.$.ca;
                var cb1 = function(err, data) {
                    test.ifError(err);
                    test.ok(ca1.__ca_isShutdown__);
                    cb(null);
                };
                self.$.top1.$.ca.__ca_destroy__(null, cb1);
            },
            // fail on shutdown
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                            json_rpc
                            .getSystemErrorCode(data);
                    console.log(JSON.stringify(resp));
                    test.equals(resp,
                                json_rpc.ERROR_CODES.
                                shutdownCA);
                    cb(null);
                };
                var msg = json_rpc
                        .systemRequest('ca',
                                       'getQueueLength');

                ca1.__ca_process__(msg, cb1);
            }
        ], function(err, res) {
            test.ifError(err);
            test.done();
        });
    }
};
