class Open:
    def __init__(self,conn,key):
        self.conn = conn
        self.key = key
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
class QueueKill:
    pass