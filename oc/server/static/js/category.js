define(['socket','nav','underscore'],function(socket,nav,_) {
    return {
        currentCategory: {
            name: undefined,
            id: undefined,
            href: undefined
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
                socket.send({'register':['/happening','/category/'+id]});
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
                + '<div class="post_content">'
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
        currentViewers: [],
        goConversation: function(id) {
            var self = this;
            $("#conversation .users").html('');
           this.currentViewers = [];
           $.getJSON('/conversation/'+id,function(data) {
                nav.hideAll();
                $('title').html(data.conversation.title+' - OuterClub');

                // show category head
                self.showCategoryHead(data.category_name,data.category_id,data.category_url);

                socket.send({'register':['/happening','/conversation/'+id]});
                socket.addCallback('response',function(data) {
                    self.createResponse(true,data.user,data.date,data.content);
                });
                socket.addCallback('viewers',function(viewers) {
                    // scan for removals
                    var toRemove = [];
                    for (var v in self.currentViewers)
                    {
                        if (!(v in viewers))
                        {
                            $("#v_"+v).fadeOut(function() {
                                $(this).remove();
                            });
                            delete self.currentViewers[v];
                        }
                    }
                    // scan for insertions
                    for (v in viewers) {
                        if (!(v in self.currentViewers)) {
                            user = jQuery('<img id="v_'+v+'"src="/static/images/new/avatars/'+viewers[v]+'" />');
                            user.hide();
                            $(".conversation_frame .users").append(user);
                            user.fadeIn();
                            self.currentViewers[v] = '';
                        }
                    }
                });
                
                $("#conversation .room h2").html(data.conversation.title);
                $("#conversation .conversation").remove();
                self.createResponse(false,data.conversation.user,data.conversation.date,data.conversation.content);

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
                    self.createResponse(false,r.user,r.date,r.content);
                });
                $("#conversation").show();

            }); 
        },
        createResponse: function(fadeIn,user,date,content) {
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
                // combine the postings or create new one?
                if (lastDiscussion.find('.user h2 a').html() == user.name)
                {
                    lastDiscussion.find('.content').append('<br />'+content+'<div class="date">'+date+'</div><br />');
                } else {
                    var str ='<div class="conversation" style="display: none">';
                    str += '<div class="user">'+
                            '<div class="description">'+
                                '<h2><a href="/user/'+user.user_id+'">'+user.name+'</a></h2>'+
                                '<div>Prestige: '+user.prestige+'</div>'+
                            '</div>'+
                            '<img src="/static/images/new/avatars/'+user.avatar_image+'" />'+
                        '</div>'+
                        '<div class="content">'+
                            content+
                            '<div class="date">'+date+'</div><br />'+
                        '</div>';
                    str += '</div>';
                    $(".responses").append(str);
                    if (fadeIn) {
                        $(".conversation:last").fadeIn();
                    } else {
                        $(".conversation:last").show();
                    }
                }

         }

    }
});