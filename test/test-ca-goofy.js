var async = require('async');
var goofy = require('./goofy/main.js');

var json_rpc = require('caf_transport');

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
                                         [failedMethod], method, [arg]);
        self.$.top1.$.ca.__ca_process__(msg, cb1);
    };
};

var checkLastMessage = function(self, test, last) {
    return function(cb) {
console.log('checkLastMessage');
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
            if (this.doDestroy) {
                async.series([
                                 function(cb0) {
                                     self.$.top1.$.ca.__ca_destroy__(null, cb0);
                                 },
                                 function(cb0) {
                                     self.$.top1.__ca_shutdown__(null, cb0);
                                 }
                             ], cb);
            } else {
                this.$.top1.__ca_shutdown__(null, cb);
            }
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
        test.expect(16);
        var all = [
                         //state changes unrolled with exception
            failedWithException(self, test, json_rpc.ERROR_CODES
                                .exceptionThrown, '__ca_prepare__',
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
                                exceptionThrown);
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
                                .prepareFailure, '__ca_prepare__',
                                'hello', 'bye'),

            // state changes to plugin unrolled with exception
            failedWithException(self, test, json_rpc.ERROR_CODES
                                .prepareFailure, '__ca_prepare__',
                                'setGoofyState', {p: 'bye'}),
            checkGoofyState(self, test, {p: 'hi'})
        ];

        async.series(all, function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    },
};
