require.config({
    'paths': {
        'sockjs':'deps/sockjs-0.1.2.min',
        'underscore':'deps/underscore-1.3.0',
        'backbone':'deps/backbone-0.5.3',
        'jquery-tools':'deps/jquery.tools.min'
    }
});
require(['sock','underscore','category','nav','jquery-tools'],
  function(socket,_,category,nav) {
    socket.init('http://'+window.location.hostname+':8002/sock',
        {'register':'happening'});

    var createHappening = function(data,animate) {
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

    socket.addCallback('happening',function(data) {
        if ($('.slide_show .item').size() >= 6)
            $('.slide_show .item:first').remove(); 
        createHappening(data,true);
    });
    socket.addCallback('happening_init',function(data) {
        _.each(data,function(h,i) {
            createHappening(h,false);
        });
    });
    $("#trending a.entry").click(function() {
        category.goConversation($(this).attr('id'));
        return false;
    });
    $("#categories a").click(function() {
            var name = $(this).attr('title');
            var cat_id = $(this).attr('id');
        category.goCategory(name,cat_id,$(this).attr('href'));
        return false; 
    });
    $('.menu_tab a').click(function() {
        nav.go($(this).attr('href'));
        return false;
    });
    $(".header h1 a").click(function() {
        nav.go('#welcome');
        return false;
    });
    $("#category_head .right button").overlay({
        mask: {
            color: '#000',
            loadSpeed: 200,
            opacity: 0.3
        }
    });
    $("#facebox button[name='post']").click(function() {
        $.post('/post',{ area: $("#category_head .left h2").html(),title:$("input[name='title']").val(),content:$("#facebox textarea").val() });
    });
});
