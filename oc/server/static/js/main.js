goog.provide('oc.Main');

goog.require('oc.Socket');
goog.require('oc.Category.View');
goog.require('oc.Nav');
goog.require('oc.News.View');
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
goog.require('goog.fx.easing');
goog.require('goog.style');
goog.require('goog.net.XhrIo');
goog.require('goog.uri.utils');
goog.require('oc.Templates.Main');
goog.require('oc.Tracking');
goog.require('goog.events.KeyCodes');
goog.require('goog.date');

/**
 *
 * @param {oc.User.View} userView
 * @param {Object.<oc.Category>} categories
 * @param {oc.Socket} socket
 * @constructor
 */
oc.Main = function(userView,categories,socket) {
    /**
     * @type {oc.Socket}
     */
    this.socket = socket;

    /**
     * @type {Object.<oc.Category>}
     */
    this.categories = categories;

    /**
     * @type {oc.User.View}
     */
    this.userView = userView;

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

};

oc.Main.prototype.start = function() {
    var self = this;
   	var chat = goog.dom.getElement("chat");
   	var chatMessages = goog.dom.query('ul.messages',chat)[0];
   	var chatUsers= goog.dom.query('ul.users',chat)[0];
   	var fixChatHeight = function() {
   		var h;
    	var chatItems = goog.dom.query('li',chat);
    	for (var x=0; x < chatItems.length; x++)
    	{
    		h = goog.style.getSize(chat).height;
    		if (h > 500)
    			goog.dom.removeNode(chatItems[x]);
    	}
   	}
    var addChatItem = function(data)
    {
    	var msg = data['message'];
    	var user = oc.User.extractFromJson(data['user']);
    	var date = goog.date.fromIsoString(data['date']);
    	chatMessages.appendChild(
    			goog.dom.htmlToDocumentFragment(
    					oc.Templates.Main.chatItem({
    						date:date.toIsoTimeString(false),
    						name:user.name,
    						content:msg,
    						user_id:user.id
    					})));
    }
    this.socket.addCallback('chat_init',function(chatItems) {
    	goog.style.showElement(chat,true);
    	goog.array.forEach(chatItems,addChatItem);
    	fixChatHeight();
    });
    this.socket.addCallback('users',function(users) {
    	chatUsers.innerHTML = '';
    	goog.array.forEach(users,function(u) {
    		chatUsers.appendChild(goog.dom.htmlToDocumentFragment(
    				oc.Templates.Main.userItem({
    					avatar_image:u['avatar_image'],
    					name:u['name'],
    					user_id:u['user_id']
    				})));
    	});
        //goog.dom.query('.online span')[0].innerHTML = num;
        // reveal everything
        goog.array.forEach(goog.dom.query('#miniProfile,#menu,.footer'),function(item) {
            if (!goog.style.isElementShown(item))
                (new goog.fx.dom.FadeInAndShow(item,500)).play();
        });
    });
    this.socket.addCallback('chat',function(data) {
    	addChatItem(data);
    	fixChatHeight();
    	/*
    	if (!goog.style.isElementShown(chat))
    	{
    		goog.style.setStyle(goog.dom.query('#menu .online span')[0],'color','red');
    	}
    	*/
    });
    /*
    goog.events.listen(goog.dom.getElement('chatButton'),goog.events.EventType.CLICK,function(e) {
    	var isClosed = !goog.style.isElementShown(chat);
    	goog.style.showElement(chat,isClosed);
    	
    	// opening
    	if (isClosed)
		{
    		goog.style.setStyle(goog.dom.query('#menu .online span')[0],'color','inherit');
		}
    });
    */
    goog.events.listen(goog.dom.query('input',chat)[0],goog.events.EventType.KEYPRESS,function(e) {
    	if (e.keyCode == goog.events.KeyCodes.ENTER)
		{
    		self.socket.send({'chat':this.value});
    		this.value = '';
		}
    });

    // gate to another section
    var menuItems = goog.dom.query('#menu ul a'); 
    goog.array.forEach(menuItems,function(menuItem) {
        goog.events.listen(menuItem,goog.events.EventType.CLICK,function(e) {
            var href = menuItem.getAttribute('href');
            oc.Nav.go(href);

            e.preventDefault();
        });
    });

    /*
    // search box
    /*
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
    */

    var referOv = oc.overlay(goog.dom.query('#menu button')[0],function() {});
    goog.events.listen(goog.dom.query("#refer button")[0],
        goog.events.EventType.CLICK,function() {
            var nameInput = goog.dom.query("input[name='name']")[0];
            var emailInput = goog.dom.query("input[name='email']")[0];
            var name = nameInput.value;
            var email = emailInput.value;
                
            var err = /** @type {Element} */ goog.dom.query("#refer .error")[0];
            var invitesLeft = /** @type {Element} */ goog.dom.query("#refer span")[0];
            goog.net.XhrIo.send('/invite', function(e) {
                var resp = e.target.getResponseJson();
                if ('error' in resp) {
                    goog.style.showElement(err,true);
                    err.innerHTML = resp['error'];
                } else {
                    invitesLeft.innerHTML = Math.max(0,parseInt(invitesLeft.innerHTML,10)-1);
                    // show the defaults again
                    nameInput.value = ''; 
                    emailInput.value = '';
                    goog.style.showElement(err,false);
                    referOv.close();
                }
                
                 },'POST',goog.uri.utils.buildQueryDataFromMap({
                    'name':name,
                    'email':email})
            );
    });

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
    var ov;
    goog.array.forEach(goog.dom.query('.heading .right button'),function(button) {
        ov = oc.overlay(button,function() {});

    });
    goog.events.listen(goog.dom.query("#newConversation button[name='post']")[0],
        goog.events.EventType.CLICK,function() {
            var titleInput = goog.dom.query(".titleField input")[0];
            var contentArea = goog.dom.query('#newConversation textarea')[0];
            var title = titleInput.value;
            var content = contentArea.value;
                
            var err = /** @type {Element} */ goog.dom.query("#newConversation .error")[0];
            goog.net.XhrIo.send('/post', function(e) {
                var resp = e.target.getResponseJson();
                if ('error' in resp) {
                    goog.style.showElement(err,true);
                    err.innerHTML = resp['error'];
                } else {
                    // show the defaults again
                    goog.array.forEach(goog.dom.query('#newConversation span'),function(span) {
                        goog.style.showElement(span,true);
                    });
                    titleInput.value = ''; 
                    contentArea.value = '';
                    goog.style.showElement(err,false);
                    ov.close();
                }

                 },'POST',goog.uri.utils.buildQueryDataFromMap({'area':self.categoryView.category.id,
                    'title':title,
                    'content':content})
            );
    });
    
    /**
     * New conversation box hints.
     */
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

    goog.events.listen(window,goog.events.EventType.RESIZE,function() {
        self.resize();
    });
    this.resize();

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
   
    /**
     * The main navigation handler.
     */
    var navigate = function(e) {
        var t = e.token;
        oc.Tracking.page(t);

        // unselect the active item
        var menuItems = goog.dom.query('#menu ul a'); 
         goog.array.forEach(menuItems,function(i) {
            goog.dom.classes.remove(i,'active');
        });
         
        if (t == '!/welcome' || t == '')
        {
       		goog.style.showElement(goog.dom.getElement('altBody'),false);
       	} else {
       		goog.style.showElement(goog.dom.getElement('altBody'),true);
       	}

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
        } else if (t == '!/welcome' || t == '!/trending' || t== '!/leaderboard') {
            var menuItem = goog.dom.query('#menu a[href="#'+t+'"]')[0];
            goog.dom.classes.add(menuItem,'active');

            // register for events
            var registrations = ['/chat','/happening','/user/'+self.userView.user.id];
            self.socket.send({'register':registrations});

            if (t == '!/trending')
               self.trending.go(); 
            else if (t == '!/leaderboard')
                self.leaderboard.go();
            else
            {
                oc.Nav.hideAll();
                var element = goog.dom.query(menuItem.getAttribute('href').replace('!/','#'))[0];
                goog.style.showElement(element,true);
                oc.Nav.setTitle(element.getAttribute('title'));
            }
        } else if (t.indexOf('!/user/') == 0) {
            var id = t.split('/');
            id = id[id.length-1];
            self.userView.go(id);
        } else if (t.indexOf('!/category/') == 0) {
            var menuItem = goog.dom.query('#menu a[name="category"]')[0];
            goog.dom.classes.add(menuItem,'active');
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
oc.Main.prototype.resize = function() {
    var viewportSize = goog.dom.getViewportSize();
    var frameElement = goog.dom.getElement("frame");
   	goog.style.setStyle(frameElement,'min-height',(viewportSize.height-100)+'px');
    this.categoryView.refresh();
};

// ensure that main starts with categories
goog.net.XhrIo.send('/categories',function(e) {
    var data = goog.json.unsafeParse(e.target.getResponseText())['categories'];
    var categories = {};
    var menu = goog.dom.query('#viewer .menu .categories')[0];
    goog.array.forEach(data,function(cat) {
        var obj = oc.Category.extractFromJson(cat);
        categories[obj.id] = obj; 
        var html = oc.Templates.Category.menuItem({name:obj.name,url:obj.url});
        var element = goog.dom.htmlToDocumentFragment(html)

        goog.dom.appendChild(menu,element);
        
    });

    var id = undefined;
    var key;
     // extract the user_id and key from the cookies
     goog.array.forEach(document.cookie.split("; "),function(cookie) {
        var spl = cookie.split('=');
        if (spl[0] == 'key')
            key = spl[1];
    });

    // initialize the socket
    var socket = new oc.Socket();
    socket.init('http://'+window.location.hostname+':'+window['RTG_WEBPORT']+'/sock');
    socket.addCallback('authRejected',function() {
        window.location = '/logout';
    });

    // load the user details
    goog.net.XhrIo.send('/user',function(e) {
        var u = goog.json.unsafeParse(e.target.getResponseText())['user'];
        var user = oc.User.extractFromJson(u);
        var userView = new oc.User.View(user,categories,socket);
        var main = new oc.Main(userView,categories,socket);
        socket.send({'key':key});
        main.start();
        userView.init();
    });
});
