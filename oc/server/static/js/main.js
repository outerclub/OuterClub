require.config({
    'paths': {
        'sockjs':'deps/sockjs-0.1.2.min',
        'underscore':'deps/underscore-1.3.0',
        'backbone':'deps/backbone-0.5.3',
        'jquery-tools':'deps/jquery.tools.min'
    }
});
require(['socket','underscore','category','nav','jquery-tools','user'],
  function(socket,_,category,nav,__,user) {
    user.init();
    socket.init('http://'+window.location.hostname+':8002/sock',
        function() {
            socket.send({'user_id':user.user_id,'key':user.key});
    });
    socket.send({'register':['/happening','/user/'+user.user_id]});
    socket.addCallback('authRejected',function() {
        window.location = '/logout';
    });

    var createHappening = function(data,animate) {
        var p = data.data;
        if (data.type == 'response' || data.type == 'post')
        {
            var verb = 'replied in';
            if (data.type == 'post')
                verb = 'posted'; 
            var element = jQuery('<div class="item"><div class="images"><img class="bg" src="/static/images/categories/'+p.category_image+'" /><img class="avatar" src="/static/images/new/avatars/'+p.user.avatar_image+'" /></div><div class="text"><span class="date">'+p.date+'</span> <span class="user">'+p.user.name+'</span> '+verb+' <span class="content">'+p.title+'</span></div></div>');
            element.hide();
            if (animate)
            {
     
                $('.slide_show .scroll').prepend(element);
            } else {
                $('.slide_show .scroll').prepend(element);
            }
            element.fadeIn();
            element.click(function() {
                category.goConversation(p.d_id);
            });
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
    // navigate to another section
    $('#menu ul a').click(function() {
        socket.send({'register':['/happening','/user/'+user.user_id]});
        nav.go($(this).attr('href'));
        return false;
    });

    // search box
    $("#menu input").focusin(function() {
        $(this).next('span').addClass('light');
    });
    $("#menu input").focusout(function() {
        if ($(this).val() == '')
            $(this).next('span').show();
        $(this).next('span').removeClass('light');
    });
    $("#menu input").keypress(function() {
        $(this).next('span').hide();
    });
    $("#menu .search span").mousedown(function() {
        $(this).prev('input').focus();
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
        $.post('/post',{ area: category.currentCategory.name,title:$("input[name='title']").val(),content:$("#facebox textarea").val() });
    });
});
