goog.provide('oc.News.Item');
goog.provide('oc.News');
goog.provide('oc.News.View');
goog.require('oc.Socket');
goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.require('goog.date.DateTime');
goog.require('oc.Templates.Main');

/**
 * @param {goog.date.DateTime} date
 * @constructor
 */
oc.News.Item = function(date) {
    /**
     * @type {goog.date.DateTime}
    */
    this.date = date;
};
/**
 * @type {string}
 */
oc.News.Item.prototype.content;

/**
 * @param {Object} json
 * @return {oc.News.Item}
 */
oc.News.Item.extractFromJson = function(json) {
   var item = new oc.News.Item(goog.date.fromIsoString(json['date'])); 
   item.content = json['content'];  
    return item;
};
/**
 * @param {oc.Socket} socket
 * @constructor
 */
oc.News.View = function(socket) {
    var self = this; 
    
    /**
     * @type {Array.<oc.News.Item>}
     */
    this.items = [];

    socket.addCallback('news',function(data) {
        
    });
    this.refresh();
};
oc.News.View.prototype.refresh = function() {
    var self = this; 
    var feed = goog.dom.query("#welcome .news .feed")[0];
    goog.net.XhrIo.send('/news',function(e) {
        var data = goog.json.unsafeParse(e.target.getResponseText())['news'];
        feed.innerHTML = '';
        
        // iterate backwards
        for (var i=0; i < data.length; i++)
        {
            var item = oc.News.Item.extractFromJson(data[i]);
            self.createItem(item);
            self.items.push(item);
        }
    });
    goog.net.XhrIo.send('/twitter',function(e) {
        var data = e.target.getResponseJson();
        var twitter = goog.dom.query('.twitter .tweets')[0];
        twitter.innerHTML = '';
        goog.array.forEach(data,function(tweet) {
            var text = tweet['text'];
            text = text.replace(/(#\w+)/g,'<span class="hi">$1</span>');
            text = text.replace(/(@\w+)/g,'<span class="hi">$1</span>');
            var date = new goog.date.DateTime(new Date(Date.parse(tweet['created_at'])));
            var frag = goog.dom.htmlToDocumentFragment('<div class="tweet">'+text+' &mdash; <span class="date">'+oc.Util.prettyDate(date)+'</span></div>');
            goog.dom.appendChild(twitter,frag);
        }); 
    });
};

/**
 * @param {oc.News.Item} item
 */
oc.News.View.prototype.createItem = function(item) {
    var feed = goog.dom.query('#welcome .news .feed')[0];
    var date;
     
    if (goog.date.isSameDay(item.date))
    {
        date = item.date.toUsTimeString();
    } else
        date = (item.date.getMonth()+1)+"/"+item.date.getDate()+" "+item.date.toUsTimeString();
    
    // is this the same as the last item?
    /*
    if (this.items.length > 0 && !goog.date.isSameDay(item.date,this.items[this.items.length-1].date))
    {
        goog.dom.appendChild(feed,goog.dom.createDom('hr'));
    }
    */

    var html = oc.Templates.Main.newsItem({date:date,content:item.content});
    goog.dom.appendChild(feed,goog.dom.htmlToDocumentFragment(html));
    
};

