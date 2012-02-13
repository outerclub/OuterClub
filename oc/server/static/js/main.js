goog.provide('oc.Main');
goog.require('oc.Socket');
goog.require('oc.Category.View');
goog.require('oc.Nav');
goog.require('oc.User');
goog.require('oc.Trending');
goog.require('oc.Leaderboard');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.dom.query');
goog.require('goog.style');

/**
 *
 * @constructor
 */
oc.Main = function() {
    this.socket = new oc.Socket();
    this.user = new oc.User(this.socket);
    this.categoryView = new oc.Category.View(this.socket,this.user);
    this.trending = new oc.Trending(this.categoryView.conversationView);
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
        var slideShow = goog.dom.query('.slide_show')[0];
        if (!goog.style.isElementShown(slideShow))
        {
            // TODO
            //$(".slide_show").fadeIn();
        }

        // parse the happening type
        if (data.type == 'response' || data.type == 'post')
        {
            var verb = 'replied in';
            if (data.type == 'post')
                verb = 'posted'; 
            var element = goog.dom.htmlToDocumentFragment('<div class="item"><div class="images"><img class="bg" src="/static/images/categories/'+p.category.image+'" /><img class="avatar" src="/static/images/avatars/'+p.user.avatar_image+'" /></div><div class="text"><span class="date">'+p.date+'</span> <span class="user">'+p.user.name+'</span> '+verb+' <span class="content"><h2>'+p.title+'</h2></span></div></div>');
            goog.style.showElement(element,false);
            
            var scroller = goog.dom.query('.scroll',slideShow)[0];
            goog.dom.insertChildAt(scroller,element,0);

            /* TODO
            element.fadeIn();
            element.click(function() {
                self.categoryView.goConversation(p.d_id);
            });
            */
        }
    }

    this.socket.addCallback('happening',function(data) {
        var items = goog.dom.query('.slide_show .item');
        
        if (items.length >= 6)
        {
            /* TODO
            $('.slide_show .item:last').fadeOut(function() {
                $(this).remove();
                createHappening(data,true);
            }); 
            */
        } else 
            createHappening(data,true);
    });
    this.socket.addCallback('happening_init',function(data) {
        goog.array.forEach(data,function(h,i) {
            createHappening(h,false);
        });
    });
    goog.array.forEach(goog.dom.query('#categories a'),function(category) {
        goog.events.listen(category,goog.events.EventType.CLICK,function(e) {
            var name = this.getAttribute('title');
            var cat_id = this.getAttribute('id');
            self.categoryView.goCategory(name,cat_id,this.getAttribute('href'));
            e.preventDefault();
        });
    });
    // gate to another section
    var menuItems = goog.dom.query('#menu ul a'); 
    goog.array.forEach(menuItems,function(menuItem) {
        goog.events.listen(menuItem,goog.events.EventType.CLICK,function(e) {
             goog.array.forEach(menuItems,function(i) {
                goog.dom.classes.remove(i,'active');
            });
            goog.dom.classes.add(menuItem,'active');

            self.socket.send({'register':['/happening','/user/'+self.user.user_id]});
            if (menuItem.getAttribute('href') == '#trending')
               self.trending.go(); 
            else if (menuItem.getAttribute('href') == '#leaderboard')
                self.leaderboard.go();
            else
            {
                oc.Nav.hideAll();
                var element = goog.dom.query(menuItem.getAttribute('href'))[0];
                goog.style.showElement(element,true);
                oc.Nav.setTitle(element.getAttribute('title'));
            }

            e.preventDefault();
        });
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

    /*
    * TODO
    $(".content_wrapper .heading .right button").overlay({
        mask: {
            color: '#000',
            loadSpeed: 200,
            opacity: 0.3
        }
    });
    */


    /**
      * new conversation box.
      */
    /* TODO
    $("#new_conversation_box button[name='post']").click(function() {
        $.post('/post',{
            area: self.categoryView.category.name,
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
    */
};
var main = new oc.Main();
main.start();
