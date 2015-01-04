var async = require('async');
var json_rpc = require('caf_transport').json_rpc;

var hello = require('./hello/main.js');

exports.helloworld = function (test) {
    test.expect(27);
    var ca1;
    var meta = {"hello":["msg","cb"],"helloFail":["msg","cb"],
                "helloException":["msg","cb"],
                "helloDelayException":["msg","cb"],
                "getLastMessage":["cb"],"getQueueLength":["cb"]};
    hello.load(null, {name: 'ca1'}, 'ca.json', null, function(err, $) {
                   test.ifError(err);
                   test.equal(typeof($.ca1), 'object',
                              'Cannot create CA');
                   async.series([
                                    function(cb) {
                                        $.ca1.__ca_pulse__(cb);
                                    },
                                    function(cb) {
                                        test.ok($.ca1.__ca_progress__());
                                        test.equals($.ca1.__ca_getName__(),
                                                   'ca1');
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
                                            .systemRequest('ca1', 'hello' ,
                                                           'hi');

                                        $.ca1.__ca_process__(msg, cb1);
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
                                            .systemRequest('ca1',
                                                           '__external_ca_touch__');

                                        $.ca1.__ca_process__(msg, cb1);
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
                                            .systemRequest('ca1', 'helloFail' ,
                                                           'ignore');

                                        $.ca1.__ca_process__(msg, cb1);
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
                                           .systemRequest('ca1',
                                                          'getLastMessage');

                                       $.ca1.__ca_process__(msg, cb1);
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
                                            .systemRequest('ca1',
                                                           'helloException' ,
                                                           'ignore');

                                        $.ca1.__ca_process__(msg, cb1);
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
                                           .systemRequest('ca1',
                                                          'getLastMessage');

                                       $.ca1.__ca_process__(msg, cb1);
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
                                            .systemRequest('ca1',
                                                           'helloDelayException' ,
                                                           'ignore');

                                        $.ca1.__ca_process__(msg, cb1);
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
                                           .systemRequest('ca1',
                                                          'getLastMessage');

                                       $.ca1.__ca_process__(msg, cb1);
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
                                            .systemRequest('ca1',
                                                           'getQueueLength');

                                        $.ca1.__ca_process__(msg, cb1);
                                    },
                                    //destroy
                                    function(cb) {
                                        ca1 = $.ca1;
                                        var cb1 = function(err, data) {
                                            test.ifError(err);
                                            test.ok(ca1.__ca_isShutdown__);
                                            cb(null);
                                        };
                                        $.ca1.__ca_destroy__(null, cb1);
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
                                             .systemRequest('ca1',
                                                            'getQueueLength');

                                         ca1.__ca_process__(msg, cb1);
                                     }

                                ], function(err, res) {
                                    test.ifError(err);
                                    test.done();
                                });
                  });
};
