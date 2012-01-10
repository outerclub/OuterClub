var socket;
function init(user_id) {
    socket = new io.connect('192.168.56.101:8002/?key='+user_id,{ rememberTransport: true });
    socket.on('connect',function() {
        socket.emit('register','/happening');
    });
    socket.on('happening',function(data) {
        $('.slide_show_content').append(data.type);
    });
}
