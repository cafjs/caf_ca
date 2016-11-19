'use strict';
/* eslint-disable  no-console */

var caf_core = require('caf_core');
var json_rpc = caf_core.caf_transport.json_rpc;
var caf_comp = caf_core.caf_components;
var async = caf_comp.async;
var myUtils = caf_comp.myUtils;
var caf_cli = caf_core.caf_cli;

/* `from` CA needs to be the same as target `ca` to enable creation, i.e.,
 *  only owners can create CAs.
 *
 *  With security on, we would need a token to authenticate `from`.
 */
var URL = 'http://root-autonomous.vcap.me:3000/#from=foo-ca1&ca=foo-ca1';

var s = new caf_cli.Session(URL);

var maxMessages = 3;

s.onopen = function() {
    async.waterfall([
        function(cb) {
            s.increment(cb);
        },
        function(counter, cb) {
            console.log(counter);
            s.increment(cb);
        },
        function(counter, cb) {
            console.log(counter);
            s.getCounter(cb);
        },
    ], function(err, counter) {
        if (err) {
            console.log(myUtils.errToPrettyStr(err));
        } else {
            console.log('Final count:' + counter);
        }
    });
};

s.onmessage = function(msg) {
    var counter = json_rpc.getMethodArgs(msg)[0];
    console.log('Got counter:' + counter);
    maxMessages = maxMessages - 1;
    if (maxMessages <= 0) {
        s.close();
    }
};

s.onclose = function(err) {
    if (err) {
        console.log(myUtils.errToPrettyStr(err));
        process.exit(1);
    }
    console.log('Done OK');
};
