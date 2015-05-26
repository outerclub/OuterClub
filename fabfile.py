from fabric.api import local,settings
from datetime import datetime
from fabric.api import env,run,cd
env.user = 'mlin'
env.hosts=['outerclub.com']

BASE_DIR = 'oc/server/static'
BUILD_DIR = BASE_DIR+'/build'
def t():
    local('mkdir -p %s' % BUILD_DIR)
    local('java -jar tools/SoyToJsSrcCompiler.jar \
        --shouldProvideRequireSoyNamespaces \
        --shouldGenerateJsdoc \
        --outputPathFormat %s/soy.js \
        oc/server/static/js/*.soy' % BUILD_DIR)
def c():
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
def local_dev():
    with settings(warn_only=True):
        local('pkill -f rtg.py')
        local('pkill -f main.py')
    local('rm -f oc/server/static/upload/*')
    pwd = local('pwd',capture=True)
    local('python -u %s/rtg.py &' % (pwd))
    local('python -u %s/main.py &' % (pwd))
    
def ext_restart(pwd):
        local('mkdir -p logs')
        with settings(warn_only=True):
            local('pkill -f "rtg"')
            local('pkill -f "main"')
        local('rm -f logs/*.log logs/*.err')
        local('rm -f %s/upload/*' % BASE_DIR)
        local('screen -d -m sh -c "python -u rtg.py > logs/rtg.log 2>&1"')
        local('screen -d -m sh -c "python -u main.py > logs/main.log 2>&1"')
    
def ext_compile():
    local('git pull')
    local('mkdir -p %s' % BUILD_DIR)
    local('java -jar tools/SoyToJsSrcCompiler.jar \
        --shouldProvideRequireSoyNamespaces \
        --shouldGenerateJsdoc \
        --outputPathFormat %s/soy.js \
        oc/server/static/js/*.soy' % BUILD_DIR)
    local('java -jar tools/closure-stylesheets-20111230.jar --allow-unrecognized-functions %s/reset.css %s/misc.css %s/footer.css %s/layout.css %s/welcome.css %s/about.css %s/trending.css %s/user.css %s/category.css %s/conversation.css > .c.css'.replace('%s',BASE_DIR+'/css'))
    
    checksum=local("md5sum .c.css | awk '{print $1}'")
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
        > .c.js'.replace('%s',BUILD_DIR))
    checksum=local("md5sum .c.js | awk '{print $1}'")
    js_file = '%s.c.js' % checksum
    local('mv .c.js %s/%s' %(BUILD_DIR,js_file) )
    local('echo "[css]\nfile=%s\n[js]\nfile=%s" > .c.properties' % (css_file,js_file))
    
def ext_deployStatic():
    local('mkdir -p /var/www')
    local('cp -r %s /var/www' % (BASE_DIR))
    
def ext_restartProd():
    with cd('TheOuterClub'):
        d = run('pwd')
        ext_restart(d)
        
def ext_deployProd():
    with cd('TheOuterClub'):
        d = run('pwd')
        ext_compile()
        ext_deployStatic()
        ext_restart(d)
        
def ext_deployDev():
    with cd('OuterClub-dev'):
        d = run('pwd')
        ext_compile()
        ext_restart(d)

def go():
  d = local('pwd')
  ext_compile()
  ext_deployStatic()
  ext_restart(d)
