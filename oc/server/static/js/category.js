define(['socket','nav','underscore','user'],function(socket,nav,_,user) {
    return {
        currentCategory: {
            name: undefined,
            id: undefined,
            href: undefined
        },
        currentConversation: {
            data: undefined,
            viewers: []
        },
        goCategory: function(name,id,href) {
            nav.setTitle(name);

            var self = this;
            $.getJSON(href,function(data) {
                $("#dynamic").html('');
                $("#dynamic").append('<div class="posts"></div>');
                $('.posts').append(self.createConversations(false,data['posts']));
                
                nav.hideAll();
                $("#dynamic").show();

                self.showCategoryHead(name,id,href);
                socket.send({'register':['/happening','/user/'+user.user_id,'/category/'+id]});
            });
            socket.addCallback('conversation',function(data) {
                var d = self.createConversations(true,[{id:data.d_id,title:data.title,user:data.user,date:data.date}]);
                $('.posts').prepend(d);
                d.fadeIn();
            });
        },
        createConversations: function(hide,d_list) {
            //id,title,user,date
            var html = '';
            _.each(d_list,function(d) {
              html += '<div title="'+d.title+'" class="post" '+(hide ? 'style="display: none"' : '')+ '>'
                + '<div class="left"><img src="/static/images/icons/conversation.png" /> '
                + '<h1><a href="/conversation/'+d.id+'" name="'+d.id+'">'+d.title+'</a></h1></div>'
                + '<div class="right sub">'
                    +'<img width="50" height="50" src="/static/images/avatars/'+d.user.avatar_image+'" />'
                    +'<div class="block"><a href="/user/'+d.user.user_id+'" name="'+d.user.user_id+'">'+d.user.name+'</a></div>'
                    +'<div class="block">'+d.date+'</div></div>'
                +'</div>';
            });
            html = jQuery(html);
            var self = this;
            html.find("h1 > a").click(function() {
                self.goConversation($(this).attr('name'));
                return false;
            });
            html.find(".right a").click(function() {
                user.go($(this).attr('name'));
                return false;
            });
            return html;
        },
        showCategoryHead: function(name,id,href) {
            // change to the new category
            this.currentCategory.name = name;
            this.currentCategory.id = id;
            this.currentCategory.href = href;

            // show category head
            $(".heading h2").html(name);
            $(".heading a").attr('href',href);
            $(".heading").show();

            $(".heading a").unbind();
            var self = this;
            $(".heading a").click(function() {
                self.goCategory(name,id,href);
                return false;
            });
        },
        goConversation: function(id) {
           var self = this;
            // only proceed if changing conversation or not not displayed
           if (this.currentConversation.data == undefined ||  this.currentConversation.data.conversation.id != id) 
            {
                $("#conversation .users").html('');
               this.currentConversation.viewers = [];
               $.getJSON('/conversation/'+id,function(data) {
                    nav.hideAll();
                    nav.setTitle(data.conversation.title); 
                    self.currentConversation.data = data;

                    // show category head
                    self.showCategoryHead(data.category_name,data.category_id,data.category_url);

                    socket.send({'register':['/happening','/user/'+user.user_id,'/conversation/'+id]});
                    socket.addCallback('response',function(data) {
                        self.createResponse(true,data.r_id,data.user,data.date,data.content,data.user.user_id != user.user_id);
                    });
                    socket.addCallback('viewers',function(viewers) {
                        // scan for removals
                        var toRemove = [];
                        for (var v in self.currentConversation.viewers)
                        {
                            if (!(v in viewers))
                            {
                                $("#v_"+v).fadeOut(function() {
                                    $(this).remove();
                                });
                                delete self.currentConversation.viewers[v];
                            }
                        }
                        // scan for insertions
                        for (v in viewers) {
                            if (!(v in self.currentConversation.viewers)) {
                                var userView = jQuery('<a href="/users/'+v+'" name="'+v+'"><img width="50" height="50" id="v_'+v+'"src="/static/images/avatars/'+viewers[v]+'" /></a>');
                                userView.hide();
                                userView.click(function() {
                                    user.go($(this).attr('name'));
                                    return false;
                                });
                                $("#conversation .users").append(userView);
                                userView.fadeIn();
                                self.currentConversation.viewers[v] = '';
                            }
                        }
                    });
                    
                    $("#conversation .cover").html('<img width="905" src="/static/images/covers/'+data.conversation.user.cover_image+'" />');
                    $("#conversation .room h2").html(data.conversation.title);
                    $("#conversation .conversation").remove();
                    self.createResponse(false,0,data.conversation.user,data.conversation.date,data.conversation.content,false);

                    /**
                     * Reply
                     */
                    $(".reply button").unbind();
                    $(".reply button").click(function() {
                        $.ajax({
                            type:'POST',
                            url:'/reply',
                            data: { d_id:data.conversation.id, data: $(".reply textarea").val()},
                            success: function(data) {
                                if ('error' in data) {
                                    $(".reply .error").html(data['error']);
                                    $(".reply .error").fadeIn();
                                } else {
                                    $(".reply .error").fadeOut();
                                    $("textarea").val('');
                                }
                            },
                            dataType: 'json'
                        });
                    });
                    _.each(data.responses,function(r) {
                        self.createResponse(false,r.r_id,r.user,r.date,r.content,r.canVote);
                    });
                    $("#conversation").show();

                }); 
            } else if (this.currentConversation.data.conversation.id == id && !$("#conversation").is(':visible'))
            {
                    nav.hideAll();
                    var data = self.currentConversation.data;
                    nav.setTitle(data.conversation.title); 

                    // show category head
                    self.showCategoryHead(data.category_name,data.category_id,data.category_url);
                    $("#conversation").show();
                    socket.send({'register':['/happening','/user/'+user.user_id,'/conversation/'+id]});
            }
        },
        createResponse: function(fadeIn,r_id,r_user,date,content,canVote) {
                var previousD = $(".conversation");
                // get last full date
                var lastDateSplit;
                for (var x=previousD.size()-1; x >= 0; x--)
                {
                    var dates = $(previousD.get(x)).find('.date span');
                    for (var y=dates.size()-1; y >= 0; y--)
                    {
                        lastDateSplit = $(dates.get(y)).html().replace('  ',' ').split(' ');
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

                var lastDiscussion = $(".conversation:last");
                // create right float
                var dateHtml ='<div class="right date"><span>'+date+'</span>';

                // display coffee upvote?
                if (canVote)
                    dateHtml +='<a href="/upvote"><img width="20" height="20" src="/static/images/coffee.png" /></a>';
                dateHtml += '</div>';

                var mentionHandler = function() {
                    user.go($(this).attr('name'));
                    return false;
                };

                content = content.replace(/\n/g,'<br />');
                var isAction = content.indexOf('/me') === 0;
                // combine the postings or create new one?
                if (!isAction && !lastDiscussion.hasClass('action') && lastDiscussion.find('.user h2 a').html() == r_user.name)
                {
                    var section = jQuery('<div class="section">'+dateHtml+content+"</div>");
                    section.hide();
                    lastDiscussion.find('.content').append(section);
                    if (fadeIn)
                        section.fadeIn();
                    else
                        section.show();
                    
                    section.children("a").click(mentionHandler);
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
                            '<img width="50" height="50" src="/static/images/avatars/'+r_user.avatar_image+'" />'+
                        '</div>';
                    }
                    if (isAction)
                        content = content.replace(/^\/me/,'<a href="/user/'+r_user.user_id+'" name="'+r_user.user_id+'"><img width="30" height="30" src="/static/images/avatars/'+r_user.avatar_image+'" /></a>');
                    str += '<div class="content"><div class="section">'+
                            dateHtml+content+
                        '</div></div>';
                    if (!isAction)
                        str += '</div>';
                    var element = jQuery(str);
                    element.hide();
                    element.find(".section > a").click(mentionHandler);
                    $(".responses").append(element);
                    if (fadeIn) {
                        element.fadeIn();
                    } else {
                        element.show();
                    }
                }

                // process a vote?
                if (canVote)
                {
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
                }
                if (fadeIn)
                    $('.responses').animate({scrollTop: $('.responses')[0].scrollHeight});

         }

    }
});
