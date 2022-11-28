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

const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const myUtils = caf_comp.myUtils;
const caf_cli = caf_core.caf_cli;

/* `from` CA needs to be the same as target `ca` to enable creation, i.e.,
 *  only owners can create CAs.
 *
 *  With security on, we would need a token to authenticate `from`.
*/
const URL = 'http://root-crashy.localtest.me:3000/#from=foo-ca1&ca=foo-ca1';

const s = new caf_cli.Session(URL);

s.onopen = async function() {
    try {
        let counter = await s.getCounter().getPromise();
        console.log('Initial Count: ' + counter);
        counter = await s.increment('Really Oops').getPromise();
        console.log('BUG: Should NOT print this');
    } catch (err) {
        console.log('BUG: IT SHOULD NEVER REACH THIS POINT');
    }
};

s.onclose = function(err) {
    if (err) {
        console.log(myUtils.errToPrettyStr(err));
        console.log('Done OK');
        process.exit(1);
    }
    console.log('BUG: SHOULD ALWAYS RETURN ERROR');
};
