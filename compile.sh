#!/bin/bash
DIR='oc/server/static/css'
java -jar tools/closure-stylesheets-20111230.jar $DIR/reset.css $DIR/footer.css $DIR/layout.css $DIR/welcome.css $DIR/trending.css $DIR/user.css $DIR/categories.css $DIR/category.css $DIR/conversation.css > oc/server/static/css/layout.compiled.css
java -jar tools/plovr-4b3caf2b7d84.jar build plovr-config.txt > oc/server/static/js/all.compiled.js
