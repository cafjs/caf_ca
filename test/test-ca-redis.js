var async = require('caf_components').async;
var hello = require('./helloRedis/main.js');
var helloVersion1 = require('./helloVersion1/main.js');
var helloVersion2 = require('./helloVersion2/main.js');

var json_rpc = require('caf_transport').json_rpc;

var newMsg = function(sessionId, methodName) {
    var msg = json_rpc.systemRequest('ca', methodName);
    return json_rpc.request(json_rpc.getToken(msg), json_rpc.getTo(msg),
                            json_rpc.getFrom(msg), sessionId,
                            methodName);
};

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
        test.expect(4);
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
                         }
                     ], function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    },
    // assumed executed after 'helloworld'
    resume: function (test) {
        var self = this;
        this.doDestroy = true;
        test.expect(4);
        async.series([
                         function(cb) {
                             test.equal(typeof(self.$.top1), 'object',
                                        'Cannot create hello');
                             cb(null);
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
                         }
                     ], function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    },
    // assumed executed after 'resume'
    resumeAfterDestroy: function (test) {
        var self = this;
        this.doDestroy = false;
        test.expect(4);
        async.series([
                         function(cb) {
                             test.equal(typeof(self.$.top1), 'object',
                                        'Cannot create hello');
                             cb(null);
                         },
                         // no state change
                         function(cb) {
                             var cb1 = function(err, data) {
                                 test.ifError(err);
                                 var resp =
                                     json_rpc.getAppReplyData(data);
                                 test.equals(resp, undefined);
                                 cb(null);
                             };
                             var msg = json_rpc
                                 .systemRequest('ca',
                                                'getLastMessage');
                             self.$.top1.$.ca.__ca_process__(msg, cb1);
                         }
                     ], function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    },
    // session
    session: function (test) {
        var self = this;
        this.doDestroy = false;//true;
        test.expect(16);
        async.series([
                         function(cb) {
                             test.equal(typeof(self.$.top1), 'object',
                                        'Cannot create hello');
                             var cb1 = function(err, data) {
                                 test.ifError(err);
                                 var resp =
                                     json_rpc.getAppReplyData(data);
                                 test.equals(resp, 'Bye:hi');
                                 cb(null);
                             };
                             var msg = json_rpc
                                 .systemRequest('ca', 'helloNotify' ,
                                                'hi');

                             self.$.top1.$.ca.__ca_process__(msg, cb1);
                         },
                         function(cb) {
                             var cb1 = function(err, data) {
                                 test.ifError(err);
                                 var notif =
                                     json_rpc
                                     .getMethodArgs(json_rpc
                                                    .getAppReplyData(data));
                                 test.deepEqual(notif, ['hello', 'planet']);
                                 cb(null);
                             };
                             var msg = newMsg ('fooSession', 'whatever');
                             self.$.top1.$.ca.__ca_pull__(msg, cb1);
                         },
                         function(cb) {
                             test.equal(typeof(self.$.top1), 'object',
                                        'Cannot create hello');
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
                                 .systemRequest('ca', 'helloNotifyException' ,
                                                'hi');

                             self.$.top1.$.ca.__ca_process__(msg, cb1);
                         },
                         // exception should clean up notification
                         function(cb) {
                             var cb1 = function(err, data) {
                                 test.ifError(err);
                                 var error =  json_rpc.getAppReplyError(data);
                                 test.ok(error.timeout);
                                 cb(null);
                             };
                             var msg = newMsg ('fooSession', 'whatever');
                             self.$.top1.$.ca.__ca_pull__(msg, cb1);
                         },
                         function(cb) {
                             test.equal(typeof(self.$.top1), 'object',
                                        'Cannot create hello');
                             var cb1 = function(err, data) {
                                 test.ifError(err);
                                 var resp =
                                     json_rpc.getAppReplyError(data);
                                 test.ok(resp.stack);
                                 cb(null);
                             };
                             var msg = json_rpc
                                 .systemRequest('ca', 'helloNotifyFail' ,
                                                'hi');

                             self.$.top1.$.ca.__ca_process__(msg, cb1);
                         },
                         // error should clean up notification
                         function(cb) {
                             var cb1 = function(err, data) {
                                 test.ifError(err);
                                 var error =  json_rpc.getAppReplyError(data);
                                 test.ok(error.timeout);
                                 cb(null);
                             };
                             var msg = newMsg ('fooSession', 'whatever');
                             self.$.top1.$.ca.__ca_pull__(msg, cb1);
                         }
                     ], function(err, res) {
                         test.ifError(err);
                         app = helloVersion1;
                         test.done();
                     });
    },
    // assumed after session
    MinorVersion: function (test) {
        var self = this;
        this.doDestroy = false;
        test.expect(5);
        async.series([
                         function(cb) {
                             test.equal(typeof(self.$.top1), 'object',
                                        'Cannot create hello');
                             test.equal("0.1.1", self.$.top1.$.ca.$.handler.state.__ca_version__);
                             cb(null);
                         },
                         function(cb) {
                             var cb1 = function(err, data) {
                                 test.ifError(err);
                                 var resp =
                                     json_rpc.getAppReplyData(data);
                                 test.equals(resp, 'Bye:bye');
                                 cb(null);
                             };
                             var msg = json_rpc
                                 .systemRequest('ca', 'hello' ,
                                                'bye');

                             self.$.top1.$.ca.__ca_process__(msg, cb1);
                         }
                     ], function(err, res) {
                         test.ifError(err);
                         app = hello;
                         test.done();
                     });
    },
    // assumed after MinorVersion
    NoForwardVersion:  function (test) {
        var self = this;
        this.doDestroy = false;
        test.expect(2);
        async.series([
                         function(cb) {
                             test.equal(self.$, undefined,
                                        'created hello');
                             cb(null);
                         }
                     ], function(err, res) {
                         test.ifError(err);
                         app = helloVersion2;
                         test.done();
                     });
    },
    //assumed after NoForwardVersion
    MajorVersion: function (test) {
        var self = this;
        this.doDestroy = true;
        test.expect(5);
        async.series([
                         function(cb) {
                             test.equal(typeof(self.$.top1), 'object',
                                        'Cannot create hello');
                             test.equal("0.2.0", self.$.top1.$.ca.$.handler.state.__ca_version__);
                             cb(null);
                         },
                         function(cb) {
                             var cb1 = function(err, data) {
                                 test.ifError(err);
                                 var resp =
                                     json_rpc.getAppReplyData(data);
                                 test.equals(resp, 'Bye:bye2');
                                 cb(null);
                             };
                             var msg = json_rpc
                                 .systemRequest('ca', 'hello' ,
                                                'bye2');

                             self.$.top1.$.ca.__ca_process__(msg, cb1);
                         }
                     ], function(err, res) {
                         test.ifError(err);
                         app = hello;
                         test.done();
                     });
    },

};
