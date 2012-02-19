goog.provide('oc.Category');

/**
 * @param {number} id
 * @param {string} name
 * @param {string} icon
 * @constructor
 */
oc.Category = function(id,name,icon) {
    /**
     * @type {string}
     */
    this.name = name;

    /**
     * @type {number}
     */
    this.id = id;

    /**
     * @type {string}
     */
    this.icon = icon;
};

/**
 * @return {string}
 */
oc.Category.prototype.toUrl = function() {
    return oc.Category.toUrl(this.name);
};
/**
 * @param {string} name
 * @return {string}
 */
oc.Category.toUrl = function(name) {
    return name.toLowerCase().replace(/ /g,'+');
};

/**
 * @param {Object} json
 * @return {oc.Category}
 */
oc.Category.extractFromJson = function(json) {
    return new oc.Category(json['id'],json['name'],json['icon']);
};
