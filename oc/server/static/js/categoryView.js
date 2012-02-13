goog.provide('oc.Category.View');
goog.provide('oc.Conversation.View');

goog.require('oc.Socket');
goog.require('oc.Category');
goog.require('oc.Nav');
goog.require('oc.User');
goog.require('oc.Conversation');
goog.require('goog.array');
goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.style');
goog.require('goog.events');
goog.require('goog.events.EventType');

/**
 * @constructor
 */
oc.Category.View = function(socket,user) {
    this.category = undefined;
    this.socket = socket;
    this.user = user;
    this.conversationView = new oc.Conversation.View(this,socket,user);
};
oc.Category.View.prototype.goCategory = function(name,id,href) {
    oc.Nav.setTitle(name);

    var self = this;
    goog.net.XhrIo.send(href,function(e) {
        var posts = goog.json.unsafeParse(e.target.getResponseText())['posts'];
        var dynamic = goog.dom.getElement('dynamic');
        dynamic.innerHTML = '<div class="posts"></div>';
        var postsDiv = goog.dom.query('.posts',dynamic)[0];
        goog.dom.append(postsDiv,self.createConversations(false,posts));
        self.convoHandle(postsDiv);
        
        oc.Nav.hideAll();
        goog.style.showElement(dynamic,true);

        self.showHeading(name,id,href);
        self.socket.send({'register':['/happening','/user/'+self.user.user_id,'/category/'+id]});
    });
    this.socket.addCallback('conversation',function(data) {
        var d = self.createConversations(true,[{id:data['d_id'],title:data['title'],user:data['user'],date:data['date']}]);
        $('.posts').prepend(d);
        d.fadeIn();
    });
};

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

oc.Category.View.prototype.showHeading = function(name,id,href) {
    // change to the new category
    this.category = new oc.Category(name,id,href);

    // show category head
    goog.dom.query('.heading h2')[0].innerHTML = name;
    var link = goog.dom.query('.heading a')[0];
    link.setAttribute('href',href);
    goog.style.showElement(goog.dom.query('.heading')[0],true);

    goog.events.removeAll(link);
    var self = this;
    goog.events.listen(link,goog.events.EventType.CLICK,function(e) {
        self.goCategory(name,id,href);
        e.preventDefault();
    });
};

/**
 * @constructor
 */
