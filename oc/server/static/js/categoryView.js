goog.provide('oc.Category.View');
goog.provide('oc.Conversation.View');

goog.require('oc.Socket');
goog.require('oc.Category');
goog.require('oc.Nav');
goog.require('oc.User');
goog.require('oc.Conversation');
goog.require('oc.Conversation.Response');
goog.require('goog.array');
goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.fx.dom');
goog.require('goog.fx.Transition');
goog.require('goog.style');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.uri.utils');

/**
 * @param {oc.Socket} socket
 * @param {oc.User} user
 * @constructor
 */
oc.Category.View = function(socket,user) {
    this.category = undefined;
    this.socket = socket;
    this.user = user;
    this.conversationView = new oc.Conversation.View(this,socket,user);
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

        self.showHeading(name,categoryData['id'],categoryData['icon']);
        self.socket.send({'register':['/happening','/user/'+self.user.id,'/category/'+categoryData['id']]});
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
    //id,title,user,date
    var html = '';
    goog.array.forEach(d_list,function(d) {
      html += '<div title="'+d['title']+'" class="post" '+(hide ? 'style="display: none"' : '')+ '>'
        + '<div class="left"><img src="/static/images/icons/conversation.png" /> '
        + '<h1><a href="/conversation/'+d['id']+'" name="'+d['id']+'">'+d['title']+'</a></h1></div>'
        + '<div class="right sub">'
            +'<img src="/static/images/avatars/thumbs/'+d['user']['avatar_image']+'" />'
            +'<div class="block"><a href="/user/'+d['user']['user_id']+'" name="'+d['user']['user_id']+'">'+d['user']['name']+'</a></div>'
            +'<div class="block">'+d['date']+'</div></div>'
        +'</div>';
    });
    return goog.dom.htmlToDocumentFragment(html);
}

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
            self.user.go(this.getAttribute('name'));
            e.preventDefault();
        });
    });
};

/**
 * @param {string} name
 * @param {string} id
 * @param {string} icon
 */
oc.Category.View.prototype.showHeading = function(name,id,icon) {
    // change to the new category
    this.category = new oc.Category(id,name,icon);

    // show category head
    goog.dom.query('.heading h2')[0].innerHTML = name;
    var link = goog.dom.query('.heading a')[0];
    goog.style.showElement(goog.dom.query('.heading')[0],true);
    goog.dom.query('.heading img')[0].setAttribute('src','/static/images/categories/'+icon);

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
 * @param {oc.User} user
 * @constructor
 */
oc.Conversation.View = function(category_view,socket,user) {
    this.categoryView = category_view;
    this.socket = socket;
    this.user = user;
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

            self.socket.send({'register':['/happening','/user/'+self.user.id,'/conversation/'+id]});
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
                        var userView = /** @type {Element} */ goog.dom.htmlToDocumentFragment('<a href="/users/'+v+'" name="'+v+'"><img id="v_'+v+'"src="/static/images/avatars/thumbs/'+viewers[v]+'" /></a>');
                        goog.style.showElement(userView,false);
                        goog.events.listen(userView,goog.events.EventType.CLICK,function(e) {
                            self.user.go(this.getAttribute('name'));
                            e.preventDefault();
                        });
                        goog.dom.append(usersView,userView);
                        (new goog.fx.dom.FadeInAndShow(userView,500)).play();
                        self.conversation.viewers[v] = '';
                    }
                }
            });
            
            goog.dom.query('#conversation .cover')[0].innerHTML = '<img width="905" src="/static/images/covers/'+self.conversation.user.cover_image+'" />';
            goog.dom.query('#conversation .room h2')[0].innerHTML = self.conversation.title;

            goog.array.forEach(goog.dom.query('#conversation .conversation'),function(c) {
                goog.dom.removeNode(c);
            });
            self.createResponse(false,new oc.Conversation.Response('',self.conversation.date,self.conversation.content,self.conversation.user,false));

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
                        var textarea = goog.dom.query('textarea')[0];
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
            self.categoryView.showHeading(self.conversation.category.name,self.conversation.category.id,self.conversation.category.href);
            goog.style.showElement(conversationDiv,true);
            self.socket.send({'register':['/happening','/user/'+self.user.id,'/conversation/'+id]});
    }
};

