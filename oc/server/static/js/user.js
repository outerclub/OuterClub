goog.provide('oc.User');
goog.provide('oc.User.View');
goog.require('oc.News.View')
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
goog.require('goog.color');
goog.require('goog.async.Delay');
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
 * @type {number}
 */
oc.User.prototype.fbId;

/**
 * @type {string}
 */
oc.User.prototype.fbName;

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
    u.fbId = json['fbId'];
    u.fbName = json['fbName'];
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
     * @type {oc.News.View}
     */
    this.news = new oc.News.View(socket);
    
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
        	self.updatePrestigeGauge(data['prestige'],self.user.prestige);
            self.user.prestige = data['prestige'];
        }
    });

    goog.events.listen(goog.dom.getElement('myAvatar'),goog.events.EventType.CLICK,function(e) {
        oc.Nav.go(this.getAttribute('href'));
        e.preventDefault();
    });

    this.updatePrestigeGauge(this.user.prestige);
};

oc.User.View.FLASH_NONE = 0;
oc.User.View.FLASH_REVERSE= -1;
oc.User.View.FLASH_FORWARD = 1;

/**
 * Start and End should be numbers
 *
 * @param {Element} element Dom Node to be used in the animation.
 * @param {number} flash
 * @param {number=} opt_end End width.
 * @param {boolean=} opt_fast
 * @param {Function=} opt_acc Acceleration function, returns 0-1 for inputs 0-1.
 * @extends {goog.fx.dom.PredefinedEffect}
 * @constructor
 */
oc.User.View.ResizePrestige = function(element, flash, opt_end, opt_fast, opt_acc) {
  if (!goog.isBoolean(opt_fast)) opt_fast = false;
  /**
   * @type {number}
   */
  this.currentPercent = goog.string.toNumber(element.getAttribute('data-percent'));
  
  if (!goog.isNumber(opt_end)) opt_end = this.currentPercent;
  
  var time = Math.abs(opt_end-this.currentPercent)/100*(opt_fast ? 700 : 3000);
  if (time == 0) time = 500;
  
  goog.fx.dom.PredefinedEffect.call(this, element, [this.currentPercent,1],
                                    [opt_end,0], time, opt_acc);
  
  /**
   * @type {number}
   */
  this.flash = flash;
  
  /**
   * @type {Element}
   */
  this.percentText = goog.dom.query('.percent',element)[0];
  
  /**
   * @type {Element}
   */
  this.innerBar = goog.dom.query('.inner',element)[0];
  
  /**
   * @type {Array.<number>}
   */
  this.startColor1 = goog.color.hexToRgb('#77A1CC');
  
  /**
   * @type {Array.<number>}
   */
  this.startColor2 = goog.color.hexToRgb('#6786a4');
  
  /**
   * @type {Array.<number>}
   */
  this.endColor1 = goog.color.parseRgb('rgb(254, 207, 35)');
  
  /**
   * @type {Array.<number>}
   */
  this.endColor2 = goog.color.parseRgb('rgb(253, 146, 21)');
  
  /**
   * @type {Array.<number>}
   */
   this.startColorText = goog.color.hexToRgb('#cccccc');
   
   
  /**
   * @type {Array.<number>}
   */
   this.endColorText = goog.color.hexToRgb('#666666');
  
  if (this.flash == oc.User.View.FLASH_REVERSE)
  {
	  var tmp = this.startColor1;
	  this.startColor1 = this.endColor1;
	  this.endColor1 = tmp;
	  
	  tmp = this.startColor2;
	  this.startColor2 = this.endColor2;
	  this.endColor2 = tmp;
	  
	  tmp = this.startColorText;
	  this.startColorText = this.endColorText;
	  this.endColorText = tmp;
  }
  
};
goog.inherits(oc.User.View.ResizePrestige, goog.fx.dom.PredefinedEffect);


/**
 * Animation event handler that will resize an element by setting its width.
 * @protected
 * @override
 */
oc.User.View.ResizePrestige.prototype.updateStyle = function() {
	var percent = Math.round(this.coords[0]);
	this.innerBar.style.width = percent + '%';
	
	if (this.flash != oc.User.View.FLASH_NONE)
	{
		goog.style.setStyle(this.percentText,'color',
				goog.color.rgbArrayToHex(goog.color.blend(this.startColorText,this.endColorText,this.coords[1])));
		var blend1 = goog.color.rgbArrayToHex(goog.color.blend(this.startColor1,this.endColor1,this.coords[1]));
		var blend2 = goog.color.rgbArrayToHex(goog.color.blend(this.startColor2,this.endColor2,this.coords[1]));
		goog.style.setStyle(this.innerBar,'background-color',blend1);
		goog.style.setStyle(this.innerBar,'background-image','-webkit-linear-gradient(top, '+blend1+', '+blend2+')');
		goog.style.setStyle(this.innerBar,'background-image','-moz-linear-gradient(top, '+blend1+', '+blend2+')');
		goog.style.setStyle(this.innerBar,'background-image','linear-gradient(top, '+blend1+', '+blend2+')');
	}
	this.element.setAttribute('data-percent',percent);
	this.percentText.innerHTML = percent+'%';
};

