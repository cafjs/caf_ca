var async = require('caf_components').async;
var goofy = require('./goofy/main.js');

var json_rpc = require('caf_transport').json_rpc;

var newMsg = function(sessionId, methodName) {
    var msg = json_rpc.systemRequest('ca', methodName);
    return json_rpc.request(json_rpc.getToken(msg), json_rpc.getTo(msg),
                            json_rpc.getFrom(msg), sessionId,
                            methodName);
};


var failedWithException = function(self, test, code, failedMethod, method,
                                   arg) {
    return function(cb) {
console.log('failedWithException');
        var cb1 = function(err, data) {
            test.ifError(err);
            var resp = json_rpc.getSystemErrorCode(data);
            test.equals(resp, code);
            cb(null);
        };
        var msg = json_rpc.systemRequest('ca', 'failMethodsAndApply',
                                         failedMethod, method, [arg]);
        self.$.top1.$.ca.__ca_process__(msg, cb1);
    };
};

var checkLastMessage = function(self, test, last) {
    return function(cb) {
        var cb1 = function(err, data) {
            test.ifError(err);
            var resp =
                json_rpc.getAppReplyData(data);
            test.equals(resp, last);
            cb(null);
        };
        var msg = json_rpc.systemRequest('ca', 'getLastMessage');
        self.$.top1.$.ca.__ca_process__(msg, cb1);
    };
};

var checkGoofyState  = function(self, test, last) {
    return function(cb) {
console.log('checkGoofyState');
        var cb1 = function(err, data) {
            test.ifError(err);
            var resp =
                json_rpc.getAppReplyData(data);
            test.deepEqual(resp, last);
            cb(null);
        };
        var msg = json_rpc.systemRequest('ca', 'getGoofyState');
        self.$.top1.$.ca.__ca_process__(msg, cb1);
    };
};

var app = goofy;
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
//                       test.ifError(err);
//                       test.equal(typeof($.topRedis), 'object',
//                                  'Cannot create hello');

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
                                 if (this.doDestroy && self.$.top1 &&
                                     self.$.top1.$.ca) {
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
    helloworld: function (test) {
        var self = this;
        this.doDestroy = false;//true;
        test.expect(6);
        async.series([
                         function(cb) {
                             test.equal(typeof(self.$.top1), 'object',
                                        'Cannot create hello');
                             self.$.top1.$.ca.__ca_pulse__(cb);
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
                                     json_rpc.getAppReplyError(data);
                                 test.ok(!resp);
                                 cb(null);
                             };
                             var msg = json_rpc
                                 .systemRequest('ca', 'setGoofyState' ,
                                                {p: 'hi'});

                             self.$.top1.$.ca.__ca_process__(msg, cb1);
                         }

                     ], function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    },
    failPrepare: function(test) {
        var self = this;
        this.doDestroy = true;
        test.expect(20);
        var all = [
                         //state changes unrolled with exception
            failedWithException(self, test, json_rpc.ERROR_CODES
                                .prepareFailure, ['__ca_prepare__'],
                                'hello', 'bye'),
            checkLastMessage(self, test, 'hi'),

            // state changes to plugin unrolled with exception
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                        json_rpc
                        .getSystemErrorCode(data);
                    test.equals(resp,
                                json_rpc.ERROR_CODES.
                                prepareFailure);
                    cb(null);
                };
                var msg = json_rpc
                    .systemRequest('ca', 'failMethodsAndApply' ,
                                   ['__ca_prepare__'],
                                   'setGoofyState',
                                   [{p: 'bye'}]);

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            checkGoofyState(self, test, {p: 'hi'}),

            // state changes to plugin unrolled with non-serializable state
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    var resp =
                        json_rpc
                        .getSystemErrorCode(data);
                    test.equals(resp,
                                json_rpc.ERROR_CODES.
                                prepareFailure);
                    cb(null);
                };
                var msg = json_rpc
                    .systemRequest('ca', 'noJSONSerializableState', {p: 'bye'});

                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            checkGoofyState(self, test, {p: 'hi'}),

            //state changes unrolled with error in callback
            function(cb) {
                var cb1 = function(err, data) {
                    test.ifError(err);
                    cb(null);
                };
                var msg = json_rpc
                    .systemRequest('ca', 'setThrow' , false);
                self.$.top1.$.ca.__ca_process__(msg, cb1);
            },
            failedWithException(self, test, json_rpc.ERROR_CODES
                                .prepareFailure, ['__ca_prepare__'],
                                'hello', 'bye'),

            // state changes to plugin unrolled with exception
            failedWithException(self, test, json_rpc.ERROR_CODES
                                .prepareFailure, ['__ca_prepare__'],
                                'setGoofyState', {p: 'bye'}),
            checkGoofyState(self, test, {p: 'hi'})
        ];

        async.series(all, function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    },

    failAbort: function(test) {
        var self = this;
        this.doDestroy = true;
        test.expect(5);
        var ca = self.$.top1.$.ca;
        var all = [
            failedWithException(self, test, json_rpc.ERROR_CODES
                                .exceptionThrown, ['__ca_abort__'],
                                'helloException', 'hiii'),
            function(cb) {
                test.ok(ca.__ca_isShutdown__);
                test.ok(!self.$.top1.$.ca);
                cb(null);
            }
        ];
        async.series(all, function(err, res) {
                         test.ifError(err);
                         test.done();
                     });

    },

    failCommit1a: function(test) {
        var self = this;
        this.doDestroy = false;
        test.expect(5);
        var ca = self.$.top1.$.ca;
        var all = [
            failedWithException(self, test, json_rpc.ERROR_CODES
                                .commitFailure, ['__ca_commit__'],
                                'hello', 'hiii'),
            function(cb) {
                test.ok(ca.__ca_isShutdown__);
                test.ok(!self.$.top1.$.ca);
                cb(null);
            }
        ];
        async.series(all, function(err, res) {
                         test.ifError(err);
                         test.done();
                     });

    },
    //after failCommit1a, to show changes are eventually committed
    failCommit2a: function(test) {
        var self = this;
        this.doDestroy = true;
        test.expect(3);
        var ca = self.$.top1.$.ca;
        var all = [
            checkLastMessage(self, test, 'hiii')
        ];
        async.series(all, function(err, res) {
                         test.ifError(err);
                         test.done();
                     });

    },
    // repeat commit failure with a lazy operation


    failCommit1Lazy1: function(test) {
        var self = this;
        this.doDestroy = false;
        test.expect(5);
        var ca = self.$.top1.$.ca;
        var all = [
            failedWithException(self, test, json_rpc.ERROR_CODES
                                .commitFailure, ['__ca_commit__'],
                                'setGoofyState', {p: 'hiii'}),
            function(cb) {
                test.ok(ca.__ca_isShutdown__);
                test.ok(!self.$.top1.$.ca);
                cb(null);
            }
        ];
        async.series(all, function(err, res) {
                         test.ifError(err);
                         test.done();
                     });

    },
    //after failCommit1, to show changes are eventually committed
    failCommitLazy2: function(test) {
        var self = this;
        this.doDestroy = true;
        test.expect(3);
        var ca = self.$.top1.$.ca;
        var all = [
            checkGoofyState(self, test, {p: 'hiii'})
        ];
        async.series(all, function(err, res) {
                         test.ifError(err);
                         test.done();
                     });

    },
};
