goog.provide('oc.Nav');
goog.require('goog.dom');
goog.require('goog.array');
goog.require('goog.style');
goog.require('goog.dom.classes');
goog.require('goog.string');

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
