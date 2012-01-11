var socket;
function init(user_id) {
    socket = new io.connect('192.168.56.101:8002/?key='+user_id,{ rememberTransport: true });
    socket.on('connect',function() {
        socket.emit('register','/happening');
    });
    socket.on('happening',function(data) {
        var p = data.data;
        if (data.type == 'response' || data.type == 'post')
        {
            var element = jQuery('<div class="item"><img src="/static/images/categories/'+p.category_image+'" /><div class="text"><span class="user">'+p.user+'</span> <span class="date">'+p.date+'</span> <span class="content">'+p.content+'</span></div></div>');
            element.css('margin-right','-150px');
 
            $('.slide_show .scroll').append(element);
            element.animate({'margin-right':0});
        }
    });
}
