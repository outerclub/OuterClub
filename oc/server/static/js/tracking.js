goog.provide('oc.Tracking');

oc.Tracking.isEnabled = !window['DEBUG'];

/**
 * @param {string} page
 */
oc.Tracking.page= function(page) {
    if (oc.Tracking.isEnabled)
    {
        window['_gaq'].push(['_trackPageview',page]);
    }
}
