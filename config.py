class WebserverConfig:
    RTG_SERVER = 'localhost'
    RTG_SERVER_PORT = 9090
    RTG_WEBPORT = 8080

    MYSQL_SERVER = 'localhost'
    MYSQL_USER = 'root'
    MYSQL_PASSWORD = 'asdfgh'
    MYSQL_DATABASE = 'oc'

    BIND_ADDRESS = '0.0.0.0'
    PORT = 5000
    DEBUG = True

    MAIL_SERVER = 'email-smtp.us-east-1.amazonaws.com'
    EMAIL_ADDRESS = 'no-reply@outerclub.com'
    EMAIL_USER = None
    EMAIL_PASSWORD = None
    ERROR_EMAIL = 'ice.arch@gmail.com'

class RtgConfig:
    PORT = 9090

    MYSQL_SERVER = 'localhost'
    MYSQL_USER = 'root'
    MYSQL_PASSWORD = 'asdfgh'
    MYSQL_DATABASE = 'oc'
    WEBPORT = 8080

