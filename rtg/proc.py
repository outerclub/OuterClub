import event
import threading
import Queue

class QueueProc(threading.Thread):
    userKeys = dict()
    conns = dict()
    paths = dict() 
    queue = Queue.Queue()
    
    # convert a list of connections to keys
    def connsToKeys(self,arr):
        h = set()
        for c in arr:
            h.add(self.conns[c]['key'])
        ret = dict()
        for key in h:
            ret[key] = self.userKeys[key]['avatar'];
        return ret

    def updateViewers(self,path,viewers):
        for conn in self.paths[path]['conns']:
            self.conns[conn]['conn'].emit('viewers',viewers)

    def run(self):
        while True:
            msg = self.queue.get(True)
            if isinstance(msg,event.Open):
                sess_id = msg.conn.session.session_id
                self.conns[sess_id] = {'key':msg.key,'paths':set(),'conn': msg.conn}
                if not msg.key in self.userKeys:
                    self.userKeys[msg.key] = {'sessions':[],'avatar': 'user_1.png' }
                
                self.userKeys[msg.key]['sessions'].append(sess_id)
            elif isinstance(msg,event.Register):
                sess_id = msg.conn.session.session_id
                # add connection and path
                self.conns[sess_id]['paths'].add(msg.path)
                if not msg.path in self.paths:
                    self.paths[msg.path] = {'conns':set()}
                self.paths[msg.path]['conns'].add(sess_id)
                
                if (msg.path.startswith('/discussion/')):
                    self.updateViewers(msg.path,self.connsToKeys(self.paths[msg.path]['conns']))
            elif isinstance(msg,event.Close):
                sess_id = msg.conn.session.session_id
                # remove connection from all paths
                for path in self.conns[sess_id]['paths']:
                    if sess_id in self.paths[path]['conns']:
                        self.paths[path]['conns'].remove(sess_id)
                        if (path.startswith('/discussion/')):
                            self.updateViewers(path,self.connsToKeys(self.paths[path]['conns']))

                    # cleanup path?
                    if not self.paths[path]['conns']:
                        del self.paths[path]
                 
                # cleanup connection
                self.userKeys[self.conns[sess_id]['key']]['sessions'].remove(sess_id)
                del self.conns[sess_id]
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
                            self.conns[conn]['conn'].emit(msg.etype,{'type':p['type'],'data':p['data']})
                    
            if msg == event.QueueKill:
                break
    @staticmethod
    def put(msg):
        QueueProc.queue.put(msg)

    @staticmethod
    def stop():
        QueueProc.put(event.QueueKill)

