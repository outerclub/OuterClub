from fabric.api import local
from datetime import datetime

BASE_DIR = 'oc/server/static'
BUILD_DIR = BASE_DIR+'/build'
def build_templates():
    local('mkdir -p %s' % BUILD_DIR)
    local('java -jar tools/SoyToJsSrcCompiler.jar \
        --shouldProvideRequireSoyNamespaces \
        --shouldGenerateJsdoc \
        --outputPathFormat %s/soy.js \
        oc/server/static/js/*.soy' % BUILD_DIR)
def c():
    build_templates()
    local('python tools/closure-library-read-only/closure/bin/calcdeps.py  \
        --path tools/closure-library-read-only/closure/goog \
        --path tools/soyutils_usegoog.js \
        --path oc/server/static/js/ \
        --path tools/closure-library-read-only/third_party/closure/goog/dojo/dom \
        --path %s/soy.js \
        --input oc/server/static/js/main.js \
        --compiler_jar tools/compiler.jar \
        --output_mode compiled \
        --compiler_flags="--js=tools/closure-library-read-only/closure/goog/deps.js" \
        --compiler_flags="--compilation_level=ADVANCED_OPTIMIZATIONS" \
        --compiler_flags="--formatting=PRETTY_PRINT" \
        --compiler_flags="--formatting=PRINT_INPUT_DELIMITER" \
        --compiler_flags="--warning_level=VERBOSE" \
        --compiler_flags="--jscomp_error=checkTypes" \
        --compiler_flags="--debug" \
        > %s/all.js'.replace('%s',BUILD_DIR))
    
def compile():
    build_templates()
    local('java -jar tools/closure-stylesheets-20111230.jar --allow-unrecognized-functions %s/reset.css %s/misc.css %s/footer.css %s/layout.css %s/welcome.css %s/about.css %s/trending.css %s/user.css %s/category.css %s/conversation.css > .c.css'.replace('%s',BUILD_DIR))
    
    checksum=local("md5sum .c.css | awk '{print $1}'",capture=True)
    css_file = '%s.c.css' % checksum
    local('mv .c.css %s/%s' % (BUILD_DIR,css_file))

    local('python tools/closure-library-read-only/closure/bin/calcdeps.py  \
        --path tools/closure-library-read-only/closure/goog \
        --path tools/soyutils_usegoog.js \
        --path oc/server/static/js/ \
        --path tools/closure-library-read-only/third_party/closure/goog/dojo/dom \
        --path %s/soy.js \
        --input oc/server/static/js/main.js \
        --compiler_jar tools/compiler.jar \
        --output_mode compiled \
        --compiler_flags="--js=tools/closure-library-read-only/closure/goog/deps.js" \
        --compiler_flags="--compilation_level=ADVANCED_OPTIMIZATIONS" \
        --compiler_flags="--warning_level=VERBOSE" \
        --compiler_flags="--jscomp_error=checkTypes" \
        > %s/all.js'.replace('%s',BUILD_DIR))
    checksum=local("md5sum .c.js | awk '{print $1}'",capture=True)
    js_file = '%s.c.js' % checksum
    local('mv .c.js %s/%s' %(BUILD_DIR,js_file) )

    f = open('.c.properties','w')
    f.write('[css]\nfile=%s\n' % (css_file))
    f.write('[js]\nfile=%s\n' % (js_file))
    f.close()
    
def deploy():
    local('mkdir -p /var/www')
    local('cp -r %s /var/www' % (BASE_DIR))
