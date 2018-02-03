'use strict';
/* eslint-disable  no-console */

var caf_core = require('caf_core');
var caf_comp = caf_core.caf_components;
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

s.onopen = async function() {
    try {
        var counter = await s.increment().getPromise();
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
    var counter = caf_cli.getMethodArgs(msg)[0];
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
