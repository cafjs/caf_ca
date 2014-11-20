var async = require('async');
var json_rpc = require('caf_transport');

var hello = require('./hello/main.js');

exports.helloworld = function (test) {
    test.expect(7);
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
                                    }
                                ], function(err, res) {
                                    test.ifError(err);
                                    test.done();
                                });
                  });
};
