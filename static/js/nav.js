define(function() {
    return {
        hideAll: function() {
            $(".frame > div").hide();
            $("#category_head").hide();
            $("#discussion").hide();
            $("#dynamic").hide();
            $(".menu_tab").hide();
        },
        go: function(loc) {
            this.hideAll();
            $('.menu_tab li').each(function() { $(this).removeClass('active'); });
            $(".menu_tab a[href='"+loc+"']").parent().addClass('active');
            $('.menu_tab').show();
            var element = $(loc);
            element.show();
            $('title').html(element.attr('title')+' - OuterClub');
        }
    };
});
