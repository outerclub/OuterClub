define(['underscore','socket','jquery'],function(_,socket,__) {
    return {
        user_id: undefined,
        key: undefined,
        init: function() {
             var self = this;
             // extract the user_id and key from the cookies
             _.each(document.cookie.split("; "),function(cookie) {
                var spl = cookie.split('=');
                if (spl[0] == 'user_id')
                    self.user_id = spl[1];
                else if (spl[0] == 'key')
                    self.key = spl[1];
            });
            socket.addCallback('user',function(u) {
                $("#profile .prestige").fadeOut(function() {
                    $(this).html(u.prestige);
                    $(this).css('color','yellow');
                    $(this).fadeIn(function() {
                    });
                    
                });
            }); 
        }
    }
});
