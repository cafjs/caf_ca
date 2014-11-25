
var caf_comp = require('caf_components');
var genTransactional = caf_comp.gen_transactional;
var myUtils = caf_comp.myUtils;

/**
 * Factory method to create a goofy plugin, that fails...
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genTransactional.constructor($, spec);
        var goofyState;
        var failures = {};
        var toThrow = true;

        $._.$.log && $._.$.log.debug('New goofy object');

        that.setThrow = function(isThrown) {
            toThrow = isThrown;
        };

        that.failMethod = function(failedMethod) {
            failures[failedMethod] = true;
        };

        that.setGoofyStateImpl = function(newState, cb) {
            goofyState = newState;
            cb(null);
        };

        that.setGoofyState = function(newState) {
            that.__ca_lazyApply__("setGoofyStateImpl", newState);
        };

        that.getGoofyState = function() {
            return goofyState;
        };


           // override gen_transactional methods
        var super__ca_init__ = myUtils.superior(that, '__ca_init__');
        that.__ca_init__ = function(cb0) {
            goofyState = {};
            super__ca_init__(cb0);
        };

        var super__ca_resume__ = myUtils.superior(that, '__ca_resume__');
        that.__ca_resume__ = function(cp, cb0) {
            goofyState= cp.goofyState || {};
            super__ca_resume__(cp, cb0);
        };

        var super__ca_begin__ = myUtils.superior(that, '__ca_begin__');
        that.__ca_begin__ = function(msg, cb0) {
            super__ca_begin__(msg, function(err, data) {
                                  if (err) {
                                      cb0(err, data);
                                  } else {
                                      if (failures['__ca_begin__']) {
                                        delete failures['__ca_begin__'];
                                        var newErr =  new Error('Goofy begin');
                                          if (toThrow) {
                                              throw newErr;
                                          } else {
                                              cb0(newErr);
                                          }
                                      } else {
                                        cb0(err, data);
                                      }
                                  }
                              });
        };

        var super__ca_prepare__ = myUtils.superior(that, '__ca_prepare__');
        that.__ca_prepare__ = function(cb0) {
            super__ca_prepare__(function(err, data) {
                                if (err) {
                                    cb0(err, data);
                                } else {
                                    if (failures['__ca_prepare__']) {
                                        delete failures['__ca_prepare__'];
                                        var newErr =  new Error('Goofy prepare');
                                        if (toThrow) {
                                            throw newErr;
                                        } else {
                                            cb0(newErr);
                                        }
                                    } else {
                                        data.goofyState = goofyState;
                                        cb0(err, data);
                                    }
                                }
                            });
        };

        var super__ca_abort__ = myUtils.superior(that, '__ca_abort__');
        that.__ca_abort__ = function(cb0) {
            super__ca_abort__(function(err, data) {
                                  if (err) {
                                      cb0(err, data);
                                  } else {
                                      if (failures['__ca_abort__']) {
                                          delete failures['__ca_abort__'];
                                          var newErr = new Error('Goofy abort');
                                          if (toThrow) {
                                              throw newErr;
                                          } else {
                                              cb0(newErr);
                                          }
                                      }
                                      cb0(err, data);
                                  }
                              });
        };

        var super__ca_commit__ = myUtils.superior(that, '__ca_commit__');
        that.__ca_commit__ = function(cb0) {
            super__ca_commit__(function(err, data) {
                                  if (err) {
                                      cb0(err, data);
                                  } else {
                                      if (failures['__ca_commit__']) {
                                          delete failures['__ca_commit__'];
                                          var newErr = new Error('Goofy commit');
                                          if (toThrow) {
                                              throw newErr;
                                          } else {
                                              cb0(newErr);
                                          }
                                      }
                                      cb0(err, data);
                                  }
                              });
        };

        var super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb0) {
            super__ca_shutdown__(data, cb0);
        };

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
