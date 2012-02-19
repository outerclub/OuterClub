goog.provide('oc.Main');

goog.require('oc.Socket');
goog.require('oc.Category.View');
goog.require('oc.Nav');
goog.require('oc.User');
goog.require('oc.User.View');
goog.require('oc.Trending');
goog.require('oc.Leaderboard');
goog.require('oc.overlay');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.dom');
goog.require('goog.dom.query');
goog.require('goog.dom.classes');
goog.require('goog.fx.dom');
goog.require('goog.fx.Transition');
goog.require('goog.style');
goog.require('goog.net.XhrIo');
goog.require('goog.uri.utils');
goog.require('oc.Templates.Main');

/**
 *
 * @constructor
 */
oc.Main = function() {
    /**
     * @type {oc.Socket}
     */
    this.socket = new oc.Socket();

    /**
     * @type {oc.User.View}
     */
    this.userView = new oc.User.View(this.socket);

    /**
     * @type {oc.Category.View}
     */
    this.categoryView = new oc.Category.View(this.socket,this.userView);

    /**
     * @type {oc.Trending}
     */
    this.trending = new oc.Trending(this.categoryView.conversationView);

    /**
     * @type {oc.Leaderboard}
     */
    this.leaderboard = new oc.Leaderboard(this.userView);
};

oc.Main.prototype.start = function() {
    this.userView.init();
    
    var self = this;
    this.socket.addCallback('authRejected',function() {
        window.location = '/logout';
    });

    var slideShow = goog.dom.query('.slide_show')[0];
    goog.style.showElement(slideShow,false);

    /**
     * @param {Object} data
     * @param {boolean} animate
     */
    var createHappening = function(data,animate) {
        var p = data.data;

        // is the happening now bar shown?
        if (!goog.style.isElementShown(slideShow))
        {
            (new goog.fx.dom.FadeInAndShow(slideShow,500)).play();
        }

        // parse the happening type
        var html = oc.Templates.Main.happening({
                user:oc.User.extractFromJson(p['user']),
                category_image:p['category_image'],
                date:p['date'],
                title:p['title'],
                type:data['type'],
                content:p['content']});
        var element = /** @type {Element} */ goog.dom.htmlToDocumentFragment(html);
        goog.style.showElement(element,false);
        
        var scroller = goog.dom.query('.scroll',slideShow)[0];
        goog.dom.insertChildAt(scroller,element,0);

        goog.events.listen(element,goog.events.EventType.CLICK,function(e) {
            self.categoryView.conversationView.go(p['d_id']);
        });
        
        (new goog.fx.dom.FadeInAndShow(element,500)).play();
    };

    this.socket.addCallback('happening',function(data) {
        var items = goog.dom.query('.slide_show .item');
        
        if (items.length >= 5)
        {
            var last = items[items.length-1];
            var anim = new goog.fx.dom.FadeOutAndHide(last,500);
            goog.events.listen(anim,goog.fx.Transition.EventType.FINISH,function() {
                goog.dom.removeNode(last);
                createHappening(data,true);
            });
            anim.play();
        } else 
            createHappening(data,true);
    });
    this.socket.addCallback('happening_init',function(data) {
        goog.array.forEach(data,function(h,i) {
	    if (i < 5)
            	createHappening(h,false);
        });
    });
    goog.array.forEach(goog.dom.query('#categories a'),function(category) {
        goog.events.listen(category,goog.events.EventType.CLICK,function(e) {
            var name = this.getAttribute('title');
            self.categoryView.go(name);
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

            self.socket.send({'register':['/happening','/user/'+self.userView.user.id]});
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

    var newConvoCallback = function(close) {
    };
    var ov = oc.overlay(goog.dom.query('.content_wrapper .heading .right button')[0],newConvoCallback);


    /**
      * new conversation box.
      */
    goog.events.listen(goog.dom.query("#newConversation button[name='post']")[0],
        goog.events.EventType.CLICK,function() {
            var titleInput = goog.dom.query(".titleField input")[0];
            var contentArea = goog.dom.query('#newConversation textarea')[0];
            var title = titleInput.value;
            var content = contentArea.value;
                
	    titleInput.value = ''; 
	    contentArea.value = '';
            goog.net.XhrIo.send('/post', function() {
                
                // TODO CLOSE BOX
                //goog.style.showElement(goog.dom.getElement('newConversation'),);
                 },'POST',goog.uri.utils.buildQueryDataFromMap({'area':self.categoryView.category.name,
                    'title':title,
                    'content':content})
            );
            ov.close();
    });
    
    var inputs = goog.dom.query("#newConversation .titleField input,#newConversation textarea");
    goog.array.forEach(inputs,function(i) {
        goog.events.listen(i,goog.events.EventType.FOCUSIN,function () {
            goog.dom.classes.add(goog.dom.getNextElementSibling(this),'focus');
        });
        goog.events.listen(i,goog.events.EventType.FOCUSOUT,function () {
            if (this.value == '')
                goog.style.showElement(goog.dom.getNextElementSibling(this),true);
            goog.dom.classes.remove(goog.dom.getNextElementSibling(this),'focus');
        });
        goog.events.listen(i,goog.events.EventType.KEYPRESS,function () {
            goog.style.showElement(goog.dom.getNextElementSibling(this),false);
        });
    });

    // question of the week
    var questionLink = goog.dom.query("#welcome .question a")[0];
    if (goog.isDef(questionLink)) {
        goog.events.listen(questionLink,goog.events.EventType.CLICK,function(e) {
            self.categoryView.go('question of the week');
            e.preventDefault(); 
        });
    }

    goog.events.listen(window,goog.events.EventType.RESIZE,oc.Main.Resize);
    oc.Main.Resize();
    /*
    var newGuildCallback = function(close) {
    }
    oc.overlay(goog.dom.query('#guilds button')[0],newGuildCallback);
    */
};
oc.Main.Resize = function() {
    var size = goog.dom.getViewportSize();
    var frame = 965;
    var happeningSize = 302;
    var padding = 15;
    var overlap = happeningSize + padding - (size.width-frame)/2;
    var isShadowing =  overlap > 0;
    if (isShadowing)
    {
        goog.style.setStyle(goog.dom.getElement('outer'),'margin-right',(happeningSize+padding)+'px');
    } else {
        goog.style.setStyle(goog.dom.getElement('outer'),'margin-right','auto');
    }
};
var main = new oc.Main();
main.start();
