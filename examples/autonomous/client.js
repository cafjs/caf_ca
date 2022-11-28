'use strict';
/* eslint-disable  no-console */

const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const myUtils = caf_comp.myUtils;
const caf_cli = caf_core.caf_cli;

/* `from` CA needs to be the same as target `ca` to enable creation, i.e.,
 *  only owners can create CAs.
 *
 *  With security on, we would need a token to authenticate `from`.
 */
const URL = 'http://root-autonomous.localtest.me:3000/#from=foo-ca1&ca=foo-ca1';

const s = new caf_cli.Session(URL);

let maxMessages = 3;

s.onopen = async function() {
    try {
        let counter = await s.increment().getPromise();
        console.log(counter);
        counter = await s.increment().getPromise();
        console.log(counter);
        counter = await s.getCounter().getPromise();
        console.log('Last count:' + counter);
    } catch (err) {
        s.close(err);
    }
};

s.onmessage = function(msg) {
    const counter = caf_cli.getMethodArgs(msg)[0];
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
