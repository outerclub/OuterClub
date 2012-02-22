goog.provide('oc.Nav');
goog.require('goog.dom');
goog.require('goog.array');
goog.require('goog.style');
goog.require('goog.dom.classes');
goog.require('goog.string');
goog.require('goog.History');

oc.Nav.hideAll = function() {
    goog.array.forEach(goog.dom.query('.frame > div, .heading, #dynamic'),function(e) {
        goog.style.showElement(e,false);
    });
    goog.dom.classes.remove(goog.dom.getElement('dynamic'));
};
/**
 * @param {string} t
 */ 
oc.Nav.setTitle = function(t) {
    var title = goog.string.htmlEscape(goog.dom.query('title')[0],false);
    title.innerHTML = t+' - OuterClub';
};

/**
 * @param {string} href
 */
oc.Nav.go = function(href) {
    oc.Nav.history.setToken('!'+href);
};

/**
 * @type {goog.History}
 */
oc.Nav.history = new goog.History();
