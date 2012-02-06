define(['underscore','nav','category'],function(_,nav,category) {
    return {
        go:function() {
            $.getJSON('/trending',function(data) {
                nav.setTitle($("#trending").attr('title'));
                var html = '';
                _.each(data.conversations,function(c) {
                    html += '<div class="entry">'+
                            '<div class="number"><span>'+c.rank+'</span></div>'+
                            '<img src="/static/images/categories/'+c.image+'" height="90" width="130" />'+
                            '<div class="text"><h2><a href="/conversation/'+c.d_id+'" name="'+c.d_id+'">'+c.title+'</a></h2>'+
                                '<div class="date">'+c.date+'</div>'+
                                '<p>'+c.content+'</p></div></div>';
                });
                $("#trending .entry").remove();
                $("#trending").append(html);
                
                nav.hideAll();
                $("#trending").show();
                $("#trending h2 a").click(function() {
                    category.goConversation($(this).attr('name'));
                    return false;
                });
            });
        }
    }
});
