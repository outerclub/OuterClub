goog.provide('oc.overlay');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.dom');
goog.require('goog.style');
goog.require('goog.fx.dom');
/**
 * @param {Element} element
 * @param {function(function())} func
 * @param {boolean=} fixed
 * @return {Object}
 */
oc.overlay = function(element,func,fixed) {
     if (!goog.isBoolean(fixed))
        fixed = true
     var overlay = goog.dom.getElement(element.getAttribute('rel').substring(1));
     var hovering = false;
     var hover = function() {
        hovering = true;
     };
     var hoverOut = function() {
        hovering = false;
     };
     var close = function() {
         var anim = new goog.fx.dom.FadeOutAndHide(overlay,500);
         anim.play();
        goog.events.unlisten(overlay,goog.events.EventType.MOUSEOVER,hover);
        goog.events.unlisten(overlay,goog.events.EventType.MOUSEOUT,hoverOut);
        goog.events.unlisten(document,goog.events.EventType.MOUSEUP,documentMouse);
     }
     var documentMouse = function() {
        if (!hovering)
            close();
     };
     goog.events.listen(element,goog.events.EventType.CLICK,function() {
         goog.events.listen(overlay,goog.events.EventType.MOUSEOVER,hover);
         goog.events.listen(overlay,goog.events.EventType.MOUSEOUT,hoverOut);
         goog.events.listen(document,goog.events.EventType.MOUSEUP,documentMouse);
         
         func(close);

         var anim = new goog.fx.dom.FadeInAndShow(overlay,500);
         anim.play();
         goog.style.setStyle(overlay,'display','inline');
         if (fixed)
            goog.style.setStyle(overlay,'position','fixed');
        else
            goog.style.setStyle(overlay,'position','absolute');
         var size = goog.style.getSize(overlay);
         goog.style.setStyle(overlay,'margin-left','-'+(size.width/2)+'px');
         goog.style.setPosition(overlay,'50%','15%');
    });
    return {close:close}
};
