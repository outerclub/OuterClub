goog.provide('oc.Nav');
goog.require('goog.dom');
goog.require('goog.array');
goog.require('goog.style');
goog.require('goog.dom.classes');
goog.require('goog.string');
goog.require('goog.History');

oc.Nav.hideAll = function() {
    goog.array.forEach(goog.dom.query('#frame > div, #dynamic'),function(e) {
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

oc.Nav.ResetFrame = function() {
    var frameElement = goog.dom.getElement("frame");
    if (goog.style.isElementShown(goog.dom.getElement('altBody')))
    {
    	var viewportSize = goog.dom.getViewportSize();
    	goog.style.setStyle(frameElement,'min-height',(viewportSize.height-100)+'px');
   	}
    else
    	goog.style.setStyle(frameElement,'min-height','1000px');
}


/**
 * @param {string} href
 */
oc.Nav.go = function(href) {
    if (href.indexOf('#!') == 0)
        href = href.substring(1);
    else if (href.indexOf('!') != 0)
        href= '!'+href;
    oc.Nav.history.setToken(href);
};

/**
 * @type {goog.History}
 */
oc.Nav.history = new goog.History();
