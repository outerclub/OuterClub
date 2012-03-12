goog.provide('oc.User');
goog.provide('oc.User.View');
goog.require('oc.Socket');
goog.require('oc.Nav');
goog.require('oc.overlay');
goog.require('oc.Templates.User');
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
goog.require('goog.object');

/**
 * @param {number} id
 * @constructor
 */
oc.User = function(id) {
    this.id = id;
}

/**
 * @type {number}
 */
oc.User.prototype.id;

/**
 * @type {string}
 */
oc.User.prototype.name;

/**
 * @type {string}
 */
oc.User.prototype.avatar_image;

/**
 * @type {string}
 */
oc.User.prototype.cover_image;

/**
 * @type {number}
 */
oc.User.prototype.prestige;

/**
 * @type {Object}
 */
oc.User.prototype.guilds;

/**
 * @type {boolean}
 */
oc.User.prototype.admin;

/**
 * @type {Object}
 */
oc.User.prototype.blurbs;

/**
 * @param {Object} json
 * @return {oc.User}
 */
oc.User.extractFromJson = function(json) {
    var u =new oc.User(json['user_id']);
    u.name = json['name'];
    u.avatar_image = json['avatar_image'];
    u.cover_image = json['cover_image'];
    u.prestige = json['prestige'];
    u.guilds = json['guilds'];
    u.admin = json['admin'];
    u.blurbs = json['blurbs'];
    return u;
}

/**
 * @param {oc.User} user
 * @param {Object.<oc.Category>} categories
 * @param {oc.Socket} socket
 * @constructor
 */
oc.User.View = function(user,categories,socket) {
    /**
     * @type {Object.<oc.Category>}
     */
    this.categories = categories;

    /**
     * @type {oc.User}
     */
    this.user = user;

    /**
     * @type {oc.Socket}
     */
    this.socket = socket;
};
oc.User.View.prototype.init =  function() {
    var self = this;
    self.socket.send({'register':['/chat','/happening','/user/'+self.user.id]});
    self.socket.addCallback('user',function(data) {
        // increase prestige
        if (data['prestige'] != self.user.prestige)
        {
            self.user.prestige = data['prestige'];
            goog.dom.query("#miniProfile .prestige")[0].innerHTML = self.user.prestige;
        }
    });

    var userLink = goog.dom.query('#miniProfile > a')[0];
    goog.events.listen(userLink,goog.events.EventType.CLICK,function(e) {
        oc.Nav.go(this.getAttribute('href'));
        e.preventDefault();
    });


};
/**
 * @param {string} newAvatar
 */
oc.User.View.prototype.changeAvatar = function(newAvatar) {
    var self = this;
    self.user.avatar_image = newAvatar;
    var imgView = goog.dom.query('#miniProfile img')[0];
    imgView.setAttribute('src','/static/images/avatars/'+self.user.avatar_image);

    goog.net.XhrIo.send('/avatars',function(e) {
       self.go(self.user.id); 
    },'POST',goog.uri.utils.buildQueryDataFromMap({'avatar': newAvatar}));
};
/**
 * @param {string} newCover
 */
oc.User.View.prototype.changeCover = function(newCover) {
    var self = this;
    self.user.cover_image = newCover;
    goog.net.XhrIo.send('/covers',function(e) {
       self.go(self.user.id); 
    },'POST',goog.uri.utils.buildQueryDataFromMap({'cover': newCover}));
};
/**
 * @param {string} user_id
 */
oc.User.View.prototype.go = function(user_id) {
    var self = this;
    var isMe = (self.user.id == user_id);
    goog.net.XhrIo.send('/user/'+user_id,function(e) {
        var u = oc.User.extractFromJson(goog.json.unsafeParse(e.target.getResponseText())['user']);
        oc.Nav.hideAll();
        oc.Nav.setTitle(u.name);

        var dynamic = goog.dom.getElement('dynamic');
        goog.style.showElement(dynamic,true); 

        var categoryIds = goog.object.getKeys(self.categories);

        // write the profile HTML
        var html = oc.Templates.User.show({cover_image:u.cover_image,avatar_image:u.avatar_image,name:u.name,isMe:isMe,blurbs:u.blurbs,categories:self.categories,categoryIds:categoryIds});
        dynamic.innerHTML = html;
        var profileElement = goog.dom.query('.profile',dynamic)[0];

        // display default text if necessary
        var blurbInputs = goog.dom.query('.blurb input',profileElement);

        // allow profile customization if isMe
        if (isMe) {
            // click handlers for blurbs
            goog.array.forEach(blurbInputs,function(input) {
                goog.events.listen(input,goog.events.EventType.FOCUSOUT,function() {
                    var cat_id = input.getAttribute('name');
                    self.user.blurbs[cat_id] = input.value;
                    goog.net.XhrIo.send('/blurb',function() {},'POST',goog.uri.utils.buildQueryDataFromMap({'blurb':input.value,'cat_id': cat_id}));
                });
            });

            // cover overlay
            var coverOverlay = goog.dom.htmlToDocumentFragment('<div id="cover" class="overlay">'+
                    '<div class="border"><h2>Select Cover</h2><div class="center"></div></div></div>');
            
            goog.dom.append(profileElement,coverOverlay);

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
                                if (u.cover_image == c)
                                    table += 'active';
                                 table += '" name="'+c+'" width="200" src="/static/images/covers/thumbs/'+c+'" /></div>';
                            }
                            var center = goog.dom.query('.center',coverOverlay)[0];
            
                           // var anim = new goog.fx.dom.FadeOutAndHide(center,500);
                            //anim.play();
                            //goog.events.listen(anim,goog.fx.Transition.EventType.FINISH,function() {
                                center.innerHTML = table;
                                var images = goog.dom.query('img',center);
                                goog.array.forEach(images,function(img) {
                                    goog.events.listen(img,goog.events.EventType.CLICK,function() {
                                        if (this.getAttribute('name') != u.cover_image) {
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
            oc.overlay(goog.dom.query("a[rel='#cover']",profileElement)[0],coversCallback);
    
            var avatarOverlay = /** @type {Element} */ goog.dom.htmlToDocumentFragment('<div id="avatar" class="overlay">'+
                    '<div class="border"><h2>Select Avatar</h2><div align="center"></div></div>');
            
            goog.dom.append(profileElement,avatarOverlay);

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
                        if (u.avatar_image == a)
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
                            if (this.getAttribute('name') != u.avatar_image) {
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
            oc.overlay(goog.dom.query("a[rel='#avatar']",profileElement)[0],avatarsCallback);
      }
    }); // getJson
};
