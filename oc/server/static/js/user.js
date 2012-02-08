define(['underscore','socket','jquery','nav'],function(_,socket,__,nav) {
    return {
        user_id: undefined,
        key: undefined,
        init: function() {
             var self = this;
             // extract the user_id and key from the cookies
             _.each(document.cookie.split("; "),function(cookie) {
                var spl = cookie.split('=');
                if (spl[0] == 'user_id')
                    self.user_id = spl[1];
                else if (spl[0] == 'key')
                    self.key = spl[1];
            });
            socket.addCallback('user',function(u) {
                var currentPrestige = $("#miniProfile .prestige").html();
                var currentAvatar = $("#miniProfile img").attr('name');
                if (currentPrestige != u.prestige)
                {
                    $("#miniProfile .prestige").fadeOut(function() {
                        $(this).html(u.prestige);
                        $(this).css('color','yellow');
                        $(this).fadeIn(function() {
                        });
                    });
                }
                if (currentAvatar != u.avatar_image)
                {
                    $("#miniProfile img").attr('name',u.avatar_image);
                    $("#miniProfile img").attr('src','/static/images/avatars/'+u.avatar_image);
                }
            }); 
            $("#miniProfile a:first").hover(function() {
                $(this).next('div').find('h2').css('color','#ff8211');
            },function() {
                $(this).next('div').find('h2').css('color','white');
            });
            $("#miniProfile a:first").click(function() {
                self.go(self.user_id); 
                return false;
            });
        },
          changeAvatar: function(newAvatar) {
            var self = this;
            $.post("/avatars",{ avatar: newAvatar }, function() {
               self.go(self.user_id); 
            });
          },
          changeCover: function(newCover) {
            var self = this;
            $.post("/covers",{ cover: newCover }, function() {
               self.go(self.user_id); 
            });
          },
          go: function(user_id) {
            var self = this;
            var isMe = (self.user_id == user_id);
            $.getJSON('/user/'+user_id,function(data) {
                u = data.user;
                nav.hideAll();
                nav.setTitle(u.name);

                $("#dynamic").show();
                $("#dynamic").addClass('profile');
                //
                // write the profile HTML
                var html = '';
                if (isMe) html += '<a rel="#cover">';
                    html += '<img width="905" name="'+u.cover_image+'"';
                    
                    if (isMe) html += 'style="cursor: pointer" ';
                    html += 'src="/static/images/covers/'+u.cover_image+'" />';
                if (isMe) html += '</a>';

                if (isMe)html += '<a rel="#avatar">';
                    html += '<img width="100" height="100" name="'+u.avatar_image+'" ';
                    if (isMe) html += 'style="cursor: pointer" ';
                    html += 'src="/static/images/avatars/'+u.avatar_image+'" />';
                if (isMe) html += '</a>';

                html += ' <h2>'+u.name+'</h2>';
                $("#dynamic").html(html);

                // allow profile customization if isMe
                if (isMe) {
                    var coverOverlay = jQuery('<div id="cover" class="overlay">'+
                            '<div class="border"><h2>Select Cover</h2><div class="center"></div></div></div>');
                    
                    $("#dynamic").append(coverOverlay);

                    // process cover overlay click
                    $("#dynamic a[rel='#cover']").overlay({
                        onBeforeLoad: function(e) {
                            var selfOverlay = this;
                            $.getJSON("/covers",function(data) {
                                var table = '';
                                var pageSize = data.covers.length;
                                var paginate = function(pageNo) {
                                    var start = pageNo*pageSize;
                                    var table = '';
                                    var hasRight = start+pageSize < data.covers.length;
                                    var hasLeft = start != 0;
                                    for (var i=start; i < start+pageSize; i++)
                                    {
                                        var c = data.covers[i];
                                        table += '<div><img class="';
                                        if (u.cover_image == c)
                                            table += 'active';
                                         table += '" name="'+c+'" width="200" src="/static/images/covers/'+c+'" /></div>';
                                    }
                                    coverOverlay.find(".center").fadeOut(function() {
                                       $(this).html(table); 
                                       $(this).find("img").click(function() {
                                            if ($(this).attr('name') != u.cover_image) {
                                                self.changeCover($(this).attr('name'));
                                            }
                                            selfOverlay.close();
                                        });
                                        $(this).find("img").hover(function() {
                                            $(this).addClass('hover');
                                        },function() {
                                            $(this).removeClass('hover');
                                        });
                                       $(this).fadeIn(); 
                                    });
                                };
                                paginate(0);
                            });
                        },
                        mask: {
                            color: '#000',
                            loadSpeed: 200,
                            opacity: 0.3,
                        },
                        onClose: function() {
                            coverOverlay.find('.center').html('');
                        },
                        fixed: false 
                    });
            
                    var avatarOverlay = jQuery('<div id="avatar" class="overlay">'+
                            '<div class="border"><h2>Select Avatar</h2><div align="center"></div></div>');
                    
                    $("#dynamic").append(avatarOverlay);

                    // process overlay click
                    $("#dynamic a[rel='#avatar']").overlay({
                        onBeforeLoad: function(e) {
                            var selfOverlay = this;
                            $.getJSON("/avatars",function(data) {
                                var table = "<table>";
                                _.each(data.avatars,function(a,i) {
                                    if (i % 9 == 0)
                                        table += "<tr>";
                                    table += '<td><img class="';
                                    if (u.avatar_image == a)
                                        table += 'active';
                                     table += '" name="'+a+'" width="50" height="50" src="/static/images/avatars/'+a+'" /></td>';
                                    if ((i+1) % 9 == 0)
                                        table += "</tr>";
                                });
                                table += "</table>";
                                avatarOverlay.find("div[align='center']").html(table); 
                                avatarOverlay.find("img").click(function() {
                                    if ($(this).attr('name') != u.avatar_image) {
                                        self.changeAvatar($(this).attr('name'));
                                    }
                                    selfOverlay.close();
                                });
                                avatarOverlay.find("img").hover(function() {
                                    $(this).addClass('hover');
                                },function() {
                                    $(this).removeClass('hover');
                                });
                               
                            });
                        },
                        mask: {
                            color: '#000',
                            loadSpeed: 200,
                            opacity: 0.3,
                        },
                        onClose: function() {
                            // cleanup
                            avatarOverlay.find("div[align='center']").html(''); 
                        },
                        fixed: false 
                });
           }
        }); // getJson
      }
    }
});
