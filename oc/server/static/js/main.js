require.config({
    'paths': {
        'sockjs':'deps/sockjs-0.1.2.min',
        'underscore':'deps/underscore-1.3.0',
        'backbone':'deps/backbone-0.5.3',
        'jquery-tools':'deps/jquery.tools.min'
    }
});
require(['socket','underscore','category','nav','jquery-tools','user','trending','leaderboard'],
  function(socket,_,category,nav,__,user,trending,leaderboard) {
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

        // is the happening now bar shown?
        if (!$(".slide_show").is(":visible"))
            $(".slide_show").fadeIn();

        // parse the happening type
        if (data.type == 'response' || data.type == 'post')
        {
            var verb = 'replied in';
            if (data.type == 'post')
                verb = 'posted'; 
            var element = jQuery('<div class="item"><div class="images"><img class="bg" src="/static/images/categories/'+p.category_image+'" /><img class="avatar" src="/static/images/avatars/'+p.user.avatar_image+'" /></div><div class="text"><span class="date">'+p.date+'</span> <span class="user">'+p.user.name+'</span> '+verb+' <span class="content"><h2>'+p.title+'</h2></span></div></div>');
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
        {
            $('.slide_show .item:last').fadeOut(function() {
                $(this).remove();
                createHappening(data,true);
            }); 
        } else 
            createHappening(data,true);
    });
    socket.addCallback('happening_init',function(data) {
        _.each(data,function(h,i) {
            createHappening(h,false);
        });
    });

    $("#categories a").click(function() {
            var name = $(this).attr('title');
            var cat_id = $(this).attr('id');
        category.goCategory(name,cat_id,$(this).attr('href'));
        return false; 
    });
    // navigate to another section
    $('#menu ul a').click(function() {
         $('#menu ul li a').each(function() { $(this).removeClass('active'); });
         $(this).addClass('active');

        socket.send({'register':['/happening','/user/'+user.user_id]});
        if ($(this).attr('href') == '#trending')
           trending.go(); 
        else if ($(this).attr('href') == '#leaderboard')
            leaderboard.go();
        else
        {
            nav.hideAll();
            var element = $($(this).attr('href'));
            element.show();
            nav.setTitle(element.attr('title'));
        }

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

    $(".content_wrapper .heading .right button").overlay({
        mask: {
            color: '#000',
            loadSpeed: 200,
            opacity: 0.3
        }
    });


    /**
      * new conversation box.
      */
    $("#new_conversation_box button[name='post']").click(function() {
        $.post('/post',{
            area: category.currentCategory.name,
            title:$("input[name='title']").val(),
            content:$("#new_conversation_box textarea").val() },
          function() {
                $("#new_conversation_box .titleField input,#new_conversation_box textarea").val('');
                $("#new_conversation_box span").show();
        });
    });
    $("#new_conversation_box .titleField input,#new_conversation_box textarea").focusin(function() {
        $(this).next('span').addClass('focus');
    });
    $("#new_conversation_box .titleField input,#new_conversation_box textarea").focusout(function() {
        if ($(this).val() == '')
            $(this).next('span').show();
        $(this).next('span').removeClass('focus');
    });
    $("#new_conversation_box .titleField input, #new_conversation_box textarea").keypress(function() {
        $(this).next('span').hide(); 
            
    });
});
