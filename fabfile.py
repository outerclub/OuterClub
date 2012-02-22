from fabric.api import local
from datetime import datetime

def compile():
    BASE_DIR = 'oc/server/static'
    CSS_DIR = BASE_DIR+'/css'
    local('java -jar tools/closure-stylesheets-20111230.jar --allow-unrecognized-functions %s/reset.css %s/misc.css %s/footer.css %s/layout.css %s/welcome.css %s/about.css %s/trending.css %s/user.css %s/categories.css %s/category.css %s/conversation.css > .c.css'.replace('%s',CSS_DIR))
    
    checksum=local("md5sum .c.css | awk '{print $1}'",capture=True)
    css_file = '%s.c.css' % checksum
    local('mv .c.css %s/%s' % (CSS_DIR,css_file))

    JS_DIR = BASE_DIR+'/js'
    local('java -jar tools/plovr-4b3caf2b7d84.jar build tools/plovr-config.txt > .c.js')
    checksum=local("md5sum .c.js | awk '{print $1}'",capture=True)
    js_file = '%s.c.js' % checksum
    local('mv .c.js %s/%s' %(JS_DIR,js_file) )

    f = open('.c.properties','w')
    f.write('[css]\nfile=%s\n' % (css_file))
    f.write('[js]\nfile=%s\n' % (js_file))
    f.close()
    
    local(' cp -r %s/* /var/www' % (BASE_DIR))
