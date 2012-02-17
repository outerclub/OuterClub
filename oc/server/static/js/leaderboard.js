goog.provide('oc.Leaderboard');
goog.require('oc.Nav');
goog.require('oc.User');
goog.require('goog.array');
goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.require('goog.events');
goog.require('goog.dom');
goog.require('goog.events.EventType');

/**
 * @constructor
 */
oc.Leaderboard = function(user) {
    this.user = user;
};
oc.Leaderboard.prototype.go = function() {
    var self = this;
    goog.net.XhrIo.send('/leaderboard',function(e) {
        var users = goog.json.unsafeParse(e.target.getResponseText())['users'];
        var leaderboard = goog.dom.query('#leaderboard')[0];
        oc.Nav.setTitle(leaderboard.getAttribute('title'));
        var html = '';
        goog.array.forEach(users,function(u) {
            html += '<div class="entry">'+
                '<div class="number"><span>'+u['rank']+'</span>'+
                '</div><img name="'+u['user_id']+'" style="cursor: pointer" src="/static/images/avatars/'+u['avatar_image']+'" height="90" width="90"/><div class="text">'+
                '<h2><a href="/user/'+u['user_id']+'" name="'+u['user_id']+'">'+u['name']+'</a></h2>'+
                '<p>Prestige: '+u['prestige']+'</p></div></div>';
        }); 
        goog.array.forEach(goog.dom.query('.entry',leaderboard),function(l) {
            goog.dom.removeNode(l);
        });
        goog.dom.append(leaderboard,goog.dom.htmlToDocumentFragment(html));
        oc.Nav.hideAll();

        goog.style.showElement(leaderboard,true);
        goog.array.forEach(goog.dom.query('#leaderboard h2 a,#leaderboard img'),function(clickable) {
            goog.events.listen(clickable,goog.events.EventType.CLICK,function(e) {
                self.user.go(this.getAttribute('name'));
                e.preventDefault();
            });
        });
    });
};
