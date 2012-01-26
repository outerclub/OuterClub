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
import MySQLdb
import event
from proc import QueueProc
from connection import EventConnection
from sockjs.tornado import SockJSRouter,SockJSConnection

ROOT = op.normpath(op.dirname(__file__))

EventRouter = SockJSRouter(EventConnection,'/sock')

app = tornado.web.Application(EventRouter.urls)
app.listen(8002)
ioloop = tornado.ioloop.IOLoop.instance()

# Run the ioloop in a new thread
class External(threading.Thread):
    def run(self):
        ioloop.start()


class TRtgHandler:
    def newResponse(self,response):
        QueueProc.put(event.Message('/conversation/%d' % (response.d_id), 'response',response))
        happening_data = {'user':response.username,'user_id':response.user_id,'date':response.date,'avatar_image':response.avatar,'category_image':response.category_image,'category_id':response.category_id,'d_id':response.d_id,'title': response.title}
        QueueProc.put(event.Message('/happening','happening',{'type':'response','data':happening_data}))
    def newPost(self,post):
        QueueProc.put(event.Message('/category/%d' % (post.category_id),'conversation',post))

        happening_data = {'user':post.username,'user_id':post.user_id,'date':post.date,'avatar_image':post.avatar,'category_image':post.category_image,'d_id':post.d_id,'title':post.title}
        QueueProc.put(event.Message('/happening','happening',{'type':'post','data':happening_data}))
        

handler = TRtgHandler()
processor = RtgService.Processor(handler)
transport = TSocket.TServerSocket(port=9090)
tfactory = TTransport.TBufferedTransportFactory()
pfactory = TBinaryProtocol.TBinaryProtocolFactory()

server = TServer.TThreadPoolServer(processor, transport, tfactory, pfactory,daemon=True)

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