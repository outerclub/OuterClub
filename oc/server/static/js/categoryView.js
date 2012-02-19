goog.provide('oc.Category.View');
goog.provide('oc.Conversation.View');

goog.require('oc.Socket');
goog.require('oc.Category');
goog.require('oc.Nav');
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
goog.require('goog.uri.utils');

/**
 * @param {oc.Socket} socket
 * @param {oc.User.View} userView
 * @constructor
 */
oc.Category.View = function(socket,userView) {
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
};

/**
 * @param {string} name
 */
oc.Category.View.prototype.go = function(name) {
    oc.Nav.setTitle(name);

    var self = this;
    goog.net.XhrIo.send('/category/'+oc.Category.toUrl(name),function(e) {
        var categoryData = goog.json.unsafeParse(e.target.getResponseText());
        var posts = categoryData['posts'];
        var dynamic = goog.dom.getElement('dynamic');
        dynamic.innerHTML = '<div class="posts"></div>';
        var postsDiv = goog.dom.query('.posts',dynamic)[0];
        goog.dom.append(postsDiv,self.createConversations(false,posts));
        self.convoHandle(postsDiv);
        
        oc.Nav.hideAll();
        goog.style.showElement(dynamic,true);

        var canCreate = !categoryData['private'] || self.userView.user.admin;
        self.showHeading(name,categoryData['id'],categoryData['icon'],!categoryData['private']);
        self.socket.send({'register':['/happening','/user/'+self.userView.user.id,'/category/'+categoryData['id']]});
    });
    this.socket.addCallback('conversation',function(data) {
        var d = self.createConversations(true,[{'id':data['d_id'],'title':data['title'],'user':data['user'],'date':data['date']}]);
        goog.dom.insertChildAt(goog.dom.query('.posts')[0],d,0);
        self.convoHandle(goog.dom.query('.posts:first')[0]);
        (new goog.fx.dom.FadeInAndShow(d,500)).play();
    });
};

/**
 * @param {boolean} hide
 * @param {Array.<Object>} d_list
 * @return {Node}
 */
oc.Category.View.prototype.createConversations = function(hide,d_list) {
    var html = oc.Templates.Category.conversationList({hide:hide,conversationList:d_list});
    return goog.dom.htmlToDocumentFragment(html);
};

/**
 * @param {Element} convos
 */
oc.Category.View.prototype.convoHandle = function(convos) {
    var self = this;
    goog.array.forEach(goog.dom.query('h1 > a',convos),function(c) {
        goog.events.listen(c,goog.events.EventType.CLICK,function(e) {
            self.conversationView.go(this.getAttribute('name'));
            e.preventDefault();
        });
    });
    goog.array.forEach(goog.dom.query('.right a',convos),function(c) {
        goog.events.listen(c,goog.events.EventType.CLICK,function(e) {
            self.userView.go(this.getAttribute('name'));
            e.preventDefault();
        });
    });
};

/**
 * @param {string} name
 * @param {number} id
 * @param {string} icon
 * @param {boolean=} canCreate
 */
oc.Category.View.prototype.showHeading = function(name,id,icon,canCreate) {
    canCreate = goog.isBoolean(canCreate) ? canCreate : true;
    // change to the new category
    this.category = new oc.Category(id,name,icon);

    // show category head
    goog.dom.query('.heading h2')[0].innerHTML = name;
    var link = goog.dom.query('.heading a')[0];
    goog.style.showElement(goog.dom.query('.heading')[0],true);
    var img = goog.dom.query('.heading img')[0];
    if (!goog.isDefAndNotNull(icon) || icon == '')
    {
        goog.style.showElement(img,false);
    } else {
        img.setAttribute('src','/static/images/categories/'+icon);
        goog.style.showElement(img,true);
    }
    
    var newConvoButton = goog.dom.query('.heading .right button')[0];
    goog.style.showElement(newConvoButton,canCreate);

    goog.events.removeAll(link);
    var self = this;
    goog.events.listen(link,goog.events.EventType.CLICK,function(e) {
        self.go(name,id,icon);
        e.preventDefault();
    });
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
};

/**
 * @param {string} id
 */
