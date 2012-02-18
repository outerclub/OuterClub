goog.provide('oc.Trending');
goog.require('oc.Nav');
goog.require('oc.Conversation.View');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.require('goog.style');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('oc.templates');

/**
 * @constructor
 */
oc.Trending = function(conversationView) {
    /**
     * @type {oc.Conversation.View}
     */
    this.conversationView = conversationView;
};
oc.Trending.prototype.go = function() {
    var self = this;
    goog.net.XhrIo.send('/trending',function(e) {
        var conversations = goog.json.unsafeParse(e.target.getResponseText())['conversations'];
        var trending = goog.dom.getElement('trending');
        oc.Nav.setTitle(trending.getAttribute('title'));
        var html = oc.templates.trending({conversations:conversations});
            
        goog.array.forEach(goog.dom.query('.entry',trending),function(e) {
            goog.dom.removeNode(e);
        });
        
        goog.dom.append(trending,goog.dom.htmlToDocumentFragment(html));
        
        oc.Nav.hideAll();
        goog.style.showElement(trending,true);
        var trendingLinks = goog.dom.query('#trending h2 a');
        goog.array.forEach(trendingLinks,function(link) {
            goog.events.listen(link,goog.events.EventType.CLICK,function(e) {
                self.conversationView.go(link.getAttribute('name'));
                e.preventDefault();
            });
        });
    });
};
