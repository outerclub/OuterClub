define(['socket','nav','underscore','user'],function(socket,nav,_,user) {
    return {
        currentCategory: {
            name: undefined,
            id: undefined,
            href: undefined
        },
        currentConversation: {
            id: undefined,
            viewers: []
        },
        goCategory: function(name,id,href) {
            $('title').html(name+' - OuterClub');
            this.currentCategory.name = name;
            this.currentCategory.id = id;
            this.currentCategory.href = href;

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
              html += '<div title="'+d.title+'" class="post" '+(hide ? 'style="display: none"' : '')+ ' id="'+d.id+'">'
                + '<div class="post_content"><img src="/static/images/icons/conversation.png" /> '
                + '<h1>'+d.title+'</h1>'
                + '<div>Started by <a href="/user/'+d.user.user_id+'">'+d.user.name+'</a> on '+d.date+'</div>'
                + '</div>'
                + '<div class="post_nav">'
                //+ '<a class="tag" href="#">testTag</a>'
                + '</div><div class="clear"></div></div>';
            });
            html = jQuery(html);
            var self = this;
            html.click(function() {
                self.goConversation($(this).attr('id'));
            });
            return html;
        },
        showCategoryHead: function(name,id,href) {
            // show category head
            $("#category_head h2").html(name);
            $("#category_head a").attr('href',href);
            $("#category_head").show();

            $("#category_head a").unbind();
            var self = this;
            $("#category_head a").click(function() {
                self.goCategory(name,id,href);
                return false;
            });
        },
        goConversation: function(id) {
           var self = this;
            // only proceed if changing conversation or not displayed
           if (this.currentConversation.id != id || !$("#conversation").is(':visible')) 
            {
                $("#conversation .users").html('');
               this.currentConversation.viewers = [];
               this.currentConversation.id = id;
               $.getJSON('/conversation/'+id,function(data) {
                    nav.hideAll();
                    $('title').html(data.conversation.title+' - OuterClub');

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
                                var userView = jQuery('<img id="v_'+v+'"src="/static/images/new/avatars/'+viewers[v]+'" />');
                                userView.hide();
                                $(".conversation_frame .users").append(userView);
                                userView.fadeIn();
                                self.currentConversation.viewers[v] = '';
                            }
                        }
                    });
                    
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
            }
        },
        createResponse: function(fadeIn,r_id,r_user,date,content,canVote) {
                var previousD = $(".conversation");
                // get last full date
                var lastDateSplit;
                for (var x=previousD.size()-1; x >= 0; x--)
                {
                    var dates = $(previousD.get(x)).find('.date');
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
                var dateHtml ='<div class="right date">'+date;
                if (canVote)
                {
                    dateHtml +='<a href="/upvote"><img width="20" height="20" src="/static/images/coffee.png" /></a>';
                }
                dateHtml += '</div>';

                // combine the postings or create new one?
                if (lastDiscussion.find('.user h2 a').html() == r_user.name)
                {
                    lastDiscussion.find('.content').append('<div class="section">'+content+dateHtml+"</div>");
                } else {
                    var str ='<div class="conversation" style="display: none">';
                    str += '<div class="user">'+
                            '<div class="description">'+
                                '<h2><a href="/user/'+r_user.user_id+'">'+r_user.name+'</a></h2>'+
                                '<div>Prestige: '+r_user.prestige+'</div>'+
                            '</div>'+
                            '<img src="/static/images/new/avatars/'+r_user.avatar_image+'" />'+
                        '</div>'+
                        '<div class="content"><div class="section">'+
                            content+dateHtml+
                        '</div></div>';
                    str += '</div>';
                    $(".responses").append(str);
                    if (fadeIn) {
                        $(".conversation:last").fadeIn();
                    } else {
                        $(".conversation:last").show();
                    }
                }

                if (canVote)
                {
                    $(".conversation:last .section:last a").click(function() {
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

         }

    }
});
