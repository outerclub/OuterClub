goog.provide('oc.Conversation');
goog.provide('oc.Conversation.Response');
goog.require('oc.User');
goog.require('oc.Socket');
goog.require('goog.array');
;

/**
 * @param {oc.Category} category
 * @param {oc.User} user
 * @param {string} date
 * @param {number} id
 * @param {string} title
 * @param {string} content
 * @param {Array.<oc.Conversation.Response>} responses
 * @constructor
 * @extends {oc.Conversation.Response}
 */
oc.Conversation = function(category,user,date,id,title,content,responses) {
    /**
     * @type {oc.Category}
     */
    this.category = category;

    /**
     * @type {Array}
     */
    this.viewers = [];

    /**
     * @type {Array.<oc.Conversation.Response>}
     */
    this.responses = responses;

    /**
     * @type {string}
     */
    this.title = title;

    oc.Conversation.Response.call(this,id,date,content,user,false);
};
goog.inherits(oc.Conversation,oc.Conversation.Response);

/**
 * @param {number} id
 * @param {string} date
 * @param {string} content
 * @param {oc.User} user
 * @param {boolean} canVote
 * @constructor
 */
oc.Conversation.Response = function(id,date,content,user,canVote) {
    /**
     * @type {oc.User}
     */
    this.user = user;

    /**
     * @type {string}
     */
    this.date = date;

    /**
     * @type {number}
     */
    this.id = id;

    /**
     * @type {string}
     */
    this.content = content;

    /**
     * @type {boolean}
     */
    this.canVote = canVote;
};

/**
 * @param {Object} json
 * @return {oc.Conversation.Response}
 */
oc.Conversation.Response.extractFromJson = function(json) {
    return new oc.Conversation.Response(
        json['r_id'],
        json['date'],
        json['content'],
        oc.User.extractFromJson(json['user']),
        json['canVote']);
};

/**
 * @param {Object} json
 * @return {oc.Conversation}
 */
oc.Conversation.extractFromJson = function(json) {
    var responses = [];
    goog.array.forEach(json['responses'],function(r) {
        responses.push(oc.Conversation.Response.extractFromJson(r));
    });
    return new oc.Conversation(
        new oc.Category(json['category_id'],json['category_name'],json['category_icon']),
        oc.User.extractFromJson(json['conversation']['user']),
        json['conversation']['date'],
        json['conversation']['id'],
        json['conversation']['title'],
        json['conversation']['content'],
        responses
    );
};

