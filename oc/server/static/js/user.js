goog.provide('oc.User');
goog.require('oc.Socket');
goog.require('oc.Nav');
goog.require('oc.overlay');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.require('goog.style');
goog.require('goog.fx.dom');
goog.require('goog.fx.Transition');
goog.require('goog.uri.utils');

/**
 * @param {oc.Socket} socket
 * @constructor
 */
oc.User = function(socket) {
    this.id = undefined;
    this.key = undefined;
    this.socket = socket;
};

/**
 * @param {Object} json
 * @return {Object}
 */
oc.User.extractFromJson = function(json) {
    return {
        avatar_image: json['avatar_image'],
        id: json['user_id'],
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
            self.id = spl[1];
        else if (spl[0] == 'key')
            self.key = spl[1];
    });
    this.socket.addCallback('user',function(u) {
        var prestigeElement = goog.dom.query('#miniProfile .prestige')[0];
        var currentPrestige = prestigeElement.innerHTML;
        var currentAvatar = goog.dom.query('#miniProfile img')[0].getAttribute('name');
        if (currentPrestige != u['prestige'])
        {
            var anim = new goog.fx.dom.FadeOut(prestigeElement,500);
            goog.events.listen(anim,goog.fx.Transition.EventType.FINISH,function() {
                prestigeElement.innerHTML = u['prestige'];
                goog.style.setStyle(prestigeElement,'color','yellow');
                (new goog.fx.dom.FadeIn(prestigeElement,500)).play(); 
            });
            anim.play();
        }
        if (currentAvatar != u['avatar_image'])
        {
            var imgView = goog.dom.query('#miniProfile img')[0];
            imgView.setAttribute('name',u['avatar_image']);
            imgView.setAttribute('src','/static/images/avatars/'+u['avatar_image']);
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
            self.go(self.id); 
            e.preventDefault();
        }); 
    });

};
/**
 * @param {string} newAvatar
 */
oc.User.prototype.changeAvatar = function(newAvatar) {
    var self = this;
    goog.net.XhrIo.send('/avatars',function(e) {
       self.go(self.id); 
    },'POST',goog.uri.utils.buildQueryDataFromMap({'avatar': newAvatar}));
};
/**
 * @param {string} newCover
 */
oc.User.prototype.changeCover = function(newCover) {
    var self = this;
    goog.net.XhrIo.send('/covers',function(e) {
       self.go(self.id); 
    },'POST',goog.uri.utils.buildQueryDataFromMap({'cover': newCover}));
};
/**
 * @param {string} user_id
 */
oc.User.prototype.go = function(user_id) {
    var self = this;
    var isMe = (self.id == user_id);
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

            /**
             * @param {function()} close
             */
            var coversCallback = function(close) {
                    goog.net.XhrIo.send('/covers',function(e) {
                        var covers = goog.json.unsafeParse(e.target.getResponseText())['covers'];
                        var table = '';
                        var pageSize = covers.length;
                        var paginate = function(pageNo) {
                            var start = pageNo*pageSize;
                            var table = '';
                            var hasRight = start+pageSize < covers.length;
                            var hasLeft = start != 0;
                            for (var i=start; i < start+pageSize; i++)
                            {
                                var c = covers[i];
                                table += '<div><img class="';
                                if (u['cover_image'] == c)
                                    table += 'active';
                                 table += '" name="'+c+'" src="/static/images/covers/thumbs/'+c+'" /></div>';
                            }
                            var center = goog.dom.query('.center',coverOverlay)[0];
            
                           // var anim = new goog.fx.dom.FadeOutAndHide(center,500);
                            //anim.play();
                            //goog.events.listen(anim,goog.fx.Transition.EventType.FINISH,function() {
                                center.innerHTML = table;
                                var images = goog.dom.query('img',center);
                                goog.array.forEach(images,function(img) {
                                    goog.events.listen(img,goog.events.EventType.CLICK,function() {
                                        if (this.getAttribute('name') != u['cover_image']) {
                                            self.changeCover(this.getAttribute('name'));
                                        }
                                        center.innerHTML = '';
                                        close();
                                    });
                                    goog.events.listen(img,goog.events.EventType.MOUSEOVER,function() {
                                        goog.dom.classes.add(img,'hover');
                                    });
                                    goog.events.listen(img,goog.events.EventType.MOUSEOUT,function() {
                                        goog.dom.classes.remove(img,'hover');
                                    });
                                });
                                (new goog.fx.dom.FadeInAndShow(center,500)).play();
                       //     });
                        };
                        paginate(0);
                    });
            };
            oc.overlay(goog.dom.query("#dynamic a[rel='#cover']")[0],coversCallback);
    
            var avatarOverlay = /** @type {Element} */ goog.dom.htmlToDocumentFragment('<div id="avatar" class="overlay">'+
                    '<div class="border"><h2>Select Avatar</h2><div align="center"></div></div>');
            
            goog.dom.append(dynamic,avatarOverlay);

            /**
             * @param {function()} close
             */
            var avatarsCallback = function(close) {
                goog.net.XhrIo.send('/avatars',function(e) {
                    var avatars = goog.json.unsafeParse(e.target.getResponseText())['avatars'];
                    var table = "<table>";
                    goog.array.forEach(avatars,function(a,i) {
                        if (i % 9 == 0)
                            table += "<tr>";
                        table += '<td><img class="';
                        if (u['avatar_image'] == a)
                            table += 'active';
                         table += '" name="'+a+'" src="/static/images/avatars/thumbs/'+a+'" /></td>';
                        if ((i+1) % 9 == 0)
                            table += "</tr>";
                    });
                    table += "</table>";
                    var tableView = goog.dom.query("div[align='center']",avatarOverlay)[0];
                    tableView.innerHTML = table; 
                    var images = goog.dom.query('img',avatarOverlay);
                    goog.array.forEach(images,function(img) {
                        goog.events.listen(img,goog.events.EventType.CLICK,function() {
                            if (this.getAttribute('name') != u['avatar_image']) {
                                self.changeAvatar(this.getAttribute('name'));
                            }
                            tableView.innerHTML = '';
                            close();
                        });
                        goog.events.listen(img,goog.events.EventType.MOUSEOVER,function() {
                            goog.dom.classes.add(img,'hover');
                        });
                        goog.events.listen(img,goog.events.EventType.MOUSEOUT,function() {
                            goog.dom.classes.remove(img,'hover');
                        });
                    });
                   
                });
            }
            oc.overlay(goog.dom.query("#dynamic a[rel='#avatar']")[0],avatarsCallback);
      }
    }); // getJson
};
