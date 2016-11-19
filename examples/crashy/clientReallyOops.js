'use strict';
/* eslint-disable  no-console */
/*
 *  Uncaught exceptions in a CA method are considered bugs.
 *
 *   We close the session, and propagate the exception in the `onclose` error
 * argument.
 *
 *   Fortunately, we rolled back CA state changes, and the CA is fully
 * operational for other methods.
 */

var caf_core = require('caf_core');
var caf_comp = caf_core.caf_components;
var async = caf_comp.async;
var myUtils = caf_comp.myUtils;
var caf_cli = caf_core.caf_cli;

/* `from` CA needs to be the same as target `ca` to enable creation, i.e.,
 *  only owners can create CAs.
 *
 *  With security on, we would need a token to authenticate `from`.
*/
var URL = 'http://root-crashy.vcap.me:3000/#from=foo-ca1&ca=foo-ca1';

var s = new caf_cli.Session(URL);

s.onopen = function() {
    async.waterfall([
        function(cb) {
            s.getCounter(cb);
        },
        function(counter, cb) {
            console.log(counter);
            s.increment('Really Oops', cb);
        },
    ], function(err, counter) {
        console.log('BUG: IT SHOULD NEVER REACH THIS POINT');
    });
};

s.onclose = function(err) {
    if (err) {
        console.log(myUtils.errToPrettyStr(err));
        console.log('Done OK');
        process.exit(1);
    }
    console.log('BUG: SHOULD ALWAYS RETURN ERROR');
};
