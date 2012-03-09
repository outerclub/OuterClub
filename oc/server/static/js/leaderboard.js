goog.provide('oc.Leaderboard');
goog.require('oc.Nav');
goog.require('oc.User');
goog.require('oc.User.View');
goog.require('goog.array');
goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.require('goog.events');
goog.require('goog.dom');
goog.require('goog.events.EventType');
goog.require('oc.Templates.Main');

/**
 * @param {oc.User.View} userView
 * @constructor
 */
oc.Leaderboard = function(userView) {
    /**
     * @type {oc.User.View}
     */ 
    this.userView = userView;
};
oc.Leaderboard.prototype.go = function() {
    var self = this;
    goog.net.XhrIo.send('/leaderboard',function(e) {
        var users = goog.json.unsafeParse(e.target.getResponseText())['users'];
        var leaderboard = goog.dom.query('#leaderboard')[0];
        oc.Nav.setTitle(leaderboard.getAttribute('title'));

        leaderboard.innerHTML = '';
        window['leaderboard']({name:'leaderboard',children:users});
        oc.Nav.hideAll();
        goog.style.showElement(goog.dom.query('#leaderboard .cell')[0],false);

        goog.style.showElement(leaderboard,true);
        goog.array.forEach(goog.dom.query('#leaderboard .cell'),function(clickable) {
            goog.events.listen(clickable,goog.events.EventType.CLICK,function(e) {
                oc.Nav.go(this.getAttribute('data-url'));
                e.preventDefault();
            });
        });
    });
};
