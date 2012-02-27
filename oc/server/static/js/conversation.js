goog.provide('oc.Conversation');
goog.provide('oc.Conversation.Response');
goog.require('oc.User');
goog.require('oc.Socket');
goog.require('goog.array');
goog.require('goog.date');

/**
 * @param {number} categoryId
 * @param {oc.User} user
 * @param {goog.date.DateTime} date
 * @param {number} id
 * @param {string} title
 * @param {string} content
 * @param {Array.<oc.Conversation.Response>} responses
 * @param {Array.<number>} votableUsers
 * @constructor
 * @extends {oc.Conversation.Response}
 */
oc.Conversation = function(categoryId,user,date,id,title,content,responses,votableUsers) {
    /**
     * @type {number}
     */
    this.categoryId = categoryId;

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

    /**
     * @type {Array.<number>}
     */
    this.votableUsers = votableUsers;

    oc.Conversation.Response.call(this,id,date,content,user);
};

goog.inherits(oc.Conversation,oc.Conversation.Response);

/**
 * @param {number} id
 * @param {goog.date.DateTime} date
 * @param {string} content
 * @param {oc.User} user
 * @constructor
 */
oc.Conversation.Response = function(id,date,content,user) {
    /**
     * @type {oc.User}
     */
    this.user = user;

    /**
     * @type {goog.date.DateTime}
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
};

/**
 * @param {Object} json
 * @return {oc.Conversation.Response}
 */
oc.Conversation.Response.extractFromJson = function(json) {
    return new oc.Conversation.Response(
        json['r_id'],
        goog.date.fromIsoString(json['date']),
        json['content'],
        oc.User.extractFromJson(json['user']));
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
        json['cat_id'],
        oc.User.extractFromJson(json['conversation']['user']),
        goog.date.fromIsoString(json['conversation']['date']),
        json['conversation']['id'],
        json['conversation']['title'],
        json['conversation']['content'],
        responses,
        json['votableUsers']
    );
};

