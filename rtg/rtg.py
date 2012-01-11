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
import MySQLdb
import event
from proc import QueueProc
from connection import EventConnection

ROOT = op.normpath(op.dirname(__file__))


# Create tornadio server
EventRouter = tornadio2.router.TornadioRouter(EventConnection)

# Create socket application
sock_app = tornado.web.Application(
    EventRouter.urls,
    socket_io_port = 8002,
    #flash_policy_port = 843,
    #flash_policy_file = op.join(ROOT, 'flashpolicy.xml')
)
tornadio2.server.SocketServer(sock_app, auto_start=False)

ioloop = tornado.ioloop.IOLoop.instance()

# Run the ioloop in a new thread
class External(threading.Thread):
    def run(self):
        ioloop.start()


class TRtgHandler:
    def newResponse(self,response):
        QueueProc.put(event.Message('/discussion/%d' % (response.d_id), 'response',response))
        happening_data = {'user':response.username,'user_id':response.user_id,'date':response.date,'content':response.content,'avatar':response.avatar,'category_image':response.category_image,'category_id':response.category_id,'d_id':response.d_id}
        QueueProc.put(event.Message('/happening','happening',{'type':'response','data':happening_data}))
    def newPost(self,post):
        QueueProc.put(event.Message('/category/%d' % (post.category_id),'discussion',post))

        post_data = {'user':post.username,'user_id':post.user_id,'date':post.date,'content':post.content,'avatar':post.avatar,'category_image':post.category_image,'d_id':post.d_id}
        QueueProc.put(event.Message('/happening','happening',{'type':'post','data':post_data}))
        

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
