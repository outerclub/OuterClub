define(['underscore','nav','user'],function(_,nav,user) {
    return {
        go:function() {
            $.getJSON('/leaderboard',function(data) {
                nav.setTitle($("#leaderboard").attr('title'));
                var html = '';
                _.each(data.users,function(u) {
                    html += '<div class="entry">'+
                        '<div class="number"><span>'+u.rank+'</span>'+
                        '</div><img name="'+u.user_id+'" style="cursor: pointer" src="/static/images/avatars/'+u.avatar_image+'" height="90" width="90"/><div class="text">'+
                        '<h2><a href="/user/'+u.user_id+'" name="'+u.user_id+'">'+u.name+'</a></h2>'+
                        '<p>Prestige: '+u.prestige+'</p></div></div>';
                }); 
                $("#leaderboard .entry").remove();
                $("#leaderboard").append(html);
                nav.hideAll();
                $("#leaderboard").show();
                $("#leaderboard h2 a").add($("#leaderboard img")).click(function() {
                    user.go($(this).attr('name'));
                    return false;
                }); 
            });
        }
    }
});
