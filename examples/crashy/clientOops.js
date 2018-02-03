'use strict';
/* eslint-disable  no-console */
/*
 *  Errors propagated in a CA callback are treated as application-level errors.
 *
 *  No attempt is made to handle them, they are just returned in the client
 * callback.
 *
 *  However, we rollback CA state changes to ensure a consistent state.
 */
var caf_core = require('caf_core');
var caf_comp = caf_core.caf_components;
var myUtils = caf_comp.myUtils;
var caf_cli = caf_core.caf_cli;

/* `from` CA needs to be the same as target `ca` to enable creation, i.e.,
 *  only owners can create CAs.
 *
 *  With security on, we would need a token to authenticate `from`.
*/
var URL = 'http://root-crashy.vcap.me:3000/#from=foo-ca1&ca=foo-ca1';

var s = new caf_cli.Session(URL);

s.onopen = async function() {
    try {
        var counter = await s.getCounter().getPromise();
        console.log('Initial Count: ' + counter);
        counter = await s.increment('Oops').getPromise();
        console.log('Should NOT print this');
    } catch (err) {
        console.log('Got error ' + myUtils.errToPrettyStr(err));
        try {
            counter = await s.getCounter().getPromise();
            console.log('Final count (should be the same as initial): ' +
                        counter);
            s.close();
        } catch (ex) {
            s.close(ex);
        }
    }
};

s.onclose = function(err) {
    if (err) {
        console.log(myUtils.errToPrettyStr(err));
        process.exit(1);
    }
    console.log('Done OK');
};
