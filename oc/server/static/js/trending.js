goog.provide('oc.Trending');
goog.require('oc.Nav');
goog.require('oc.Category.View');
goog.require('oc.Conversation.View');
goog.require('oc.Util');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.require('goog.style');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('oc.Templates.Main');
goog.require('goog.date');

/**
 * @param {Object.<oc.Category>} categories
 * @param {oc.Conversation.View} conversationView
 * @constructor
 */
oc.Trending = function(categories,conversationView) {
    /**
     * @type {Object.<oc.Category>}
     */
    this.categories = categories;

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
        goog.array.forEach(conversations,function(c) {
            c['content'] = oc.Util.replaceLinks(c['content']);
            c['date'] = oc.Util.prettyDate(goog.date.fromIsoString(c['date']));
        });
        var html = oc.Templates.Main.trending({conversations:conversations,categories:self.categories});
            
        goog.array.forEach(goog.dom.query('.entry',trending),function(e) {
            goog.dom.removeNode(e);
        });
        
        goog.dom.append(trending,goog.dom.htmlToDocumentFragment(html));
        
        oc.Nav.hideAll();
        goog.style.showElement(trending,true);
        var trendingLinks = goog.dom.query('#trending h2 a');
        goog.array.forEach(trendingLinks,function(link) {
            goog.events.listen(link,goog.events.EventType.CLICK,function(e) {
                oc.Nav.go(link.getAttribute('href'));
                e.preventDefault();
            });
        });
    });
};
