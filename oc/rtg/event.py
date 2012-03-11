class Open:
    def __init__(self,conn):
        self.conn = conn
class Register:
    def __init__(self,paths,conn):
        self.paths = paths
        self.conn = conn
class Close:
    def __init__(self,conn):
        self.conn = conn
class Message:
    def __init__(self,path,etype,payload):
        self.path = path
        self.etype = etype
        self.payload = payload
class NewAuthKey:
    def __init__(self,uid,key):
        self.uid = uid
        self.key = key
class Auth:
    def __init__(self,conn,key):
        self.conn = conn
        self.key = key
class QueueKill:
    pass
class Chat:
    def __init__(self,conn,msg):
        self.conn = conn
        self.msg = msg