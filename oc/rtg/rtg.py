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
import MySQLdb
from DBUtils.PooledDB import PooledDB

import tornado.web
import tornado.httpserver
import event
from proc import QueueProc
from connection import EventConnection
from sockjs.tornado import SockJSRouter,SockJSConnection
from ..server import database
from config import DefaultConfig
from ..server import util

ROOT = op.normpath(op.dirname(__file__))
# Run the ioloop in a new thread
class External(threading.Thread):
    def run(self):
        External.ioloop.start()


class TRtgHandler:
    def __init__(self):
        self.pool = PooledDB(creator=MySQLdb,mincached=10,host=DefaultConfig.mysql_server,user=DefaultConfig.mysql_user,passwd=DefaultConfig.mysql_password,db=DefaultConfig.mysql_database)

    def response(self,r_id):
        conn = self.pool.connection()
        cur = conn.cursor()
        cur.execute('select d_id,response.user_id,replyDate,response.content,cat_id,category.image,conversation.title from response inner join (conversation inner join category using (cat_id)) using(d_id) \
                    where r_id=%s',(r_id))
        res = cur.fetchone()
        user = database.fetchUser(cur,res[1])

        newContent = util.replaceMentions(cur,res[3])
        cur.close()
        conn.close()
        
        payload = {'date':util.dateFormat(res[2]),'content':newContent,'user':user,'r_id':r_id}
        QueueProc.put(event.Message('/conversation/%d' % (res[0]), 'response',payload))

        happening_data = {'user':user,'date':util.hourDateFormat(res[2]),'category_image':res[5],'category_id':res[4],'d_id':res[0],'title': res[6],'r_id':r_id}
        QueueProc.put(event.Message('/happening','happening',{'type':'response','data':happening_data}))

    def conversation(self,d_id):
        conn = self.pool.connection()
        cur = conn.cursor()
        cur.execute('select user_id,postDate,content,category.image,cat_id,title from conversation inner join category using (cat_id) \
                     where d_id=%s',(d_id,))
        convo = cur.fetchone()
        user = database.fetchUser(cur,convo[0])
        cur.close()
        conn.close()

        payload = {'d_id':d_id,'date':util.dateFormat(convo[1]),'title':convo[5],'user':user}
        QueueProc.put(event.Message('/category/%d' % (convo[4]),'conversation',payload))

        happening_data = {'user':user,'date':util.hourDateFormat(convo[1]),'category_image':convo[3],'d_id':d_id,'title':convo[5]}
        QueueProc.put(event.Message('/happening','happening',{'type':'post','data':happening_data}))

    def auth(self,auth):
        QueueProc.put(event.NewAuthKey(auth.user_id,auth.key))

    def userModified(self,user_id):
        conn = self.pool.connection()
        cur = conn.cursor()
        user = database.fetchUser(cur,user_id)
        cur.close()
        conn.close()

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
