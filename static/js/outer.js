var socket;
var socket_cb = {};
function createHappening(data,animate) {
        var p = data.data;
        if (data.type == 'response' || data.type == 'post')
        {
            var verb = 'replied in';
            if (data.type == 'post')
                verb = 'posted'; 
            var element = jQuery('<div class="item"><div class="images"><img class="bg" src="/static/images/categories/'+p.category_image+'" /><img class="avatar" src="/static/images/new/avatars/'+p.avatar+'" /></div><div class="text"><span class="date">'+p.date+'</span> <span class="user">'+p.user+'</span> '+verb+' <span class="content">'+p.title+'</span></div></div>');
            if (animate)
            {
                element.css('margin-right','-150px');
     
                $('.slide_show .scroll').append(element);
                element.animate({'margin-right':0});
            } else {
                $('.slide_show .scroll').append(element);
            }
        }
}
function init(user_id) {
    socket = new SockJS('http://192.168.56.101:8002/sock');
    socket.onopen = function() {
        socket.send(JSON.stringify(['register','/happening']));
    };
    socket.onmessage = function(message) {
        data = JSON.parse(message.data);
        if (data[0] in socket_cb)
            socket_cb[data[0]](data[1])
    };
    socket_cb['happening'] = function(data) {
        if ($('.slide_show .item').size() >= 6)
            $('.slide_show .item:first').remove();
    
        createHappening(data,true);
    };

    socket_cb['happening_init'] = function(data) {
        _.each(data,function(h,i) {
            createHappening(h,false);
        });
    };
    $("#trending a.entry").click(function() {
        goDiscussion($(this).attr('id'));
        return false;
    });
    $("#categories a").click(function() {
            var name = $(this).attr('title');
            var cat_id = $(this).attr('id');
        goCategory(name,cat_id,$(this).attr('href'));
        return false; 
    });
    $('.menu_tab a').click(function() {
        navigate($(this).attr('href'));
        return false;
    });
    $(".header h1 a").click(function() {
        navigate('#welcome');
        return false;
    });
    $("#category_head .right button").overlay({
        mask: {
            color: '#000',
            loadSpeed: 200,
            opacity: 0.3
        }
    });
    $("#facebox button[name='post']").click(function() {
            $.post('/post',{ area: $("#category_head .left h2").html(),title:$("input[name='title']").val(),content:$("#facebox textarea").val() });
        });
}
function hideAll()
{
    $(".frame > div").hide();
    $("#category_head").hide();
    $("#discussion").hide();
    $("#dynamic").hide();
    $(".menu_tab").hide();
}
function showCategoryHead(name,id,href)
{
    // show category head
    $("#category_head h2").html(name);
    $("#category_head a").attr('href',href);
    $("#category_head").show();

    $("#category_head a").unbind();
    $("#category_head a").click(function() {
        goCategory(name,id,href);
        return false;
    });
}
function navigate(loc) {
    hideAll();
    $('.menu_tab li').each(function() { $(this).removeClass('active'); });
    $(".menu_tab a[href='"+loc+"']").parent().addClass('active');
    $('.menu_tab').show();
    var element = $(loc);
    element.show();
    $('title').html(element.attr('title')+' - TheOuterClub');
}
function goCategory(name,id,href)
{
    $('title').html(name+' - TheOuterClub');
    $.getJSON(href,function(data) {
        $("#dynamic").html('');
        $("#dynamic").append('<div class="posts"></div>');
        $('.posts').append(createDiscussions(false,data['posts']));
        
        hideAll();
        $("#dynamic").show();

        showCategoryHead(name,id,href);
        socket.send(JSON.stringify(['register','/happening','/category/'+id]));
    });
    socket_cb['discussion'] = function(data) {
        var d = createDiscussions(true,[{id:data.d_id,title:data.title,user:data.user,date:data.date}]);
        $('.posts').prepend(d);
        d.fadeIn();
    };
}
var currentViewers = [];
function goDiscussion(id) {
       $.getJSON('/discussion/'+id,function(data) {
            hideAll();
            $('title').html(data.discussion.title+' - TheOuterClub');

            // show category head
            showCategoryHead(data.category_name,data.category_id,data.category_url);

            socket.send(JSON.stringify(['register','/happening','/discussion/'+id]));

            socket_cb['response'] = function(data) {
                createResponse(true,data.user,data.date,data.content,data.avatar);
            };
            socket_cb['viewers'] = function(viewers) {
                // scan for removals
                var toRemove = [];
                for (var v in currentViewers)
                {
                    if (!(v in viewers))
                    {
                        $("#v_"+v).fadeOut(function() {
                            $(this).remove();
                        });
                        delete currentViewers[v];
                    }
                }
                // scan for insertions
                for (v in viewers) {
                    if (!(v in currentViewers)) {
                        user = jQuery('<img id="v_'+v+'"src="/static/images/new/avatars/'+viewers[v]+'" />');
                        user.hide();
                        $(".discussion_frame .users").append(user);
                        user.fadeIn();
                        currentViewers[v] = '';
                    }
                }
            };
            
            $("#discussion .room h2").html(data.discussion.title);
            $("#discussion .discussion").remove();
            createResponse(false,data.discussion.user,data.discussion.date,data.discussion.content,data.discussion.avatar);

            /**
             * Reply
             */
            $(".reply button").unbind();
            $(".reply button").click(function() {
                $.post('/reply', { d_id:data.discussion.id, data: $(".reply textarea").val()},
                    function(data) {
                        $("textarea").val('');
                });
            });
            _.each(data.responses,function(r) {
                createResponse(false,r.user,r.date,r.content,r.avatar);
            });
            $("#discussion").show();

        }); 
};
function createDiscussions(hide,d_list) {
    //id,title,user,date
    var html = '';
    _.each(d_list,function(d) {
      html += '<div title="'+d.title+'" class="post" '+(hide ? 'style="display: none"' : '')+ ' id="'+d.id+'">'
        + '<div class="post_content">'
        + '<h1>'+d.title+'</h1> <img src="/static/images/new/magnify.png" />'
        + '<div>Started by '+d.user+' on '+d.date+'</div>'
        + '</div>'
        + '<div class="post_nav">'
        //+ '<a class="tag" href="#">testTag</a>'
        + '</div><div class="clear"></div></div>';
    });
    html = jQuery(html);
    html.click(function() {
        goDiscussion($(this).attr('id'));
    });
    return html;
};
  function createResponse(fadeIn,user,date,content,avatar) {
            var previousD = $(".discussion");
            // get last full date
            var lastDateSplit;
            for (var x=previousD.size()-1; x >= 0; x--)
            {
                var dates = $(previousD.get(x)).find('.date');
                for (var y=dates.size()-1; y >= 0; y--)
                {
                    lastDateSplit = $(dates.get(y)).html().replace('  ',' ').split(' ');
                    if (lastDateSplit.length == 4)
                    {
                        break;
                    }
                }
                if (lastDateSplit.length == 4)
                {
                    break;
                }
            }
            if (lastDateSplit != null)
            {
                var currentDateSplit = date.replace('  ',' ').split(' ');

                // same date as before?
                if (currentDateSplit[0] == lastDateSplit[0] && currentDateSplit[1] == lastDateSplit[1] &&
                    currentDateSplit[2] == lastDateSplit[2])
                {
                    date = currentDateSplit[3];
                }
            }

            var lastDiscussion = $(".discussion:last");
            // combine the postings or create new one?
            if (lastDiscussion.find('.user h2').html() == user)
            {
                lastDiscussion.find('.content').append('<br />'+content+'<br /><div class="date">'+date+'</div>');
            } else {
                var str ='<div class="discussion" style="display: none">';
                str += '<div class="user">'+
                        '<div class="description">'+
                            '<h2>'+user+'</h2>'+
                            '<div>Prestige: 67</div>'+
                        '</div>'+
                        '<img src="/static/images/new/avatars/'+avatar+'" />'+
                    '</div>'+
                    '<div class="content">'+
                        content+
                        '<br />'+
                        '<div class="date">'+date+'</div>'+
                    '</div>';
                str += '</div>';
                $(".reply").before(str);
                if (fadeIn) {
                    $(".discussion:last").fadeIn();
                } else {
                    $(".discussion:last").show();
                }
            }

 };

