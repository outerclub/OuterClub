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
goog.require('oc.Tracking');
goog.require('goog.events.KeyCodes');

/**
 *
 * @param {Object.<oc.Category>} categories
 * @constructor
 */
oc.Main = function(categories) {
    /**
     * @type {oc.Socket}
     */
    this.socket = new oc.Socket();

    /**
     * @type {Object.<oc.Category>}
     */
    this.categories = categories;

    /**
     * @type {oc.User.View}
     */
    this.userView = new oc.User.View(this.categories,this.socket);

    /**
     * @type {oc.Category.View}
     */
    this.categoryView = new oc.Category.View(this.categories,this.socket,this.userView);

    /**
     * @type {oc.Trending}
     */
    this.trending = new oc.Trending(this.categories,this.categoryView.conversationView);

    /**
     * @type {oc.Leaderboard}
     */
    this.leaderboard = new oc.Leaderboard(this.userView);

    /**
     * @type {number}
     */
    this.happeningItems = 5;

};

oc.Main.prototype.happening = function() {
    var slideShow = goog.dom.query('.slide_show')[0];
    goog.style.showElement(slideShow,false);

    var self = this;
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

        // clickhandler for conversation
        goog.events.listen(element,goog.events.EventType.CLICK,function(e) {
            oc.Nav.go('/conversation/'+p['d_id']); 
            e.preventDefault();
        });

        // clickhandler for @mentions
        goog.array.forEach(goog.dom.query('a',element),function(a) {
            goog.events.listen(a,goog.events.EventType.CLICK,function(e) {
                // Doesn't work right
                //oc.Nav.go(a.getAttribute('href'));
                e.preventDefault();
            });
        });
        
        (new goog.fx.dom.FadeInAndShow(element,500)).play();
    };

    this.socket.addCallback('happening',function(data) {
        var items = goog.dom.query('.slide_show .item');
        
        if (items.length >= self.happeningItems)
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
        // create the initial happening now items
        goog.array.forEach(data,function(h,i) {
            if (i < self.happeningItems)
                    createHappening(h,false);
        });

        // reveal everything
        goog.array.forEach(goog.dom.query('.content_wrapper,#miniProfile,#menu,.footer'),function(item) {
            (new goog.fx.dom.FadeInAndShow(item,500)).play();
        });
    });
};

