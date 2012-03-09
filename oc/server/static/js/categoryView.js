goog.provide('oc.Category.View');
goog.provide('oc.Conversation.View');

goog.require('oc.Socket');
goog.require('oc.Category');
goog.require('oc.Nav');
goog.require('oc.Util');
goog.require('oc.User');
goog.require('oc.User.View');
goog.require('oc.Conversation');
goog.require('oc.Conversation.Response');
goog.require('oc.Templates.Category');
goog.require('goog.array');
goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.string');
goog.require('goog.fx.dom');
goog.require('goog.fx.Transition');
goog.require('goog.style');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.uri.utils');
goog.require('goog.date');

/**
 * @param {Object.<oc.Category>} categories
 * @param {oc.Socket} socket
 * @param {oc.User.View} userView
 * @constructor
 */
oc.Category.View = function(categories,socket,userView) {
    /**
     * @type {oc.Category}
     */
    this.category = null;
    
    /**
     * @type {oc.Socket}
     */
    this.socket = socket;

    /**
     * @type {oc.User.View}
     */  
    this.userView = userView;

    /**
     * @type {oc.Conversation.View}
     */
    this.conversationView = new oc.Conversation.View(this,socket,userView);

    /**
     * @type {Object.<oc.Category>}
     */
    this.categories = categories;

    /**
     * @type {Array.<oc.Category.View.Conversation>}
     */
    this.conversations = [];

    /**
     * @type {Object.<number>}
     */
    this.idConversationsIndex = {};
   
    /**
     * @type {number}
     */
    this.columnPadding = 10; 

    /**
     * @type {number}
     */
    this.columns = 0;
};

/**
 * @type {number}
 * @const
 */
oc.Category.View.COLUMN_WIDTH = 285;

/**
 * @type {number}
 * @const
 */
oc.Category.View.MAX_RESPONSES = 4;

/**
 * @type {number}
 * @const
 */
oc.Category.View.MARGIN_LEFT = 185;

/** @typedef {{id: number,element:Element}} */
oc.Category.View.Conversation;

/**
 * @param {string} url
 */
