goog.provide('oc.Nav');
goog.require('goog.dom');
goog.require('goog.array');
goog.require('goog.style');
goog.require('goog.dom.classes');
oc.Nav = {
        hideAll: function() {
            goog.array.forEach(goog.dom.query('.frame > div, .heading, #dynamic'),function(e) {
                goog.style.showElement(e,false);
            });
            goog.dom.classes.remove(goog.dom.getElement('dynamic'));
        },
        setTitle:function(t) {
            var title = goog.dom.query('title')[0];
            title.innerHTML = t+' - OuterClub';
        }
    };