oc.Conversation.View.prototype.go = function(id) {
   var self = this;
    var conversationDiv = goog.dom.getElement('conversation');
    // only proceed if changing conversation
   if (this.conversation == undefined ||  this.conversation.id != id) 
    {
        var usersView = goog.dom.query('#conversation .users')[0];
        usersView.innerHTML = '';
        goog.net.XhrIo.send('/conversation/'+id,function(e) {
            var data = goog.json.unsafeParse(e.target.getResponseText());
            self.conversation = oc.Conversation.extractFromJson(data);
            oc.Nav.hideAll();
            oc.Nav.setTitle(self.conversation.title); 

            // show category head
            self.categoryView.showHeading(self.conversation.category.name,self.conversation.category.id,self.conversation.category.icon);

            self.socket.send({'register':['/happening','/user/'+self.userView.user.id,'/conversation/'+id]});
            self.socket.addCallback('response',function(data) {
                self.createResponse(true,oc.Conversation.Response.extractFromJson(data));
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
                            self.userView.go(this.getAttribute('name'));
                            e.preventDefault();
                        });
                        goog.dom.append(usersView,userView);
                        (new goog.fx.dom.FadeInAndShow(userView,500)).play();
                        self.conversation.viewers[v] = '';
                    }
                }
            });
            
            goog.dom.query('#conversation .cover')[0].innerHTML = '<img width="905" src="/static/images/covers/'+self.conversation.user.cover_image+'" />';
            goog.dom.query('#conversation .room h2')[0].innerHTML = goog.string.htmlEscape(self.conversation.title,false);

            goog.array.forEach(goog.dom.query('#conversation .conversation'),function(c) {
                goog.dom.removeNode(c);
            });
            self.createResponse(false,new oc.Conversation.Response(-1,self.conversation.date,self.conversation.content,self.conversation.user));

            /**
             * Reply
             */
            var replyButton = goog.dom.query('.reply button')[0];
            goog.events.removeAll(replyButton);
            goog.events.listen(replyButton,goog.events.EventType.CLICK,function(e) {
                var content = goog.dom.query('.reply textarea')[0].value;
                goog.net.XhrIo.send('/reply',function(e) {
                    var data = goog.json.unsafeParse(e.target.getResponseText());
                    var errorView = goog.dom.query('.reply .error')[0];
                    if ('error' in data) {
                        errorView.innerHTML = data['error'];
                        (new goog.fx.dom.FadeInAndShow(errorView,500)).play();
                    } else {
                        (new goog.fx.dom.FadeOut(errorView,500)).play();
                        var textarea = goog.dom.query('.reply textarea')[0];
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
                self.createResponse(false,r);
            });
            
            goog.style.showElement(conversationDiv,true);

        }); 
    // switch to display (conversation already cached)
    } else if (this.conversation.id == id && !goog.style.isElementShown(conversationDiv))
    {
            oc.Nav.hideAll();
            oc.Nav.setTitle(self.conversation.title); 

            // show category head
            self.categoryView.showHeading(self.conversation.category.name,self.conversation.category.id,self.conversation.category.toUrl());
            goog.style.showElement(conversationDiv,true);
            self.socket.send({'register':['/happening','/user/'+self.userView.user.id,'/conversation/'+id]});
    }
};

/**
 * @param {boolean} fadeIn
 * @param {oc.Conversation.Response} response
 */
oc.Conversation.View.prototype.createResponse = function(fadeIn,response) {
    var previousD = goog.dom.query('.conversation');
    // get last full date
    var lastDateSplit = null;
    for (var x=previousD.length-1; x >= 0; x--)
    {
        var dates = goog.dom.query('.date span',previousD[x]);
        for (var y=dates.length-1; y >= 0; y--)
        {
            lastDateSplit = dates[y].innerHTML.replace('  ',' ').split(' ');
            if (lastDateSplit.length == 4)
            {
                break;
            }
        }
        if (lastDateSplit.length == 4)
        {
            break;
        }
    }
    var date = response.date;
    if (lastDateSplit != null)
    {
        var currentDateSplit = date.replace('  ',' ').split(' ');

        // same date as before?
        if (currentDateSplit[0] == lastDateSplit[0] && currentDateSplit[1] == lastDateSplit[1] &&
            currentDateSplit[2] == lastDateSplit[2])
        {
            // show just the time
            date = currentDateSplit[3];
        }
    }

    // create right float

    var self = this;
    var userLinkHandler = function(e) {
        self.userView.go(this.getAttribute('name'));
        e.preventDefault();
    };

    var content = response.content.replace(/\n/g,'<br />');
    var isAction = content.indexOf('/me') === 0;
    var lastDiscussion = goog.dom.query(".conversation:last-child");
    // combine the postings or create new one?
    if (!isAction && lastDiscussion.length == 1 && !goog.dom.classes.has(lastDiscussion[0],'action') && goog.dom.query('.user h2 a',lastDiscussion[0])[0].getAttribute('name') == response.user.id)
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
        
        goog.array.forEach(goog.dom.query('a',section),function(mention) {
            goog.events.listen(mention,goog.events.EventType.CLICK,userLinkHandler);
        });
    } else {
        // strip away /me and convert to an icon
        if (isAction)
            content = content.replace(/^\/me/,oc.Templates.Category.actionMe({response:response}));

        var canVote = goog.array.contains(self.conversation.votableUsers,response.user.id);
        var html = oc.Templates.Category.response({response:response,content:content,date:date,canVote:canVote});

        var element = /** @type {Element} */ goog.dom.htmlToDocumentFragment(html);
        goog.style.showElement(element,false);
        goog.dom.append(goog.dom.query('.responses')[0],element);
        
        // add clickhandlers for users
        goog.array.forEach(goog.dom.query('.description a:first-child',element),function(userLink) {
            goog.events.listen(userLink,goog.events.EventType.CLICK,userLinkHandler);
        });
        
        goog.array.forEach(goog.dom.query('.section > a',element),function(link) {
            goog.events.listen(link,goog.events.EventType.CLICK,userLinkHandler);
        });
        if (fadeIn) {
            (new goog.fx.dom.FadeInAndShow(element,500)).play();
        } else {
            goog.style.showElement(element,true);
        }
        // process a vote?
        if (canVote)
        {
            var coffee = goog.dom.query('.conversation:last-child a[name="upvote"]')[0];
            goog.events.listen(coffee,goog.events.EventType.CLICK,function(e) {
                goog.net.XhrIo.send('/upvote',function() {
                    goog.array.remove(self.conversation.votableUsers,response.user.id);
                    goog.array.forEach(goog.dom.query('a[name="upvote"] > img'),function(img) {
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

    if (fadeIn)
    {
        var responses = goog.dom.query('.responses')[0];
        responses.scrollTop = responses.scrollHeight;
    }

};