oc.Category.View.prototype.go = function(url) {
    var self = this;
    this.conversations = [];
    this.idConversationsIndex = {};

    goog.net.XhrIo.send('/category/'+url,function(e) {
        var categoryData = goog.json.unsafeParse(e.target.getResponseText());
        
        var posts = categoryData['posts'];
        var viewerElement = goog.dom.getElement('viewer');
        var conversationElement = goog.dom.getElement('conversation');

        // only scroll if paging through categories
        var scroll = goog.style.isElementShown(viewerElement) && !goog.style.isElementShown(conversationElement);
        var scrollDirection = 0;
        var beforeViewerHeight = goog.style.getSize(viewerElement).height;
        if (scroll)
        {
            var currentElement = goog.dom.query('.panel',viewerElement)[0];
            var scrollElement = goog.dom.query('.scrollPanel',viewerElement)[0];
            // swap the two
            goog.dom.classes.remove(currentElement,'panel');
            goog.dom.classes.add(currentElement,'scrollPanel');
            goog.dom.classes.remove(scrollElement,'scrollPanel');
            goog.dom.classes.add(scrollElement,'panel');

            goog.style.setPosition(scrollElement,0,-1000);
            goog.style.showElement(scrollElement,true);
            
            var activeLi = goog.dom.query('.menu .categories .active',viewerElement)[0];
            var targetLi = goog.dom.query('.menu .categories a[name="'+url+'"]',viewerElement)[0];
            scrollDirection = goog.dom.compareNodeOrder(activeLi,targetLi);
        }
        var panelElement = goog.dom.query('.panel',viewerElement)[0];
        
        oc.Nav.hideAll();
        goog.style.showElement(conversationElement,false);
        goog.style.showElement(panelElement,true);
        goog.style.showElement(viewerElement,true);

        var contentElement = goog.dom.query('.content',panelElement)[0];
        contentElement.innerHTML = '<div class="posts"></div>';
    

        // iterate over all the posts backwards
        for (var i=posts.length-1; i >= 0; i--) {
            var p = posts[i];
            var html = oc.Templates.Category.conversation({
                hide:true,
                id:p['id'],
                title:p['title'],
                cover_image:p['user']['cover_image'],
                avatar_image:p['user']['avatar_image'],
                user_id:p['user']['user_id'],
                date: oc.Util.prettyDate(goog.date.fromIsoString(p['date'])),
                numReplies:p['numReplies'],
                numUsers:p['numUsers'],
                user_name:p['user']['name']});
            var d = /** @type {Element} */ goog.dom.htmlToDocumentFragment(html);
            self.insertPost(parseInt(p['id'],10),d,false);

            var responsesElement = goog.dom.query('.responses',d)[0];
            var lastElement;
            for (var j=0; j < p['responses'].length; j++) {
                lastElement = self.responseToElement(p['responses'][j]);
                oc.Util.slide(lastElement,responsesElement,oc.Category.View.MAX_RESPONSES,false,false);
            }
            // remove the border from the bottom
            goog.dom.classes.remove(lastElement,'border');
        };

        var canCreate = !categoryData['private'] || self.userView.user.admin;
        
        self.setCategory(categoryData['id'],true,!categoryData['private']);
        oc.Nav.setTitle(self.category.name);
        self.updateRegistrations();
        self.refresh();
        if (scroll)
        {
            var afterViewerHeight = goog.style.getSize(viewerElement).height;
            var viewerHeight = Math.max(beforeViewerHeight,afterViewerHeight);
            var scrollElement= goog.dom.query('.scrollPanel',viewerElement)[0];
            var newElement = goog.dom.query('.panel',viewerElement)[0];

            goog.style.setPosition(newElement,oc.Category.View.MARGIN_LEFT,-scrollDirection*viewerHeight);
            
            var anim = (new goog.fx.dom.SlideFrom(scrollElement,[oc.Category.View.MARGIN_LEFT,scrollDirection*viewerHeight],oc.Util.SLIDE_TIME,goog.fx.easing.easeOut));
            var anim2 = (new goog.fx.dom.SlideFrom(newElement,[oc.Category.View.MARGIN_LEFT,0],oc.Util.SLIDE_TIME,goog.fx.easing.easeOut));
            anim.play();
            anim2.play();
            goog.dom.query('body')[0].scrollTop = 0;
        }
    });

    // a new response arrives?
    this.socket.addCallback('response',function(data) {
        var id = parseInt(data['d_id'],10);
        var conversationElement = self.conversations[self.idConversationsIndex[id]].element;
        var responsesElement = goog.dom.query('.responses',conversationElement)[0];
        var responses = goog.dom.query('.response',responsesElement);
        var oldHeight = goog.style.getSize(responsesElement).height;
        
        // add border to previous bottom
        goog.dom.classes.add(responses[responses.length-1],'border');
        var newResponse = self.responseToElement(data);
        var newHeight = oc.Util.slide(newResponse,responsesElement,oc.Category.View.MAX_RESPONSES,true,false);
        goog.dom.classes.remove(newResponse,'border');

        self.push(id,newHeight-oldHeight);
    });

    // a new conversation arrives?
    this.socket.addCallback('conversation',function(data) {
        var html = oc.Templates.Category.conversation({
            hide:true,
            id:data['id'],
            title:data['title'],
            cover_image:data['user']['cover_image'],
            avatar_image:data['user']['avatar_image'],
            user_id:data['user']['user_id'],
            date: oc.Util.humanDate(goog.date.fromIsoString(data['date'])),
            numReplies:0,
            numUsers:1,
            user_name:data['user']['name']});
        var d = /** @type {Element} */ goog.dom.htmlToDocumentFragment(html);
        (new goog.fx.dom.FadeInAndShow(d,500)).play();
        self.insertPost(parseInt(data['id'],10),d,true);

        var responsesElement = goog.dom.query('.responses',d)[0];
        var lastElement = self.responseToElement(data);
        oc.Util.slide(lastElement,responsesElement,oc.Category.View.MAX_RESPONSES,false,false);

        // remove the border from the bottom
        goog.dom.classes.remove(lastElement,'border');
        self.updateRegistrations();
        self.refresh();
    });
};


