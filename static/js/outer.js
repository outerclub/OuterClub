var socket;
function createHappening(data,animate) {
        var p = data.data;
        if (data.type == 'response' || data.type == 'post')
        {
            var verb = 'replied in';
            if (data.type == 'post')
                verb = 'posted'; 
            var element = jQuery('<div class="item"><div class="images"><img class="bg" src="/static/images/categories/'+p.category_image+'" /><img class="avatar" src="/static/images/new/avatars/'+p.avatar+'" /></div><div class="text"><span class="date">'+p.date+'</span> <span class="user">'+p.user+'</span> '+verb+' <span class="content">'+p.title+'</span></div></div>');
            if (animate)
            {
                element.css('margin-right','-150px');
     
                $('.slide_show .scroll').append(element);
                element.animate({'margin-right':0});
            } else {
                $('.slide_show .scroll').append(element);
            }
        }
}
function init(user_id) {
    socket = new io.connect('192.168.56.101:8002/?key='+user_id,{ rememberTransport: true });
    socket.on('connect',function() {
        socket.emit('register','/happening');
    });
    socket.on('happening',function(data) {
        createHappening(data,true);
    });
    socket.on('happening_init',function(data) {
        for (var h in data) {
            createHappening(data[h],false);
        }
    });
}
