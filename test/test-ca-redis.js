var async = require('async');
var hello = require('./helloRedis/main.js');
var json_rpc = require('caf_transport');

var newMsg = function(sessionId, methodName) {
    var msg = json_rpc.systemRequest('ca', methodName);
    return json_rpc.request(json_rpc.getToken(msg), json_rpc.getTo(msg),
                            json_rpc.getFrom(msg), sessionId,
                            methodName);
};

module.exports = {
    setUp: function (cb) {
        var self = this;
        hello.load(null, {name: 'top1'}, 'all.json', null,
                   function(err, $) {
                       self.$ = $;
//                       test.ifError(err);
//                       test.equal(typeof($.topRedis), 'object',
//                                  'Cannot create hello');

                       cb(err, $);
                   });
    },
    tearDown: function (cb) {
        var self = this;
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
        test.expect(6);
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
                         }

                     ], function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    },

};