oc.Category.View.prototype.updateRegistrations = function() {
    var registrations=['/happening','/user/'+this.userView.user.id,'/category/'+this.category.id];

    for (var id in this.idConversationsIndex)
        registrations.push('/conversation/'+id);
    this.socket.send({'register':registrations});
}

/**
 * @param {number} id
 * @param {number} pixels
 */
oc.Category.View.prototype.push = function(id,pixels) {
    var currentId = this.idConversationsIndex[id];
    // compute the maximum y position after the push
    var maxY = goog.style.getSize(this.conversations[currentId].element).height+goog.style.getPosition(this.conversations[currentId].element).y+pixels;
    for (var i=currentId+this.columns; i < this.conversations.length; i+= this.columns)
    {
        var elementToMove = this.conversations[i].element;
        var pos = goog.style.getPosition(elementToMove);
        var anim = (new goog.fx.dom.SlideFrom(elementToMove,[pos.x,pos.y+pixels],oc.Util.SLIDE_TIME,goog.fx.easing.easeOut));
        anim.play();
        maxY = Math.max(goog.style.getSize(elementToMove).height+pos.y+pixels,maxY);
    }

    // increase the viewport size, as necessary
    var viewerElement = goog.dom.query('#viewer')[0];
    var currentHeight = goog.style.getSize(viewerElement).height;
    var newHeight = maxY+100;
    if (newHeight > currentHeight)
    {
        (new goog.fx.dom.ResizeHeight(viewerElement,currentHeight,newHeight,oc.Util.SLIDE_TIME,goog.fx.easing.easeOut)).play();
    }
}


/**
 * @param {Object} r
 * @return {Element}
 */
oc.Category.View.prototype.responseToElement = function(r) {
    var newR = oc.Conversation.Response.extractFromJson(r);
    var content = newR.content.replace(/^\/me/,'');
    var html = oc.Templates.Category.miniResponse({
        border:true,
        content:oc.Util.replaceLinks(goog.string.newLineToBr(content)),
        date:oc.Util.prettyDate(newR.date),
        user:newR.user
       });
   var rElement = /** @type {Element} */ goog.dom.htmlToDocumentFragment(html);
    return rElement;
};

/**
 * Refreshes the category layout.
 */
oc.Category.View.prototype.refresh = function() {
    var viewportSize = goog.dom.getViewportSize();
    // calculate the number of columns
    this.columns = Math.floor((viewportSize.width
                       -goog.style.getSize(goog.dom.query('#viewer .menu')[0]).width
                       )/(oc.Category.View.COLUMN_WIDTH+this.columnPadding));

    var heights = [];

    // push initial zero heights
    for (var i=0; i < this.columns; i++)
        heights.push(0);

    // set the first height according to the 0,0 conversation
    if (this.conversations.length > 0)
        heights[0] = goog.style.getSize(this.conversations[0].element).height;

    // process all the convos
    for (var i= 1; i < this.conversations.length; i++)
    {
        var newLeft = 0; 
        var newTop = 0;
        var upperIndex = i-this.columns;
        // move to same row?
        if (i % this.columns != 0)
        {
            newLeft = (i % this.columns)*(oc.Category.View.COLUMN_WIDTH+this.columnPadding);
        }
        // is there an element above the new position?
        if (upperIndex >= 0)
        {
            newTop =goog.style.getPosition(this.conversations[upperIndex].element).y+goog.style.getSize(this.conversations[upperIndex].element).height + this.columnPadding;
        }
        var currentHeight = goog.style.getSize(this.conversations[i].element).height;
        heights[i%this.columns] = newTop+currentHeight;
        goog.style.setPosition(this.conversations[i].element,newLeft,newTop);
    }

    // set the viewer height
    var maxHeight = Math.ceil(goog.array.reduce(heights,function(r,v) { return Math.max(r,v); },0))+100;
    goog.style.setHeight(goog.dom.query('#viewer')[0],Math.max(maxHeight,this.computeMenuHeight()));
};
/**
 * @param {number} id
 * @param {Element} postElement
 */
