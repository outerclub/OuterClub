goog.provide('oc.Nav');
goog.require('jquery');
oc.Nav = {
        hideAll: function() {
            $(".frame > div").hide();
            $(".heading").hide();
            $("#discussion").hide();
            $("#dynamic").hide();
            $("#dynamic").removeClass();
        },
        setTitle:function(t) {
            $('title').html(t+' - OuterClub');
        }
    };
