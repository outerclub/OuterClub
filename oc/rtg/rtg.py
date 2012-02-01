from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
from thrift.server import TServer
import threading

import sys
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
from ..server import database
from config import DefaultConfig

ROOT = op.normpath(op.dirname(__file__))
# Run the ioloop in a new thread
class External(threading.Thread):
    def run(self):
        External.ioloop.start()


class TRtgHandler:
    def __init__(self):
        self.db = MySQLdb.connect(DefaultConfig.mysql_server,DefaultConfig.mysql_user,DefaultConfig.mysql_password,DefaultConfig.mysql_database)

    def newResponse(self,response):
        cur = self.db.cursor()
        user = database.fetchUser(cur,response.user_id)
        cur.close()
        payload = {'date':response.date,'content':response.content,'user':user,'r_id':response.r_id}
        QueueProc.put(event.Message('/conversation/%d' % (response.d_id), 'response',payload))

        happening_data = {'user':user,'date':response.date,'category_image':response.category_image,'category_id':response.category_id,'d_id':response.d_id,'title': response.title,'r_id':response.r_id}
        QueueProc.put(event.Message('/happening','happening',{'type':'response','data':happening_data}))

    def newPost(self,post):
        cur = self.db.cursor()
        user = database.fetchUser(cur,post.user_id)
        cur.close()
        payload = {'d_id':post.d_id,'date':post.date,'title':post.title,'user':user}
        QueueProc.put(event.Message('/category/%d' % (post.category_id),'conversation',payload))

        happening_data = {'user':user,'date':post.date,'category_image':post.category_image,'d_id':post.d_id,'title':post.title}
        QueueProc.put(event.Message('/happening','happening',{'type':'post','data':happening_data}))

    def auth(self,auth):
        QueueProc.put(event.NewAuthKey(auth.user_id,auth.key))
    def userModified(self,user_id):
        cur = self.db.cursor()
        user = database.fetchUser(cur,user_id)
        cur.close()
        QueueProc.put(event.Message('/user/%d' % user_id,'user',user))


def start():
	EventRouter = SockJSRouter(EventConnection,'/sock')

	app = tornado.web.Application(EventRouter.urls)
	app.listen(8002)
	External.ioloop = tornado.ioloop.IOLoop.instance()

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
	    External.ioloop.stop()
	    print 'Stopping queue...'
	    qu.stop()
	    print 'Finish'
