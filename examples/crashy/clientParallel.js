'use strict';
/* eslint-disable  no-console */
/*
 *  Requests issued in parallel, but the CA avoids races by serializing them.
 *
 *  In particular, the assertion in `ca_methods.js`:
 *
 *        assert(self.state.counter === (oldValue + 1));
 *
 *  is never raised.
 */

const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const async = caf_comp.async;
const myUtils = caf_comp.myUtils;
const caf_cli = caf_core.caf_cli;

/* `from` CA needs to be the same as target `ca` to enable creation, i.e.,
 only owners can create CAs.*/
const URL = 'http://root-crashy.vcap.me:3000/#from=foo-ca1&ca=foo-ca1';

const s = new caf_cli.Session(URL);

s.onopen = function() {
    async.waterfall([
        function(cb) {
            // Requests issued in parallel, but the CA serializes them
            async.times(10, function(n, cb1) {
                console.log('Issuing request: ' + n);
                s.increment('ok', cb1);
            }, cb);
        },
        function(counter, cb) {
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
    console.log('Done');
};