oc.Category.View.prototype.insertPost = function(id,postElement) {
    var rootElement = goog.dom.query('#viewer .panel .posts')[0];
    goog.dom.insertChildAt(rootElement,postElement,0);
    goog.style.showElement(postElement,true);
    this.conversations.splice(0,0,{'id':id,'element':postElement});

    for (var i= 0; i < this.conversations.length; i++)
    {
        // update the ID index
        this.idConversationsIndex[this.conversations[i].id] = i;
    }
    
    var self = this;
    goog.events.listen(goog.dom.query('textarea',postElement)[0],goog.events.EventType.KEYDOWN,function(e) {
        /*
        if (e.keyCode == goog.events.KeyCodes.ENTER)
        {
            var textarea = this;
            var before = goog.style.getSize(textarea).height;
            textarea.rows = goog.string.countOf(textarea.value,'\n')+2;
            self.push(id,goog.style.getSize(textarea).height-before);
        } else if (e.keyCode == goog.events.KeyCodes.BACKSPACE)
        {
            var textarea = this;
            var spl = textarea.value.split('\n');
            var before = goog.style.getSize(textarea).height;
            textarea.rows = goog.string.countOf(textarea.value,'\n')+1;
            // last line is length 0
            if (spl.length > 1 && spl[spl.length-1].length == 0)
            {
                alert('sub');
                textarea.rows -= 1;
            }
            self.push(id,goog.style.getSize(textarea).height-before);
        }
        */
        /*
        {
            var content = this.value;
            goog.net.XhrIo.send('/reply',function(e) {
                var data = goog.json.unsafeParse(e.target.getResponseText());
                var errorView = goog.dom.query('.reply .error',self.rootElement)[0];
                if ('error' in data) {
                    errorView.innerHTML = data['error'];
                    (new goog.fx.dom.FadeInAndShow(errorView,500)).play();
                } else {
                    (new goog.fx.dom.FadeOut(errorView,500)).play();
                    textarea.value = '';
                    textarea.focus();
                }
                textarea.value = '';
             },
            'POST',goog.uri.utils.buildQueryDataFromMap({
                    'd_id':id,
                    'data':content}));
        }
        */
    });
    // clickhandler
    goog.events.listen(goog.dom.query('a.convo',postElement)[0],goog.events.EventType.CLICK,function(e) {
        oc.Nav.go(this.getAttribute('href'));
        e.preventDefault();
    });
};

/**
 * @param {number} id
 * @param {boolean=} showHeading
 * @param {boolean=} canCreate
 */
oc.Category.View.prototype.setCategory = function(id,showHeading,canCreate) {
    canCreate = goog.isBoolean(canCreate) ? canCreate : true;
    // change to the new category
    this.category = this.categories[id];

    if (showHeading)
    {
        // show category head
        var headerElement = goog.dom.query('#viewer .panel .heading')[0];
        goog.dom.query('h2',headerElement)[0].innerHTML = this.category.name;
        var link = goog.dom.query('a',headerElement)[0];
        link.setAttribute('href','#!/category/'+this.category.url);

        // change the category image
        goog.style.showElement(headerElement,true);
        var img = goog.dom.query('img',headerElement)[0];
        if (!goog.isDefAndNotNull(this.category.icon) || this.category.icon == '')
        {
            goog.style.showElement(img,false);
        } else {
            img.setAttribute('src','/static/images/categories/'+this.category.icon);
            goog.style.showElement(img,true);
        }
        // show the new conversation button
        var newConvoButton = goog.dom.query('.right button',headerElement)[0];
        goog.style.showElement(newConvoButton,canCreate);

        goog.events.removeAll(link);
        goog.events.listen(link,goog.events.EventType.CLICK,function(e) {
            oc.Nav.go(this.getAttribute('href'));
            e.preventDefault();
        });
    }

    var self = this;
    // set the active menu item
    goog.array.forEach(goog.dom.query('#viewer .menu .categories a'),function(a) {
        if (self.category.url == a.getAttribute('name'))
            goog.dom.classes.add(a,'active');
        else
            goog.dom.classes.remove(a,'active');
    });
    
};

