goog.provide('oc.Main');
goog.require('jquery');
goog.require('oc.Socket');
goog.require('oc.Category');
goog.require('oc.Nav');
goog.require('jquery.tools');
goog.require('oc.User');
goog.require('oc.Trending');
goog.require('oc.Leaderboard');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.dom.query');

/**
 *
 * @constructor
 */
oc.Main = function() {
    this.socket = new oc.Socket();
    this.user = new oc.User(this.socket);
    this.category = new oc.Category(this.socket,this.user);
    this.trending = new oc.Trending(this.category);
    this.leaderboard = new oc.Leaderboard(this.user);
};

oc.Main.prototype.start = function() {
    this.user.init();
    
    var self = this;
    this.socket.init('http://'+window.location.hostname+':8002/sock',
        function() {
            self.socket.send({'user_id':self.user.user_id,'key':self.user.key});
    });
    this.socket.send({'register':['/happening','/user/'+self.user.user_id]});
    this.socket.addCallback('authRejected',function() {
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
            var element = jQuery('<div class="item"><div class="images"><img class="bg" src="/static/images/categories/'+p.category.image+'" /><img class="avatar" src="/static/images/avatars/'+p.user.avatar_image+'" /></div><div class="text"><span class="date">'+p.date+'</span> <span class="user">'+p.user.name+'</span> '+verb+' <span class="content"><h2>'+p.title+'</h2></span></div></div>');
            element.hide();
            if (animate)
            {
     
                $('.slide_show .scroll').prepend(element);
            } else {
                $('.slide_show .scroll').prepend(element);
            }
            element.fadeIn();
            element.click(function() {
                self.category.goConversation(p.d_id);
            });
        }
    }

    this.socket.addCallback('happening',function(data) {
        if ($('.slide_show .item').size() >= 6)
        {
            $('.slide_show .item:last').fadeOut(function() {
                $(this).remove();
                createHappening(data,true);
            }); 
        } else 
            createHappening(data,true);
    });
    this.socket.addCallback('happening_init',function(data) {
        goog.array.forEach(data,function(h,i) {
            createHappening(h,false);
        });
    });

    $("#categories a").click(function() {
            var name = $(this).attr('title');
            var cat_id = $(this).attr('id');
        self.category.goCategory(name,cat_id,$(this).attr('href'));
        return false; 
    });
    // gate to another section
    $('#menu ul a').click(function() {
         $('#menu ul li a').each(function() { $(this).removeClass('active'); });
         $(this).addClass('active');

        self.socket.send({'register':['/happening','/user/'+self.user.user_id]});
        if ($(this).attr('href') == '#trending')
           self.trending.go(); 
        else if ($(this).attr('href') == '#leaderboard')
            self.leaderboard.go();
        else
        {
            oc.Nav.hideAll();
            var element = $($(this).attr('href'));
            element.show();
            oc.Nav.setTitle(element.attr('title'));
        }

        return false;
    });

    // search box
    /*
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
    */

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
            area: self.category.currentCategory.name,
            title:$("input[name='title']").val(),
            content:$("#new_conversation_box textarea").val() },
          function() {
                $("#new_conversation_box .titleField input,#new_conversation_box textarea").val('');
                $("#new_conversation_box span").show();
        });
    });
    
    var inputs = goog.dom.query("#new_conversation_box .titleField input,#new_conversation_box textarea");
    goog.array.forEach(inputs,function(i) {
        goog.events.listen(i,goog.events.EventType.FOCUSIN,function () {
            $(this).next('span').addClass('focus');
        });
        goog.events.listen(i,goog.events.EventType.FOCUSOUT,function () {
            if ($(this).val() == '')
                $(this).next('span').show();
            $(this).next('span').removeClass('focus');
        });
        goog.events.listen(i,goog.events.EventType.KEYPRESS,function () {
            $(this).next('span').hide(); 
        });
            
    });
};
var main = new oc.Main();
main.start();
