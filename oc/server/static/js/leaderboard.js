goog.provide('oc.Leaderboard');
goog.require('oc.Nav');
goog.require('oc.User');
goog.require('goog.array');

/**
 * @constructor
 */
oc.Leaderboard = function(user) {
    this.user = user;
}
oc.Leaderboard.prototype.go = function() {
    var self = this;
    $.getJSON('/leaderboard',function(data) {
        self.nav.setTitle($("#leaderboard").attr('title'));
        var html = '';
        goog.array.forEach(data.users,function(u) {
            html += '<div class="entry">'+
                '<div class="number"><span>'+u.rank+'</span>'+
                '</div><img name="'+u.user_id+'" style="cursor: pointer" src="/static/images/avatars/'+u.avatar_image+'" height="90" width="90"/><div class="text">'+
                '<h2><a href="/user/'+u.user_id+'" name="'+u.user_id+'">'+u.name+'</a></h2>'+
                '<p>Prestige: '+u.prestige+'</p></div></div>';
        }); 
        $("#leaderboard .entry").remove();
        $("#leaderboard").append(html);
        oc.Nav.hideAll();
        $("#leaderboard").show();
        $("#leaderboard h2 a").add($("#leaderboard img")).click(function() {
            self.user.go($(this).attr('name'));
            return false;
        }); 
    });
};