/**
 * @return {number}
 */
oc.Category.View.prototype.computeMenuHeight = function() {
    var viewportSize = goog.dom.getViewportSize();
    var topH = goog.style.getSize(goog.dom.getElement('menu')).height;
    var bottomH = goog.style.getSize(goog.dom.query('.footer')[0]).height;
    return viewportSize.height-topH-bottomH; 
    
};

/**
 * @param {oc.Category.View} category_view
 * @param {oc.Socket} socket
 * @param {oc.User.View} userView
 * @constructor
 */
oc.Conversation.View = function(category_view,socket,userView) {
    /**
     * @type {oc.Category.View}
     */
    this.categoryView = category_view;

    /**
     * @type {oc.Socket}
     */
    this.socket = socket;

    /**
     * @type {oc.User.View}
     */
    this.userView = userView;

    /**
     * @type {oc.Conversation}
     */
    this.conversation = null;

    /**
     * @type {Array.<oc.Conversation.Response>}
     */
    this.responses = [];

    /**
     * @type {Element}
     */
    this.rootElement = goog.dom.getElement("conversation");
};

/**
 *
 */
oc.Conversation.View.prototype.resize = function() {
    var viewerElement = goog.dom.getElement('viewer');
    var underlayElement = goog.dom.query('.underlay',this.rootElement)[0];
    // set to auto and then find the height
    goog.style.setStyle(underlayElement,'height','auto');
    var underlayHeight = Math.max(this.categoryView.computeMenuHeight()-334,goog.style.getSize(underlayElement).height);
    goog.style.setHeight(underlayElement,underlayHeight);
    goog.style.setHeight(viewerElement,underlayHeight+334);
}
/**
 * @param {number} id
 */
