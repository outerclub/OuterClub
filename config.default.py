class WebserverConfig:
    RTG_SERVER = 'localhost'
    RTG_SERVER_PORT = 9090
    RTG_WEBPORT = 8080

    MYSQL_SERVER = 'localhost'
    MYSQL_USER = None
    MYSQL_PASSWORD = None
    MYSQL_DATABASE = None

    BIND_ADDRESS = '0.0.0.0'
    PORT = 5000
    DEBUG = True

    EMAIL_SERVER = 'email-smtp.us-east-1.amazonaws.com'
    EMAIL_PORT = 465
    EMAIL_ADDRESS = 'no-reply@outerclub.com'
    EMAIL_USER = None
    EMAIL_PASSWORD = None
    ERROR_EMAIL = None
    
    FB_APPID = '251976601561013'
    
    UPLOAD_FOLDER='oc/server/static/upload'
    COVER_FOLDER = 'oc/server/static/images/covers'
    AVATAR_FOLDER = 'oc/server/static/images/avatars'
    MAX_CONTENT_LENGTH=5*1024*1024
    IMAGEMAGICK_CONVERT = '/usr/bin/convert'

class RtgConfig:
    PORT = 9090

    MYSQL_SERVER = 'localhost'
    MYSQL_USER = None
    MYSQL_PASSWORD = None
    MYSQL_DATABASE = None
    WEBPORT = 8080

