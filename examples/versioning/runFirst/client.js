'use strict';
/* eslint-disable  no-console */

const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const async = caf_comp.async;
const myUtils = caf_comp.myUtils;
const caf_cli = caf_core.caf_cli;

/* `from` CA needs to be the same as target `ca` to enable creation, i.e.,
 *  only owners can create CAs.
 *
 *  With security on, we would need a token to authenticate `from`.
 */
const URL = 'http://root-versioning.vcap.me:3000/#from=foo-ca1&ca=foo-ca1';

const s = new caf_cli.Session(URL);

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
            s.increment(cb);
        },
        function(counter, cb) {
            console.log(counter);
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
            s.close();
        }
    });
};

s.onclose = function(err) {
    if (err) {
        console.log(myUtils.errToPrettyStr(err));
        process.exit(1);
    }
    console.log('Done OK');
};
