import MySQLdb
from DBUtils.PooledDB import PooledDB

from ..server import database
import event
import threading
import Queue
import json
import pickle
from datetime import datetime

class QueueProc(threading.Thread):
    MAX_HAPPENING = 5
    def save(self):
        f = open('.store.cache','w')
        pickle.dump(self.happening,f)
        f.close() 

    def init(self,config):
        self.pool = PooledDB(creator=MySQLdb,mincached=10,host=config.MYSQL_SERVER,user=config.MYSQL_USER,passwd=config.MYSQL_PASSWORD,db=config.MYSQL_DATABASE)
        try:
            h = pickle.load(open('.store.cache','r'))
            self.happening = h
            if len(self.happening) > QueueProc.MAX_HAPPENING:
                self.happening = self.happening[-QueueProc.MAX_HAPPENING:]
            print 'RTG: reloaded store'
        except Exception as e:
            self.happening = []
        self.queue = Queue.Queue()
        self.auth = dict()

        self.uid_sessions= dict()
        self.conns = dict()
        self.paths = dict() 
        self.chats = []

    
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
        conn = self.pool.connection()
        cur = conn.cursor()
        ret = dict()
        for uid in h:
            cur.execute('SELECT avatar_image from user where user_id=%s',(uid,))
            res = cur.fetchone()
            ret[uid] = res[0]
        cur.close()
        conn.close()
        return ret
    def updateOnline(self):
        users = len(self.uid_sessions.keys())
        if '/happening' in self.paths:
            for conn in self.paths['/happening']['conns']: 
                self.send(conn,['users',users])

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
            try:
                if isinstance(msg,event.NewAuthKey):
                    self.auth[msg.key] = msg.uid
                # internal messages
                elif isinstance(msg,event.Message):
                    # distribute to path
                    if (msg.path in self.paths):
                        print 'distribute %s' % (msg.path)
                        p = msg.payload
                        if msg.etype == 'happening':
                            happening_data = {'type':p['type'],'data':p['data']}
                            for conn in self.paths[msg.path]['conns']: 
                                self.send(conn,[msg.etype,happening_data])
                            self.happening.append(happening_data)
                            # limit the stored happening nows
                            if (len(self.happening) > QueueProc.MAX_HAPPENING):
                                self.happening = self.happening[1:]
                            self.save()
                        else:
                            for conn in self.paths[msg.path]['conns']: 
                                p = msg.payload
                                self.send(conn,[msg.etype,p])
                elif msg == event.QueueKill:
                    break
                else:
                    # process normal connection events from clients
                    conn_id = msg.conn.session.session_id
                    if isinstance(msg,event.Open):
                        print '%s, open' % (conn_id)
                        self.conns[conn_id] = {'conn': msg.conn}
                    elif isinstance(msg,event.Close):
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
                            self.updateOnline()
                        del self.conns[conn_id]
                    elif isinstance(msg,event.Auth):
                        # success?
                        if msg.key in self.auth:
                            uid = self.auth[msg.key]
                            print 'authenticated %s %s' %(uid,msg.key)
                            self.conns[conn_id]['uid'] = uid 
                            self.conns[conn_id]['paths'] = set() 
                            if not uid in self.uid_sessions:
                                self.uid_sessions[uid] = []
                            
                            self.uid_sessions[uid].append(conn_id)
                            self.send(conn_id,['happening_init',self.happening])
                            users = len(self.uid_sessions.keys())
                            self.send(conn_id,['users',users])
                        else:
                            self.send(conn_id,['authRejected']);
                        self.updateOnline()
                    # process events that require authentication
                    elif conn_id in self.conns and 'uid' in self.conns[conn_id]:
                        if isinstance(msg,event.Register):
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
                        elif isinstance(msg,event.Chat):
                            self.chats.append(msg.msg)
                            uid = self.conns[conn_id]['uid']
                            if '/chat' in self.paths:
                                conn = self.pool.connection()
                                cur = conn.cursor()
                                user = database.fetchUser(cur,uid)
                                cur.close()
                                conn.close()
                                for c in self.paths['/chat']['conns']:
                                    self.send(c,['chat',{'date':datetime.now().isoformat(),'message':msg.msg,'user':user}])
                    else:
                        self.send(conn_id,['authRejected']);
            except Exception as e:
                import traceback
                print 'unexpected error:'
                traceback.print_exc()
                    

    def put(self,msg):
        self.queue.put(msg) 

    def stop(self):
        self.put(event.QueueKill)

