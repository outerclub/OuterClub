import config
from ConfigParser import SafeConfigParser
from oc.server import server
app = server.app
if not config.WebserverConfig.DEBUG:
    parser = SafeConfigParser()
    parser.read('.c.properties')
    cfg = config.WebserverConfig.COMPILE = dict()
    for section_name in parser.sections():
        cfg[section_name] = dict()
        for name,value in parser.items(section_name):
            cfg[section_name][name] = value         

server.config(config.WebserverConfig)
server.run()
