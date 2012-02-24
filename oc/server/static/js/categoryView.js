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
goog.require('goog.uri.utils');
goog.require('oc.Tracking');

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

};

/**
 * @param {string} url
 */
oc.Category.View.prototype.go = function(url) {
    var self = this;
    goog.net.XhrIo.send('/category/'+url,function(e) {
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
        self.setCategory(categoryData['id'],!categoryData['private']);
        
        oc.Nav.setTitle(self.category.name);
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
    goog.array.forEach(goog.dom.query('.convo,.block a',convos),function(c) {
        goog.events.listen(c,goog.events.EventType.CLICK,function(e) {
            oc.Nav.go(this.getAttribute('href'));
            e.preventDefault();
        });
    });
};

/**
 * @param {number} id
 * @param {boolean=} canCreate
 */
oc.Category.View.prototype.setCategory = function(id,canCreate) {
    canCreate = goog.isBoolean(canCreate) ? canCreate : true;
    // change to the new category
    this.category = this.categories[id];

    // show category head
    goog.dom.query('.heading h2')[0].innerHTML = this.category.name;
    var link = goog.dom.query('.heading a')[0];
    link.setAttribute('href','/category/'+this.category.url);

    goog.style.showElement(goog.dom.query('.heading')[0],true);
    var img = goog.dom.query('.heading img')[0];
    if (!goog.isDefAndNotNull(this.category.icon) || this.category.icon == '')
    {
        goog.style.showElement(img,false);
    } else {
        img.setAttribute('src','/static/images/categories/'+this.category.icon);
        goog.style.showElement(img,true);
    }
    
    var newConvoButton = goog.dom.query('.heading .right button')[0];
    goog.style.showElement(newConvoButton,canCreate);

    goog.events.removeAll(link);
    var self = this;
    goog.events.listen(link,goog.events.EventType.CLICK,function(e) {
        oc.Nav.go(this.getAttribute('href'));
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
 * @param {number} id
 */
oc.Conversation.View.prototype.go = function(id) {
    oc.Tracking.page('/conversation/'+id);
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
            self.categoryView.setCategory(self.conversation.categoryId);

            self.socket.send({'register':['/happening','/user/'+self.userView.user.id,'/conversation/'+id]});
            self.socket.addCallback('response',function(data) {
                self.createResponse(true,oc.Conversation.Response.extractFromJson(data),self.conversation.categoryId);
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
            
            goog.dom.query('#conversation .cover')[0].innerHTML = '<img width="905" src="/static/images/covers/'+self.conversation.user.cover_image+'" />';
            goog.dom.query('#conversation .room h2')[0].innerHTML = goog.string.htmlEscape(self.conversation.title,false);

            goog.array.forEach(goog.dom.query('#conversation .conversation'),function(c) {
                goog.dom.removeNode(c);
            });
            self.createResponse(false,new oc.Conversation.Response(-1,self.conversation.date,self.conversation.content,self.conversation.user),self.conversation.categoryId);

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
                self.createResponse(false,r,self.conversation.categoryId);
            });
            
            goog.style.showElement(conversationDiv,true);

        }); 
    // switch to display (conversation already cached)
    } else if (this.conversation.id == id && !goog.style.isElementShown(conversationDiv))
    {
            oc.Nav.hideAll();
            oc.Nav.setTitle(self.conversation.title); 

            // show category head
            self.categoryView.setCategory(self.conversation.categoryId);
            goog.style.showElement(conversationDiv,true);
            self.socket.send({'register':['/happening','/user/'+self.userView.user.id,'/conversation/'+id]});
    }
};

/**
 * @param {boolean} fadeIn
 * @param {oc.Conversation.Response} response
 */
oc.Conversation.View.prototype.createResponse = function(fadeIn,response,categoryId) {
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

    // display shortened date?
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
        oc.Nav.go(this.getAttribute('href'));
        e.preventDefault();
    };

    var content = oc.Util.replaceLinks(goog.string.newLineToBr(response.content));
    var isAction = content.indexOf('/me') === 0;
    var lastDiscussion = goog.dom.query(".conversation:last-child");

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
            content = content.replace(/^\/me/,oc.Templates.Category.actionMe({response:response}));

        var canVote = goog.array.contains(self.conversation.votableUsers,response.user.id);
        var html = oc.Templates.Category.response({response:response,content:content,date:date,canVote:canVote});

        var element = /** @type {Element} */ goog.dom.htmlToDocumentFragment(html);
        goog.style.showElement(element,false);

        var responsesElement = goog.dom.query('.responses')[0];
        goog.dom.appendChild(responsesElement,element);

        // generate the tooltip
        if (categoryId in response.user.blurbs)
        {
            var tooltip = goog.dom.createDom('div','tooltip',response.user.blurbs[categoryId]);
            var conversation = goog.dom.getElement('conversation');
            goog.dom.appendChild(conversation,tooltip);
            goog.style.showElement(tooltip,false);

            var userElement = goog.dom.query('.user',element)[0];
            var prestigeElement = goog.dom.query('.description div',userElement)[0];
            goog.events.listen(userElement,goog.events.EventType.MOUSEOVER,function(e) {
                var pos = goog.style.getRelativePosition(userElement,conversation);
                goog.style.setPosition(tooltip,pos.x,pos.y+50);
                goog.style.showElement(tooltip,true);
            });
            goog.events.listen(userElement,goog.events.EventType.MOUSEOUT,function(e) {
                goog.style.showElement(tooltip,false);
            });
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

