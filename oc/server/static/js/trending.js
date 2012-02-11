goog.provide('oc.Trending');
goog.require('oc.Nav');
goog.require('oc.Category');
goog.require('goog.array');
goog.require('goog.dom');

/**
 * @constructor
 */
oc.Trending = function(category) {
    this.category = category;
};
oc.Trending.prototype.go = function() {
    var self = this;
    $.getJSON('/trending',function(data) {
        oc.Nav.setTitle($("#trending").attr('title'));
        var html = '';
        goog.array.forEach(data.conversations,function(c) {
            html += '<div class="entry">'+
                    '<div class="number"><span>'+c.rank+'</span></div>'+
                    '<img src="/static/images/categories/'+c.image+'" height="90" width="130" />'+
                    '<div class="text"><h2><a href="/conversation/'+c.d_id+'" name="'+c.d_id+'">'+c.title+'</a></h2>'+
                        '<div class="date">'+c.date+'</div>'+
                        '<p>'+c.content+'</p></div></div>';
        });
        $("#trending .entry").remove();
        $("#trending").append(html);
        
        oc.Nav.hideAll();
        $("#trending").show();
        $("#trending h2 a").click(function() {
            self.category.goConversation($(this).attr('name'));
            return false;
        });
    });
};
