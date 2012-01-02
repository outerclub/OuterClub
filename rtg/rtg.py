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
        self.send("Welcome from the server.")
        QueueProc.put(('open',self))

    def on_message(self, message):
        # Pong message back
        QueueProc.put(('msg',message))

    def on_close(self):
        QueueProc.put(('close',self))

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
    participants = set()
    queue = Queue.Queue()

    def run(self):
        while True:
            msg = self.queue.get(True)
            if isinstance(msg,tuple):
                if msg[0] == 'open':
                    self.participants.add(msg[1])
                elif msg[0] == 'close':
                    self.participants.remove(msg[1])
                elif msg[0] == 'msg':
                    for p in self.participants:
                        p.send(msg[1])
                    
            if msg == 'quit':
                break
    @staticmethod
    def put(msg):
        QueueProc.queue.put(msg)

    @staticmethod
    def stop():
        QueueProc.put('quit')

class TRtgHandler:
    def newResponse(self,response):
        QueueProc.put(('trtg',))

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
    print 'Shutdown initiate'
    print 'Stopping ioloop'
    ioloop.stop()
    print 'Stopping queue'
    qu.stop()
