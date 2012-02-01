define(function() {
    return {
        hideAll: function() {
            $(".frame > div").hide();
            $("#category_head").hide();
            $("#discussion").hide();
            $("#dynamic").hide();
        },
        go: function(loc) {
            this.hideAll();
            $('#menu ul li a').each(function() { $(this).removeClass('active'); });
            $("#menu ul a[href='"+loc+"']").addClass('active');
            var element = $(loc);
            element.show();
            $('title').html(element.attr('title')+' - OuterClub');
        }
    };
});
