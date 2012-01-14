var socket;
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
    socket = new io.connect('192.168.56.101:8002/?key='+user_id,{ rememberTransport: true });
    socket.on('connect',function() {
        socket.emit('register','/happening');
    });
    socket.on('happening',function(data) {
        createHappening(data,true);
    });
    socket.on('happening_init',function(data) {
        for (var h in data) {
            createHappening(data[h],false);
        }
    });
    $("#trending a.entry").click(function() {
        goDiscussion($(this).attr('id'));
        return false;
    });
}
function navigate(loc) {
    $(".frame > div").hide();
    $('.menu_tab').show();
    $('.menu_tab li').each(function() { $(this).removeClass('active'); });
    $(".menu_tab a[href='"+loc+"']").parent().addClass('active');
    $("#category_head").hide();
    var element = $(loc);
    element.show();
    $('title').html(element.attr('title')+' - TheOuterClub');
}
$('.menu_tab a').click(function() {
    navigate($(this).attr('href'));
    return false;
});
$("#categories a").click(function() {
        var name = $(this).attr('title');
        $('title').html(name+' - TheOuterClub');
        $.getJSON($(this).attr('href'),function(data) {
            $("#dynamic").html('');
            $("#dynamic").append('<div class="posts"></div>');
            $('.posts').append(createDiscussions(false,data['posts']));
            
            // hide tabs
            $(".frame > div").hide();
            $(".menu_tab").hide();

            $("#dynamic").show();

            // show category head
            $("#category_head h2").html(name);
            $("#category_head").show();
        });
/*
        socket.on('connect',function() {
            socket.emit('register','/category/{{ category_id }}');
        });
*/
        socket.on('discussion',function(data) {
            var d = createDiscussions(true,[{id:data.d_id,title:data.title,user:data.user,date:data.date}]);
            $('.posts').prepend(d);
            d.fadeIn();
        });
    return false; 
});
$(".header h1 a").click(function() {
    navigate('#welcome');
    return false;
});
function goDiscussion(id) {
       $.getJSON('/discussion/'+id,function(data) {
            $('title').html(data.title+' - TheOuterClub');
            $("#dynamic").hide();

            // hide tabs
            $(".frame > div").hide();
            $(".menu_tab").hide();

            // show category head
            $("#category_head h2").html(data.category_name);
            $("#category_head").show();
        }); 
};
function createDiscussions(hide,d_list) {
    //id,title,user,date
    var html = '';
    _.each(d_list,function(d) {
      html += '<div title="'+d.title+'" class="post" '+(hide ? 'style="display: none' : '')+ ' id="'+d.id+'">'
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
                lastDateSplit = $(previousD.get(x)).find('.date').text().split(' ');
                if (lastDateSplit.length == 4)
                {
                    break;
                }
            }
            
            var currentDateSplit = date.replace('  ',' ').split(' ');

            // same date as before?
            if (currentDateSplit[0] == lastDateSplit[0] && currentDateSplit[1] == lastDateSplit[1] &&
                currentDateSplit[2] == lastDateSplit[2])
            {
                date = currentDateSplit[3];
            }
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
 };

