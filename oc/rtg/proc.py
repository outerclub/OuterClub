import event
import threading
import Queue
import json
import MySQLdb
from config import DefaultConfig

class QueueProc(threading.Thread):
    auth = dict()

    uid_sessions= dict()
    conns = dict()
    paths = dict() 
    queue = Queue.Queue()
    happening = []

    users = dict()
    db = MySQLdb.connect(DefaultConfig.mysql_server,DefaultConfig.mysql_user,DefaultConfig.mysql_password,DefaultConfig.mysql_database)
    
    # convert a list of connections to keys
    def connsToUids(self,arr):
        h = set()
        for c in arr:
            if (c in self.conns):
                h.add(self.conns[c]['uid'])
            else:
                print 'lost connid %s' %c
        return h
    def fetchViewerInfo(self,h):
        cur = self.db.cursor()
        ret = dict()
        for uid in h:
            cur.execute('SELECT avatar_image from user where user_id=%s',(uid,))
            res = cur.fetchone()
            ret[uid] = res[0]
        return ret

    def updateViewers(self,path,conn_id):
        viewers = self.fetchViewerInfo(self.connsToUids(self.paths[path]['conns']))
        for conn in self.paths[path]['conns']:
            # ignore this connection
            if conn != conn_id:
                self.send(conn,['viewers',viewers])

    def send(self,conn_id,payload):
        self.conns[conn_id]['conn'].send(json.dumps(payload))

    def run(self):
        while True:
            msg = self.queue.get(True)
            if isinstance(msg,event.Open):
                conn_id = msg.conn.session.session_id
                print '%s, open' % (conn_id)
                self.conns[conn_id] = {'conn': msg.conn}
            elif isinstance(msg,event.NewAuthKey):
                self.auth[msg.uid] = msg.key
            elif isinstance(msg,event.Auth):
                conn_id = msg.conn.session.session_id
                # success?
                if msg.uid in self.auth and self.auth[msg.uid] == msg.key:
                    print 'authenticated %s %s' %(msg.uid,msg.key)
                    self.conns[conn_id]['uid'] = msg.uid 
                    self.conns[conn_id]['paths'] = set() 
                    if not msg.uid in self.uid_sessions:
                        self.uid_sessions[msg.uid] = []
                    
                    self.uid_sessions[msg.uid].append(conn_id)
                else:
                    self.send(conn_id,['authRejected']);
                    pass
            elif isinstance(msg,event.Register):
                conn_id = msg.conn.session.session_id
                if 'uid' in self.conns[conn_id]:
                    print '%s, %s, register: %s' % (conn_id,self.conns[conn_id]['uid'],msg.paths)
                    reg=[]
                    for p in msg.paths:
                        if not p in self.conns[conn_id]['paths']:
                            reg.append(['ins',p])
                    for p in self.conns[conn_id]['paths']:
                        if not p in msg.paths:
                            reg.append(['del',p])
                        
                    # Process path adjustments
                    for pathAdjustment in reg:
                        path = pathAdjustment[1]
                        if not path in self.paths:
                            self.paths[path] = {'conns':set(),'uids':set()}

                        before = self.paths[path]['uids']
                        if pathAdjustment[0] == 'ins':
                            # add connection and path
                            self.conns[conn_id]['paths'].add(path)
                            self.paths[path]['conns'].add(conn_id)
                        else:
                            # delete connection from path
                            self.conns[conn_id]['paths'].remove(path)
                            self.paths[path]['conns'].remove(conn_id)

                        self.paths[path]['uids'] = self.connsToUids(self.paths[path]['conns'])
                        
                        if (path.startswith('/conversation/')):
                            # send the current list of viewers if requested
                            if (path in msg.paths):
                                self.send(conn_id, ['viewers',self.fetchViewerInfo(self.paths[path]['uids'])])
                            # send to others if viewers has changed
                            diff = before ^ self.paths[path]['uids']
                            if len(diff) > 0:
                                self.updateViewers(path,conn_id)
                        elif (path.startswith('/happening')):
                            self.send(conn_id,['happening_init',self.happening])
                
            elif isinstance(msg,event.Close):
                conn_id = msg.conn.session.session_id
                print '%s, close' % (conn_id)
                if 'uid' in self.conns[conn_id]:
                    # remove connection from all paths
                    for path in self.conns[conn_id]['paths']:
                        if conn_id in self.paths[path]['conns']:
                            before = self.paths[path]['uids']
                            self.paths[path]['conns'].remove(conn_id)
                            self.paths[path]['uids'] = self.connsToUids(self.paths[path]['conns'])
                            diff = before ^ self.paths[path]['uids']
                            if (path.startswith('/conversation/') and len(diff) > 0):
                                self.updateViewers(path,conn_id)

                        # no more connections? delete listening path
                        if not self.paths[path]['conns']:
                            del self.paths[path]
                     
                    # cleanup connection
                    myConn = self.conns[conn_id]
                    self.uid_sessions[myConn['uid']].remove(conn_id)
                    if len(self.uid_sessions[myConn['uid']]) == 0:
                        del self.uid_sessions[myConn['uid']]
                del self.conns[conn_id]
            elif isinstance(msg,event.Message):
                # distribute to path
                if (msg.path in self.paths):
                    for conn in self.paths[msg.path]['conns']: 
                        # new response or conversation
                        if msg.etype == 'response' or msg.etype == 'conversation':
                            p = msg.payload
                            self.send(conn,[msg.etype,p])
                        # new happening now event
                        elif msg.etype == 'happening':
                            p = msg.payload
                            happening_data = {'type':p['type'],'data':p['data']}
                            self.send(conn,[msg.etype,happening_data])
                            self.happening.append(happening_data)
                            # limit the stored happening nows
                            if (len(self.happening) > 6):
                                self.happening = self.happening[1:]
                    
            if msg == event.QueueKill:
                break
    @staticmethod
    def put(msg):
        QueueProc.queue.put(msg)

    @staticmethod
    def stop():
        QueueProc.put(event.QueueKill)

