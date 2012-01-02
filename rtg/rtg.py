from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
from thrift.server import TServer
import threading

from t_rtg import RtgService
from t_rtg.ttypes import *
from os import path as op

import tornado
import tornado.web
import tornado.httpserver
import tornadio2
import tornadio2.router
import tornadio2.server
import tornadio2.conn
import Queue
import event

ROOT = op.normpath(op.dirname(__file__))


class IndexHandler(tornado.web.RequestHandler):
    """Regular HTTP handler to serve the chatroom page"""
    def get(self):
        self.render('index.html')


class SocketIOHandler(tornado.web.RequestHandler):
    def get(self):
        self.render('socket.io.js')

class ChatConnection(tornadio2.conn.SocketConnection):
    def on_open(self, info):
        print 'open'
        QueueProc.put(event.Open(self,info.arguments['key'][0]))

    def on_message(self,message):
        pass

    @tornadio2.event
    def register(self, path):
        QueueProc.put(event.Register(path,self))

    def on_close(self):
        QueueProc.put(event.Close(self))
        print 'kill'

# Create tornadio server
ChatRouter = tornadio2.router.TornadioRouter(ChatConnection)

# Create socket application
sock_app = tornado.web.Application(
    ChatRouter.urls,
    socket_io_port = 8002
)
#flash_policy_port = 843,
#flash_policy_file = op.join(ROOT, 'flashpolicy.xml'),

# Create HTTP application
http_app = tornado.web.Application(
    [(r"/", IndexHandler), (r"/socket.io.js", SocketIOHandler)]
)

# Create http server on port 8001
http_server = tornado.httpserver.HTTPServer(http_app)
http_server.listen(8001)

tornadio2.server.SocketServer(sock_app, auto_start=False)

ioloop = tornado.ioloop.IOLoop.instance()

# Run the ioloop in a new thread
class External(threading.Thread):
    def run(self):
        ioloop.start()

class QueueProc(threading.Thread):
    keyToConn = dict()
    connToKey = dict()
    connToPaths= dict()
    pathsToConns = dict() 
    queue = Queue.Queue()

    def run(self):
        while True:
            msg = self.queue.get(True)
            if isinstance(msg,event.Open):
                self.connToPaths[msg.conn] = set()
                if not msg.key in self.keyToConn:
                    self.keyToConn[msg.key] = []
                
                self.keyToConn[msg.key].append(msg.conn)
                self.connToKey[msg.conn] = msg.key
            elif isinstance(msg,event.Register):
                # add connection and path
                self.connToPaths[msg.conn].add(msg.path)
                if not msg.path in self.pathsToConns:
                    self.pathsToConns[msg.path] = set()
                self.pathsToConns[msg.path].add(msg.conn)
                
                if (msg.path.startswith('/discussion/')):
                    pass
            elif isinstance(msg,event.Close):
                # remove connection from all pathsToConns
                for path in self.connToPaths[msg.conn]:
                    if (msg.path.startswith('/discussion')):
                        pass
                    self.pathsToConns[path].remove(msg.conn)

                # cleanup path?
                if not self.pathsToConns[path]:
                    del self.pathsToConns[path]
                 
                # cleanup connection
                del self.connToPaths[msg.conn]
                self.keyToConn[self.connToKey[msg.conn]].remove(msg.conn)
                del self.connToKey[msg.conn]
            elif isinstance(msg,event.Message):
                # distribute to path
                if (msg.path in self.pathsToConns):
                    for conn in self.pathsToConns[msg.path]: 
                        if msg.etype == 'response':
                            p = msg.payload
                            conn.emit(msg.etype,{'user':p.username,'date':p.date,'content':p.content,'avatar':p.avatar})
                    
            if msg == event.QueueKill:
                break
    @staticmethod
    def put(msg):
        QueueProc.queue.put(msg)

    @staticmethod
    def stop():
        QueueProc.put(event.QueueKill)

class TRtgHandler:
    def newResponse(self,response):
        QueueProc.put(event.Message('/discussion/%d' % (response.d_id), 'response',response))

handler = TRtgHandler()
processor = RtgService.Processor(handler)
transport = TSocket.TServerSocket(port=9090)
tfactory = TTransport.TBufferedTransportFactory()
pfactory = TBinaryProtocol.TBinaryProtocolFactory()

server = TServer.TSimpleServer(processor, transport, tfactory, pfactory)

ext = External()
ext.start()

qu = QueueProc()
qu.start()
try:
    server.serve()
except:
    print 'Shutdown initiate.'
    print 'Stopping ioloop...'
    ioloop.stop()
    print 'Stopping queue...'
    qu.stop()
    print 'Finish'