oc.Conversation.View.prototype.go = function(id) {
   var self = this;
    var usersView = goog.dom.query('.users',self.rootElement)[0];
    usersView.innerHTML = '';
    goog.dom.query('.error',self.rootElement)[0].innerHTML = '';
    goog.net.XhrIo.send('/conversation/'+id,function(e) {
        var data = goog.json.unsafeParse(e.target.getResponseText());
        self.conversation = oc.Conversation.extractFromJson(data);
        oc.Nav.hideAll();
        oc.Nav.setTitle(self.conversation.title); 

        var viewerElement = goog.dom.getElement('viewer');
        goog.style.showElement(viewerElement,true);
        // hide the category panel if necessary
        goog.array.forEach(goog.dom.query('.panel,.scrollPanel',viewerElement),function(panel) {
            goog.style.showElement(panel,false);
        });

        // scroll to top
        goog.dom.query('body')[0].scrollTop = 0;

        // show category head
        self.categoryView.setCategory(self.conversation.categoryId,false);

        self.socket.send({'register':['/happening','/user/'+self.userView.user.id,'/conversation/'+id]});
        self.socket.addCallback('response',function(data) {
            self.createResponse(true,oc.Conversation.Response.extractFromJson(data),self.conversation.categoryId);
            self.resize();
        });
        self.socket.addCallback('viewers',function(viewers) {
            // scan for removals
            var toRemove = [];
            for (var v in self.conversation.viewers)
            {
                if (!(v in viewers))
                {
                    var vElement = goog.dom.getElement('v_'+v);
                    var anim = new goog.fx.dom.FadeOutAndHide(vElement,500); 
                    goog.events.listen(anim,goog.fx.Transition.EventType.FINISH,function() {
                        goog.dom.removeNode(vElement);
                    });
                    anim.play();
                    delete self.conversation.viewers[v];
                }
            }
            // scan for insertions
            for (v in viewers) {
                if (!(v in self.conversation.viewers)) {
                    var html = oc.Templates.Category.viewerIcon({user_id:v,avatar_image:viewers[v]});
                    var userView = /** @type {!Element} */ goog.dom.htmlToDocumentFragment(html);
                    goog.style.showElement(userView,false);
                    goog.events.listen(userView,goog.events.EventType.CLICK,function(e) {
                        oc.Nav.go(this.getAttribute('href'));
                        e.preventDefault();
                    });
                    goog.dom.append(usersView,userView);
                    (new goog.fx.dom.FadeInAndShow(userView,500)).play();
                    self.conversation.viewers[v] = '';
                }
            }
        });
        
        goog.dom.query('.cover',self.rootElement)[0].innerHTML = '<img width="905" src="/static/images/covers/'+self.conversation.user.cover_image+'" />';
        goog.dom.query('.room h2',self.rootElement)[0].innerHTML = goog.string.htmlEscape(self.conversation.title,false);

        goog.array.forEach(goog.dom.query('.conversation',self.rootElement),function(c) {
            goog.dom.removeNode(c);
        });
        self.createResponse(false,new oc.Conversation.Response(-1,self.conversation.date,self.conversation.content,self.conversation.user),self.conversation.categoryId);

        /**
         * Reply
         */
        // textarea focus on tab
        var textarea = goog.dom.query('.reply textarea',self.rootElement)[0];
        var replyButton = goog.dom.query('.reply button',self.rootElement)[0];
        goog.events.removeAll(textarea);
        goog.events.listen(textarea,goog.events.EventType.KEYDOWN,function(e) {
            if (e.keyCode == goog.events.KeyCodes.TAB)
            {
                replyButton.focus();
                e.preventDefault();
            }
                
        });

        // reply button
        goog.events.removeAll(replyButton);
        goog.events.listen(replyButton,goog.events.EventType.CLICK,function(e) {
            var content = textarea.value;
            goog.net.XhrIo.send('/reply',function(e) {
                var data = goog.json.unsafeParse(e.target.getResponseText());
                var errorView = goog.dom.query('.reply .error',self.rootElement)[0];
                if ('error' in data) {
                    errorView.innerHTML = data['error'];
                    (new goog.fx.dom.FadeInAndShow(errorView,500)).play();
                } else {
                    var anim = new goog.fx.dom.FadeOut(errorView,200);
                    /*
                    no auto-scroll for now.
                    goog.events.listen(anim,goog.fx.Transition.EventType.FINISH,function(e) {
                        var body = goog.dom.query('body')[0];
                        body.scrollTop += 50;
                    });
                    */
                    anim.play();
                    textarea.value = '';
                    textarea.focus();
                }
             },
            'POST',goog.uri.utils.buildQueryDataFromMap({
                    'd_id':self.conversation.id,
                    'data':content}));
        });

        // create all the responses
        goog.array.forEach(self.conversation.responses,function(r) {
            self.createResponse(false,r,self.conversation.categoryId);
        });
        
        // resize the viewer
        goog.style.showElement(self.rootElement,true);
        self.resize();

    }); 
};

/**
 * @param {boolean} fadeIn
 * @param {oc.Conversation.Response} response
 */
