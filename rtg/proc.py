import event
import threading
import Queue

class QueueProc(threading.Thread):
    userKeys = dict()
    conns = dict()
    paths = dict() 
    queue = Queue.Queue()
    happening = []
    
    # convert a list of connections to keys
    def connsToKeys(self,arr):
        h = set()
        for c in arr:
            h.add(self.conns[c]['key'])
        return h
    def keysToUsers(self,h):
        ret = dict()
        for key in h:
            ret[key] = self.userKeys[key]['avatar'];
        return ret

    def updateViewers(self,path,conn_id):
        viewers = self.keysToUsers(self.connsToKeys(self.paths[path]['conns']))
        for conn in self.paths[path]['conns']:
            # ignore this connection
            if conn != conn_id:
                self.conns[conn]['conn'].emit('viewers',viewers)

    def run(self):
        while True:
            msg = self.queue.get(True)
            if isinstance(msg,event.Open):
                conn_id = msg.conn.session.session_id
                self.conns[conn_id] = {'key':msg.key,'paths':set(),'conn': msg.conn}
                if not msg.key in self.userKeys:
                    self.userKeys[msg.key] = {'sessions':[],'avatar': 'user_1.png' }
                
                self.userKeys[msg.key]['sessions'].append(conn_id)
            elif isinstance(msg,event.Register):
                conn_id = msg.conn.session.session_id
                # add connection and path
                self.conns[conn_id]['paths'].add(msg.path)
                if not msg.path in self.paths:
                    self.paths[msg.path] = {'conns':set(),'keys':set()}

                before = self.paths[msg.path]['keys']
                self.paths[msg.path]['conns'].add(conn_id)
                self.paths[msg.path]['keys'] = self.connsToKeys(self.paths[msg.path]['conns'])
                
                if (msg.path.startswith('/discussion/')):
                    # send the current list of viewers
                    msg.conn.emit('viewers',self.keysToUsers(self.paths[msg.path]['keys']))
                    # send to others if viewers has changed
                    diff = before ^ self.paths[msg.path]['keys']
                    if len(diff) > 0:
                        self.updateViewers(msg.path,msg.conn)
                elif (msg.path.startswith('/happening')):
                    msg.conn.emit('happening_init',self.happening);
            elif isinstance(msg,event.Close):
                conn_id = msg.conn.session.session_id
                # remove connection from all paths
                for path in self.conns[conn_id]['paths']:
                    if conn_id in self.paths[path]['conns']:
                        before = self.paths[path]['keys']
                        self.paths[path]['conns'].remove(conn_id)
                        self.paths[path]['keys'] = self.connsToKeys(self.paths[path]['conns'])
                        diff = before ^ self.paths[path]['keys']
                        if (path.startswith('/discussion/') and len(diff) > 0):
                            self.updateViewers(path,conn_id)

                    # no more connections? delete listening path
                    if not self.paths[path]['conns']:
                        del self.paths[path]
                 
                # cleanup connection
                self.userKeys[self.conns[conn_id]['key']]['sessions'].remove(conn_id)
                if len(self.userKeys[self.conns[conn_id]['key']]['sessions']) == 0:
                    del self.userKeys[self.conns[conn_id]['key']]
                del self.conns[conn_id]
            elif isinstance(msg,event.Message):
                # distribute to path
                if (msg.path in self.paths):
                    for conn in self.paths[msg.path]['conns']: 
                        # new response
                        if msg.etype == 'response':
                            p = msg.payload
                            self.conns[conn]['conn'].emit(msg.etype,{'user':p.username,'date':p.date,'content':p.content,'avatar':p.avatar})
                        # new discussion
                        elif msg.etype == 'discussion':
                            p = msg.payload
                            self.conns[conn]['conn'].emit(msg.etype,{'d_id':p.d_id,'user':p.username,'date':p.date,'title':p.title,'user_id':p.user_id})
                        # new happening now event
                        elif msg.etype == 'happening':
                            p = msg.payload
                            happening_data = {'type':p['type'],'data':p['data']}
                            self.conns[conn]['conn'].emit(msg.etype,happening_data)
                            self.happening.append(happening_data)
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

