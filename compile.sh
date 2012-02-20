#!/bin/bash
DIR='oc/server/static/css'
java -jar tools/closure-stylesheets-20111230.jar --allow-unrecognized-functions $DIR/reset.css $DIR/misc.css $DIR/footer.css $DIR/layout.css $DIR/welcome.css $DIR/trending.css $DIR/user.css $DIR/categories.css $DIR/category.css $DIR/conversation.css > $DIR/layout.compiled.css
java -jar tools/plovr-4b3caf2b7d84.jar build tools/plovr-config.txt > oc/server/static/js/all.compiled.js