oc.Conversation.View.prototype.createResponse = function(fadeIn,response,categoryId) {
    var self = this;
    var previousD = goog.dom.query('.conversation',self.rootElement);
    var date;
    if (this.responses.length > 0)
    {
        var lastResponse = this.responses[this.responses.length-1];
        if (goog.date.isSameDay(response.date,lastResponse.date))
            date = response.date.toUsTimeString();
        else {
            date = oc.Util.humanDate(response.date);
            // today? 
            if (date.length <= 7)
            {
                date = "Today, "+date;
            }
        }
    } else
        date = oc.Util.humanDate(response.date);

    // create right float
    var userLinkHandler = function(e) {
        oc.Nav.go(this.getAttribute('href'));
        e.preventDefault();
    };

    var content = oc.Util.replaceLinks(goog.string.newLineToBr(response.content));
    var isAction = content.indexOf('/me') === 0;
    var lastDiscussion = goog.dom.query(".conversation:last-child",self.rootElement);

    // combine this posting and the previous one?
    if (!isAction && lastDiscussion.length == 1 &&
        !goog.dom.classes.has(lastDiscussion[0],'action') &&
        goog.dom.query('.user h2 a',lastDiscussion[0])[0].getAttribute('href').split('/')[2] == response.user.id)
    {
        var html = oc.Templates.Category.responseContent({date:date,content:content});
        var section = goog.dom.createDom('div','section',goog.dom.htmlToDocumentFragment(html));
        goog.style.showElement(section,false);
        goog.dom.append(goog.dom.query('.content',lastDiscussion[0])[0],section);
        if (fadeIn)
        {
            (new goog.fx.dom.FadeInAndShow(section,500)).play();
        }else
            goog.style.showElement(section,true);
        
        // clickhandler for mentions
        goog.array.forEach(goog.dom.query('.mention',section),function(mention) {
            goog.events.listen(mention,goog.events.EventType.CLICK,userLinkHandler);
        });
    } else { // create a brand new posting
        // strip away /me and convert to an icon
        if (isAction)
            content = content.replace(/^\/me/,oc.Templates.Category.actionMe({user:response.user}));

        var canVote = goog.array.contains(self.conversation.votableUsers,response.user.id);
        var html = oc.Templates.Category.response({isAction:isAction,response:response,content:content,date:date,canVote:canVote});

        var element = /** @type {Element} */ goog.dom.htmlToDocumentFragment(html);
        goog.style.showElement(element,false);

        var responsesElement = goog.dom.query('.responses',self.rootElement)[0];
        goog.dom.appendChild(responsesElement,element);

        if (!isAction)
        {
            // generate the tooltip
            if (categoryId in response.user.blurbs)
            {
                var tooltip = goog.dom.createDom('div','tooltip',response.user.blurbs[categoryId]);
                goog.dom.appendChild(self.rootElement,tooltip);
                goog.style.showElement(tooltip,false);

                var userElement = goog.dom.query('.user',element)[0];
                var prestigeElement = goog.dom.query('.description div',userElement)[0];
                goog.events.listen(userElement,goog.events.EventType.MOUSEOVER,function(e) {
                    var pos = goog.style.getRelativePosition(userElement,self.rootElement);
                    goog.style.setPosition(tooltip,pos.x,pos.y+50);
                    goog.style.showElement(tooltip,true);
                });
                goog.events.listen(userElement,goog.events.EventType.MOUSEOUT,function(e) {
                    goog.style.showElement(tooltip,false);
                });
            }
            // process a vote?
            if (canVote)
            {
                var coffee = goog.dom.query('.conversation:last-child a[name="upvote"]',self.rootElement)[0];
                goog.events.listen(coffee,goog.events.EventType.CLICK,function(e) {
                    goog.net.XhrIo.send('/upvote',function() {
                        goog.array.remove(self.conversation.votableUsers,response.user.id);
                        goog.array.forEach(goog.dom.query('a[name="upvote"] > img',self.rootElement),function(img) {
                            if (goog.string.toNumber(img.getAttribute('name')) == response.user.id)
                            {
                                (new goog.fx.dom.FadeOutAndHide(img.parentNode,500)).play();
                            }
                        });
                    },
                    'POST',
                    goog.uri.utils.buildQueryDataFromMap({ 'd_id':self.conversation.id,'user_id': response.user.id }));
                    e.preventDefault(); 
                });
            }
        }
        
        // clickhandler for mentions and user description
        goog.array.forEach(goog.dom.query('.section .mention, .description a:first-child',element),function(link) {
            goog.events.listen(link,goog.events.EventType.CLICK,userLinkHandler);
        });
        if (fadeIn) {
            (new goog.fx.dom.FadeInAndShow(element,500)).play();
        } else {
            goog.style.showElement(element,true);
        }
    }

    self.responses.push(response);

};

