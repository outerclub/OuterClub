goog.provide('oc.User');
goog.require('oc.Socket');
goog.require('oc.Nav');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.require('goog.style');

/**
 * @constructor
 */
oc.User = function(socket) {
    this.user_id = undefined;
    this.key = undefined;
    this.socket = socket;
};
oc.User.extractFromJson = function(json) {
    return {
        avatar_image: json['avatar_image'],
        user_id: json['user_id'],
        name: json['name'],
        guilds: json['guilds'],
        cover_image: json['cover_image'],
        prestige: json['prestige']
    }
}
oc.User.prototype.init =  function() {
     var self = this;
     // extract the user_id and key from the cookies
     goog.array.forEach(document.cookie.split("; "),function(cookie) {
        var spl = cookie.split('=');
        if (spl[0] == 'user_id')
            self.user_id = spl[1];
        else if (spl[0] == 'key')
            self.key = spl[1];
    });
    this.socket.addCallback('user',function(u) {
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
    
    var profile = goog.dom.query('#miniProfile > a');
    goog.array.forEach(profile,function(p) {
        var h2 = goog.dom.query('h2',goog.dom.getNextElementSibling(p))[0];
        goog.events.listen(p,goog.events.EventType.MOUSEOVER, function(){
            goog.style.setStyle(h2,'color','#ff8211');
        });
        goog.events.listen(p,goog.events.EventType.MOUSEOUT,function() {
            goog.style.setStyle(h2,'color','white');
        });
        goog.events.listen(p,goog.events.EventType.CLICK,function(e) {
            self.go(self.user_id); 
            e.preventDefault();
        }); 
    });

};
oc.User.prototype.changeAvatar = function(newAvatar) {
    var self = this;
    $.post("/avatars",{ avatar: newAvatar }, function() {
       self.go(self.user_id); 
    });
};
oc.User.prototype.changeCover = function(newCover) {
    var self = this;
    $.post("/covers",{ cover: newCover }, function() {
       self.go(self.user_id); 
    });
};
oc.User.prototype.go = function(user_id) {
    var self = this;
    var isMe = (self.user_id == user_id);
    goog.net.XhrIo.send('/user/'+user_id,function(e) {
        var u = goog.json.unsafeParse(e.target.getResponseText())['user'];
        oc.Nav.hideAll();
        oc.Nav.setTitle(u['name']);

        var dynamic = goog.dom.getElement('dynamic');
        goog.style.showElement(dynamic,true); 
        goog.dom.classes.add(dynamic,'profile');
        //
        // write the profile HTML
        var html = '';
        if (isMe) html += '<a rel="#cover">';
            html += '<img width="905" name="'+u['cover_image']+'"';
            
            if (isMe) html += 'style="cursor: pointer" ';
            html += 'src="/static/images/covers/'+u['cover_image']+'" />';
        if (isMe) html += '</a>';

        if (isMe)html += '<a rel="#avatar">';
            html += '<img width="100" height="100" name="'+u['avatar_image']+'" ';
            if (isMe) html += 'style="cursor: pointer" ';
            html += 'src="/static/images/avatars/'+u['avatar_image']+'" />';
        if (isMe) html += '</a>';

        html += ' <h2>'+u['name']+'</h2>';
        dynamic.innerHTML = html;

        // allow profile customization if isMe
        if (isMe) {
            var coverOverlay = goog.dom.htmlToDocumentFragment('<div id="cover" class="overlay">'+
                    '<div class="border"><h2>Select Cover</h2><div class="center"></div></div></div>');
            
            goog.dom.append(dynamic,coverOverlay);

            /*
            TODO
            // process cover overlay click
            $("#dynamic a[rel='#cover']").overlay({
                onBeforeLoad: function(e) {
                    var selfOverlay = this;
                    goog.net.XhrIo.send('/covers',function(e) {
                        var covers = goog.json.unsafeParse(e.target.getResponseText())['covers'];
                        var table = '';
                        var pageSize = covers.length;
                        var paginate = function(pageNo) {
                            var start = pageNo*pageSize;
                            var table = '';
                            var hasRight = start+pageSize < data.covers.length;
                            var hasLeft = start != 0;
                            for (var i=start; i < start+pageSize; i++)
                            {
                                var c = covers[i];
                                table += '<div><img class="';
                                if (u['cover_image'] == c)
                                    table += 'active';
                                 table += '" name="'+c+'" src="/static/images/covers/thumbs/'+c+'" /></div>';
                            }
                            coverOverlay.find(".center").fadeOut(function() {
                               $(this).html(table); 
                               $(this).find("img").click(function() {
                                    if ($(this).attr('name') != u['cover_image']) {
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
                    opacity: 0.3
                },
                onClose: function() {
                    coverOverlay.find('.center').html('');
                },
                fixed: false 
            });
            */
    
            var avatarOverlay = goog.dom.htmlToDocumentFragment('<div id="avatar" class="overlay">'+
                    '<div class="border"><h2>Select Avatar</h2><div align="center"></div></div>');
            
            goog.dom.append(dynamic,avatarOverlay);

            /**
            * TODO
            // process overlay click
            $("#dynamic a[rel='#avatar']").overlay({
                onBeforeLoad: function(e) {
                    var selfOverlay = this;
                    $.getJSON("/avatars",function(data) {
                        var table = "<table>";
                        goog.array.forEach(data.avatars,function(a,i) {
                            if (i % 9 == 0)
                                table += "<tr>";
                            table += '<td><img class="';
                            if (u.avatar_image == a)
                                table += 'active';
                             table += '" name="'+a+'" src="/static/images/avatars/thumbs/'+a+'" /></td>';
                            if ((i+1) % 9 == 0)
                                table += "</tr>";
                        });
                        table += "</table>";
                        avatarOverlay.find("div[align='center']").html(table); 
                        avatarOverlay.find("img").click(function() {
                            if ($(this).attr('name') != u['avatar_image']) {
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
                    opacity: 0.3
                },
                onClose: function() {
                    // cleanup
                    avatarOverlay.find("div[align='center']").html(''); 
                },
                fixed: false 
         });
         */
      }
    }); // getJson
};