oc.Main.prototype.start = function() {
    this.userView.init();
    
    var self = this;
    this.socket.addCallback('authRejected',function() {
        window.location = '/logout';
    });
    this.happening();

    // gate to another section
    var menuItems = goog.dom.query('#menu ul a'); 
    goog.array.forEach(menuItems,function(menuItem) {
        goog.events.listen(menuItem,goog.events.EventType.CLICK,function(e) {
            var href = menuItem.getAttribute('href');
            oc.Nav.go(href);

            e.preventDefault();
        });
    });

    // search box
    var searchInput = goog.dom.query('#menu input')[0];
    var searchOver = goog.dom.getNextElementSibling(searchInput);
    goog.events.listen(searchInput,goog.events.EventType.FOCUSIN,function() {
       goog.dom.classes.add(searchOver,'light');
    });
    goog.events.listen(searchInput,goog.events.EventType.FOCUSOUT,function() {
        if (this.value == '')
            goog.style.showElement(searchOver,true);
        goog.dom.classes.remove(searchOver,'light'); 
    });
    goog.events.listen(searchInput,goog.events.EventType.KEYPRESS,function() {
        goog.style.showElement(searchOver,false);
    });
    goog.events.listen(searchOver,goog.events.EventType.MOUSEDOWN,function(e) {
        searchInput.focus();        
        e.preventDefault();
    });

    var newConvoCallback = function(close) {
    };
    var ov = oc.overlay(goog.dom.query('.content_wrapper .heading .right button')[0],newConvoCallback);

    /**
     * Bottom links
     */
    goog.array.forEach(goog.dom.query('.footer_menu_left .staticLink'),function(a) {
        goog.events.listen(a,goog.events.EventType.CLICK,function(m) {
            var href = a.getAttribute('href');
            oc.Nav.go(href);
            m.preventDefault();
        });
    });

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

        // show the defaults again
        goog.array.forEach(goog.dom.query('#newConversation span'),function(span) {
            goog.style.showElement(span,true);
        });
            goog.net.XhrIo.send('/post', function() {
                
                 },'POST',goog.uri.utils.buildQueryDataFromMap({'area':self.categoryView.category.id,
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

    // prevent escape
    goog.events.listen(window,goog.events.EventType.KEYDOWN,function(e) {
        if (e.keyCode == goog.events.KeyCodes.ESC)
        {
            // grab something to focus on
            var object = goog.dom.query('#miniLogo a')[0];
            object.focus();
            object.blur();
            e.preventDefault();
        }
    });
   
    var navigate = function(e) {
        var t = e.token;
        oc.Tracking.page(t);
        if (t == '!/about' || t ==  '!/faq')
        {
            var title = 'About Us';
            if (t == '!/faq')
                title = 'FAQ';
            var href = '/static'+t.substring(1)+'.html';
            goog.net.XhrIo.send(href,function(e) {
                var page = goog.dom.getElement('dynamic');
                page.innerHTML = e.target.getResponseText();
                oc.Nav.setTitle(title);
                oc.Nav.hideAll();
                goog.style.showElement(page,true);
                window.scrollTo(0,0);
            });
        } else if (t == '!/welcome' || t == '!/trending' || t== '!/categories' || t== '!/leaderboard') {
            var menuItems = goog.dom.query('#menu ul a'); 
            var menuItem = goog.dom.query('#menu a[href="'+t.substring(1)+'"]')[0];
             goog.array.forEach(menuItems,function(i) {
                goog.dom.classes.remove(i,'active');
            });
            goog.dom.classes.add(menuItem,'active');

            self.socket.send({'register':['/happening','/user/'+self.userView.user.id]});
            if (t == '!/trending')
               self.trending.go(); 
            else if (t == '!/leaderboard')
                self.leaderboard.go();
            else
            {
                oc.Nav.hideAll();
                var element = goog.dom.query(menuItem.getAttribute('href').replace('/','#'))[0];
                goog.style.showElement(element,true);
                oc.Nav.setTitle(element.getAttribute('title'));
            }
        } else if (t.indexOf('!/user/') == 0) {
            var id = t.split('/');
            id = id[id.length-1];
            self.userView.go(id);
        } else if (t.indexOf('!/category/') == 0) {
            var name = t.split('/');
            name = name[name.length-1];
            self.categoryView.go(name);
        } else if (t.indexOf('!/conversation/') == 0) {
            var id = t.split('/');
            id = id[id.length-1];
            self.categoryView.conversationView.go(id);
        }
    };
    goog.events.listen(oc.Nav.history,goog.history.EventType.NAVIGATE,navigate);
    oc.Nav.history.setEnabled(true);
};

/**
 * Resizes the frames to fit the viewport properly.
 */
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

// ensure that main starts with categories
goog.net.XhrIo.send('/categories',function(e) {
    var data = goog.json.unsafeParse(e.target.getResponseText())['categories'];
    var ordered = [];
    var categories = {};
    goog.array.forEach(data,function(cat) {
        var obj = oc.Category.extractFromJson(cat);
        ordered.push(obj);
        categories[obj.id] = obj; 
    });
    goog.dom.query('#categories div')[0].innerHTML = oc.Templates.Category.categoryList({categories:ordered});
    goog.array.forEach(goog.dom.query('#categories a'),function(category) {
        goog.events.listen(category,goog.events.EventType.CLICK,function(e) {
            oc.Nav.go(category.getAttribute('href'));
            e.preventDefault();
        });
    });
    var main = new oc.Main(categories);
    main.start();
});
