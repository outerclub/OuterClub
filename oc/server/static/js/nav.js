define(function() {
    return {
        hideAll: function() {
            $(".frame > div").hide();
            $("#category_head").hide();
            $("#discussion").hide();
            $("#dynamic").hide();
            $("#dynamic").removeClass();
        },
        setTitle:function(t) {
            $('title').html(t+' - OuterClub');
        }
    };
});