oc.Conversation.View = function(category_view,socket,user) {
    this.categoryView = category_view;
    this.socket = socket;
    this.user = user;
};
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
            self.categoryView.showHeading(self.conversation.category.name,self.conversation.category.id,self.conversation.category.href);

            self.socket.send({'register':['/happening','/user/'+self.user.user_id,'/conversation/'+id]});
            self.socket.addCallback('response',function(data) {
                self.createResponse(true,data.r_id,data.user,data.date,data.content,data.user.user_id != self.user.user_id);
            });
            self.socket.addCallback('viewers',function(viewers) {
                // scan for removals
                var toRemove = [];
                for (var v in self.conversation.viewers)
                {
                    if (!(v in viewers))
                    {
                        /**
                        TODO
                        $("#v_"+v).fadeOut(function() {
                            $(this).remove();
                        });
                        */
                        delete self.conversation.viewers[v];
                    }
                }
                // scan for insertions
                for (v in viewers) {
                    if (!(v in self.conversation.viewers)) {
                        var userView = goog.dom.htmlToDocumentFragment('<a href="/users/'+v+'" name="'+v+'"><img id="v_'+v+'"src="/static/images/avatars/thumbs/'+viewers[v]+'" /></a>');
                        goog.style.showElement(userView,false);
                        goog.events.listen(userView,goog.events.EventType.CLICK,function(e) {
                            self.user.go(this.getAttribute('name'));
                            e.preventDefault();
                        });
                        goog.dom.append(usersView,userView);
                        // TODO
                        //userView.fadeIn();
                        self.conversation.viewers[v] = '';
                    }
                }
            });
            
            goog.dom.query('#conversation .cover')[0].innerHTML = '<img width="905" src="/static/images/covers/'+self.conversation.user.cover_image+'" />';
            goog.dom.query('#conversation .room h2')[0].innerHTML = self.conversation.title;

            goog.array.forEach(goog.dom.query('#conversation .conversation'),function(c) {
                goog.dom.removeNode(c);
            });
            self.createResponse(false,0,self.conversation.user,self.conversation.date,self.conversation.content,false);

            /**
             * Reply
             */
            var replyButton = goog.dom.query('.reply button')[0];
            goog.events.removeAll(replyButton);
            goog.events.listen(replyButton,goog.events.EventType.CLICK,function(e) {
                /* TODO
                $.ajax({
                    type:'POST',
                    url:'/reply',
                    data: { d_id:self.conversation.id, data: $(".reply textarea").val()},
                    success: function(data) {
                        if ('error' in data) {
                            $(".reply .error").html(data['error']);
                            $(".reply .error").fadeIn();
                        } else {
                            $(".reply .error").fadeOut();
                            $("textarea").val('');
                            $("textarea").focus();
                        }
                    },
                    dataType: 'json'
                });
                */
            });
            goog.array.forEach(self.conversation.responses,function(r) {
                self.createResponse(false,r.id,r.user,r.date,r.content,r.canVote);
            });
            goog.style.showElement(conversationDiv,true);

        }); 
    // switch to display (conversation already cached)
    } else if (this.conversation.id == id && !goog.style.isElementShown(conversationDiv))
    {
            oc.Nav.hideAll();
            oc.Nav.setTitle(self.conversation.title); 

            // show category head
            self.showHeading(self.conversation.category.name,self.conversation.category.id,self.conversation.category.href);
            goog.style.showElement(conversationDiv,true);
            self.socket.send({'register':['/happening','/user/'+self.user.user_id,'/conversation/'+id]});
    }
},
oc.Conversation.View.prototype.createResponse = function(fadeIn,r_id,r_user,date,content,canVote) {
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
    if (canVote)
        dateHtml +='<a href="/upvote"><img width="20" height="20" src="/static/images/coffee.png" /></a>';
    dateHtml += '</div>';

    var self = this;
    var mentionHandler = function(e) {
        self.user.go(this.getAttribute('name'));
        e.preventDefault();
    };

    content = content.replace(/\n/g,'<br />');
    var isAction = content.indexOf('/me') === 0;
    var lastDiscussion = goog.dom.query(".conversation:last");
    // combine the postings or create new one?
    if (!isAction && lastDiscussion.length == 1 && !goog.dom.classes.has(lastDiscussion[0],'action') && goog.dom.query('.user h2 a',lastDiscussion[0]).innerHtml == r_user.name)
    {
        var section = goog.dom.createDom('div','section',dateHtml+content);
        goog.style.showElement(section,false);
        goog.dom.append(goog.dom.query('.content',lastDiscussion[0]),section);
        if (fadeIn)
        {
            // TODO
            //section.fadeIn();
        }else
            goog.style.showElement(section,true);
        
        goog.dom.query('a',section);
        //TODO
        //section.children("a").click(mentionHandler);
    } else {
        // create a new posting
        var str ='<div class="conversation';
        if (isAction) str += ' action';
        str += '">';
        if (!isAction)
        {
            str += '<div class="user">'+
                '<div class="description">'+
                    '<h2><a href="/user/'+r_user.user_id+'" name="'+r_user.user_id+'">'+r_user.name+'</a></h2>'+
                    '<div>Prestige: '+r_user.prestige+'</div>'+
                '</div>'+
                '<img src="/static/images/avatars/thumbs/'+r_user.avatar_image+'" />'+
            '</div>';
        }
        if (isAction)
            content = content.replace(/^\/me/,'<a href="/user/'+r_user.user_id+'" name="'+r_user.user_id+'"><img width="30" height="30" src="/static/images/avatars/'+r_user.avatar_image+'" /></a>');
        str += '<div class="content"><div class="section">'+
                dateHtml+content+
            '</div></div>';
        if (!isAction)
            str += '</div>';
        var element = goog.dom.htmlToDocumentFragment(str);
        goog.style.showElement(element,false);
        goog.dom.append(goog.dom.query('.responses')[0],element);
        
        goog.array.forEach(goog.dom.query('.section > a',element),function(link) {
            goog.events.listen(link,goog.events.EventType.CLICK,mentionHandler);
        });
        if (fadeIn) {
            // TODO
            //element.fadeIn();
        } else {
            goog.style.showElement(element,true);
        }
    }

    // process a vote?
    if (canVote)
    {
        /*TODO
        $(".conversation:last .section:last .date a").click(function() {
            var self = this;
            $.ajax({
                type:'POST',
                url:'/upvote',
                data: { r_id:r_id },
                success: function(data) {
                    $(self).fadeOut(); 
                },
                dataType: 'json'
            });
            return false;
        });
        */
    }
    if (fadeIn)
        $('.responses').animate({scrollTop: $('.responses')[0].scrollHeight});

};