/**
 * @param {number} end 
 * @param {number=} start
 */
oc.User.View.prototype.updatePrestigeGauge= function(end,start) {
	var prestigeBar = goog.dom.query('.prestige-bar')[0];
	var rankElement = goog.dom.query('#miniProfile .rank')[0];
	var newPrestige = oc.Util.parsePrestige(end);
	if (rankElement.innerHTML == '')
		rankElement.innerHTML = newPrestige.name;
	
	// simply resize the bar
	var anim = (new oc.User.View.ResizePrestige(prestigeBar,oc.User.View.FLASH_NONE,newPrestige.percent*100));
	
	if (goog.isNumber(start))
	{
		var oldPrestige = oc.Util.parsePrestige(start);
		
		var ret = function() {
			var async = new goog.async.Delay(function() {
				var returnAnim= (new oc.User.View.ResizePrestige(prestigeBar,oc.User.View.FLASH_REVERSE));
				returnAnim.play();
			},1000);
			async.start();
		};
		
		// deal with level up
		if (oldPrestige.rank != newPrestige.rank)
		{
			// fill the bar
			anim = (new oc.User.View.ResizePrestige(prestigeBar,oc.User.View.FLASH_FORWARD,100));
			goog.events.listen(anim,goog.fx.Transition.EventType.FINISH,function(e) {
				// fade the rank out
				var fadeRank = (new goog.fx.dom.FadeOut(rankElement,300));
				fadeRank.play();
				
				// reset the bar
				var resetAnim = (new oc.User.View.ResizePrestige(prestigeBar,oc.User.View.FLASH_NONE,0,true));
				resetAnim.play();
				goog.events.listen(resetAnim,goog.fx.Transition.EventType.FINISH,function(e2) {
					rankElement.innerHTML = newPrestige.name;
					// fade the rank in
					var fadeRankIn = (new goog.fx.dom.FadeIn(rankElement,300));
					fadeRankIn.play();
					
					// refill the bar
					var refillAnim = (new oc.User.View.ResizePrestige(prestigeBar,oc.User.View.FLASH_NONE,newPrestige.percent*100));
					refillAnim.play();
					goog.events.listen(refillAnim,goog.fx.Transition.EventType.FINISH,ret);
				});
			});
		} else {
			anim = (new oc.User.View.ResizePrestige(prestigeBar,oc.User.View.FLASH_FORWARD,newPrestige.percent*100));
			goog.events.listen(anim,goog.fx.Transition.EventType.FINISH,ret);
		}
	}
	anim.play();
}
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
        var html = oc.Templates.User.show({
        		cover_image:u.cover_image,
        		avatar_image:u.avatar_image,
        		name:u.name,
        		isMe:isMe,
        		blurbs:u.blurbs,
        		categories:self.categories,
        		categoryIds:categoryIds,
        		fbId:u.fbId,
        		rank:oc.Util.parsePrestige(u.prestige).name,
        		fbName:u.fbName});
        dynamic.innerHTML = html;
        var profileElement = goog.dom.query('.profile',dynamic)[0];
        
        // display default text if necessary
        var blurbInputs = goog.dom.query('.blurb input',profileElement);

        // allow profile customization if isMe
        if (isMe) {
        	var fbConnect = goog.dom.query('.fb a[name="connect"]',profileElement);
        	if (fbConnect.length > 0)
        	{
        		fbConnect = fbConnect[0];
        		goog.events.listen(fbConnect,goog.events.EventType.CLICK,function(e) {
        			window['FB']['login'](function(resp) {
        				if (resp.status === 'connected')
        				{
        					var userID = resp['authResponse']['userID'];
        					goog.net.XhrIo.send('/connect',
        							function(e) {
        								var data = e.target.getResponseJson();
        								if ('fbName' in data)
        								{
        									var frag =oc.Templates.User.fb({
        										fbId:userID,
        										fbName:data['fbName']
        									});
        									var fb = goog.dom.query('.fb',profileElement)[0];
        									fb.innerHTML = frag;
        									self.user.fbId = userID;
        									self.user.fbName = data['fbName'];
        								}
	        					},
	        					'POST',goog.uri.utils.buildQueryDataFromMap({
	        						'userID':userID,
	        						'accessToken':resp['authResponse']['accessToken']
        					}));
        				}
        					
        			});
        			e.preventDefault();
        		});
        	}
        	
        	self.news.refresh();
        	
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
            
            goog.dom.appendChild(profileElement,coverOverlay);

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
            
            goog.dom.appendChild(profileElement,avatarOverlay);

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
