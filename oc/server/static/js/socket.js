define(['underscore','sockjs'],function(_) {
    return {
        open: false,
        openQueue: [],
        conn: undefined,
        init: function(loc,fopen) {
            self = this;
            this.conn = new SockJS(loc);
            fopen = fopen || function() {};
            this.conn.onopen = function() {
                self.open = true;
                fopen();
                _.each(self.openQueue,function(d) {
                    self.conn.send(d);
                });
                self.openQueue.length = 0;
            };
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
            data = JSON.stringify(payload);
            // is the connection open?
            if (!this.open)
                this.openQueue.push(data);
            else
                this.conn.send(data);
        },
        callbacks: {}
    };
});
