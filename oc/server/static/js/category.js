goog.provide('oc.Category');

/**
 * @constructor
 */
oc.Category = function(id,name,href) {
    this.name = name;
    this.id = id;
    this.href = href;
};
oc.Category.extractFromJson = function(json) {
    return new oc.Category(json['id'],json['name'],json['href']);
}
