goog.provide('oc.Socket');
goog.require('goog.array');
goog.require('goog.json');

/**
 * @constructor
 */
oc.Socket = function() {
    this.open =  false;
    this.openQueue = [];
    this.conn = undefined;
    this.callbacks = {}
};

/**
 * @param {string} loc
 * @param {function()} fopen
 */
oc.Socket.prototype.init = function(loc,fopen) {
    var self = this;
    this.conn = new window['SockJS'](loc);
    fopen = fopen || function() {};
    this.conn.onopen = function() {
        self.open = true;
        fopen();
        goog.array.forEach(self.openQueue,function(d) {
            self.conn.send(d);
        });
        self.openQueue.length = 0;
    };
    this.conn.onmessage = function(message) {
        var data = goog.json.parse(message.data);
        if (data[0] in self.callbacks)
            self.callbacks[data[0]](data[1]); 
    };
};

/**
 * @param {string} name
 * @param {function(Object)} func
 */
oc.Socket.prototype.addCallback = function(name,func) {
    this.callbacks[name] = func;
};

/**
 * @param {Object} payload
 */
oc.Socket.prototype.send= function(payload) {
    var data = goog.json.serialize(payload);
    // is the connection open?
    if (!this.open)
        this.openQueue.push(data);
    else
        this.conn.send(data);
};