/**
 * @param {boolean} fadeIn
 * @param {oc.Conversation.Response} response
 */
oc.Conversation.View.prototype.createResponse = function(fadeIn,response) {
    var previousD = goog.dom.query('.conversation');
    // get last full date
    var lastDateSplit;
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
    var dateHtml ='<div class="right date"><span>'+date+'</span>';

    // display coffee upvote?
    if (response.canVote)
        dateHtml +='<a href="/upvote"><img width="20" height="20" src="/static/images/coffee.png" /></a>';
    dateHtml += '</div>';

    var self = this;
    var mentionHandler = function(e) {
        self.user.go(this.getAttribute('name'));
        e.preventDefault();
    };

    var content = response.content.replace(/\n/g,'<br />');
    var isAction = content.indexOf('/me') === 0;
    var lastDiscussion = goog.dom.query(".conversation:last");
    // combine the postings or create new one?
    if (!isAction && lastDiscussion.length == 1 && !goog.dom.classes.has(lastDiscussion[0],'action') && goog.dom.query('.user h2 a',lastDiscussion[0])[0].innerHTML == response.user.name)
    {
        var section = goog.dom.createDom('div','section',goog.dom.htmlToDocumentFragment(dateHtml+content));
        goog.style.showElement(section,false);
        goog.dom.append(goog.dom.query('.content',lastDiscussion[0])[0],section);
        if (fadeIn)
        {
            (new goog.fx.dom.FadeInAndShow(section,500)).play();
        }else
            goog.style.showElement(section,true);
        
        goog.array.forEach(goog.dom.query('a',section),function(mention) {
            goog.events.listen(mention,goog.events.EventType.CLICK,mentionHandler);
        });
    } else {
        // create a new posting
        var str ='<div class="conversation';
        if (isAction) str += ' action';
        str += '">';
        if (!isAction)
        {
            str += '<div class="user">'+
                '<div class="description">'+
                    '<h2><a href="/user/'+response.user.id+'" name="'+response.user.id+'">'+response.user.name+'</a></h2>'+
                    '<div>Prestige: '+response.user.prestige+'</div>'+
                '</div>'+
                '<img src="/static/images/avatars/thumbs/'+response.user.avatar_image+'" />'+
            '</div>';
        }
        if (isAction)
            content = content.replace(/^\/me/,'<a href="/user/'+response.user.id+'" name="'+response.user.id+'"><img width="30" height="30" src="/static/images/avatars/'+response.user.avatar_image+'" /></a>');
        str += '<div class="content"><div class="section">'+
                dateHtml+content+
            '</div></div>';
        if (!isAction)
            str += '</div>';
        var element = /** @type {Element} */ goog.dom.htmlToDocumentFragment(str);
        goog.style.showElement(element,false);
        goog.dom.append(goog.dom.query('.responses')[0],element);
        
        goog.array.forEach(goog.dom.query('.section > a',element),function(link) {
            goog.events.listen(link,goog.events.EventType.CLICK,mentionHandler);
        });
        if (fadeIn) {
            (new goog.fx.dom.FadeInAndShow(element,500)).play();
        } else {
            goog.style.showElement(element,true);
        }
    }

    // process a vote?
    if (response.canVote)
    {
        var coffee = goog.dom.query('.conversation:last .section:last .date a')[0];
        goog.events.listen(coffee,goog.events.EventType.CLICK,function(e) {
            goog.net.XhrIo.send('/upvote',function() { (new goog.fx.dom.FadeOut(coffee,500)).play() },
                'POST',
                goog.uri.utils.buildQueryDataFromMap({ 'r_id': response.id }));
            e.preventDefault(); 
        });
    }
    if (fadeIn)
    {
        var responses = goog.dom.query('.responses')[0];
        responses.scrollTop = responses.scrollHeight;
    }

};

