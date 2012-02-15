goog.provide('oc.Category');

/**
 * @param {string} id
 * @param {string} name
 * @param {string} icon
 * @constructor
 */
oc.Category = function(id,name,icon) {
    this.name = name;
    this.id = id;
    this.icon = icon;
};

/**
 * @param {string} name
 * @return {string}
 */
oc.Category.toUrl = function(name) {
    return name.toLowerCase().replace(/ /g,'+');
}

/**
 * @param {Object} json
 * @return {oc.Category}
 */
oc.Category.extractFromJson = function(json) {
    return new oc.Category(json['id'],json['name'],json['icon']);
}
