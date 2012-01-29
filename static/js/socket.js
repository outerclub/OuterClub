define(['underscore','sockjs'],function(_) {
    return {
        conn: undefined,
        init: function(loc,fopen) {
            self = this;
            this.conn = new SockJS(loc);
            this.conn.onopen = fopen;
            this.conn.onmessage = function(message) {
                data = JSON.parse(message.data);
                if (data[0] in self.callbacks)
                    self.callbacks[data[0]](data[1]); 
            };
        },
        addCallback: function(name,func) {
            this.callbacks[name] = func;
        },
        send: function(payload) {
            this.conn.send(JSON.stringify(payload));
        },
        callbacks: {}
    };
});
