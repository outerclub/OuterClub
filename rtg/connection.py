from proc import QueueProc
import event
import json
from sockjs.tornado import SockJSConnection
class EventConnection(SockJSConnection):
    def on_open(self, info):
        # temporary session hack (need to replace with unique user secret key probably)
        QueueProc.put(event.Open(self,info.cookies['session'].value[:9]))

    def on_message(self,message):
        message = json.loads(message)
        if 'register' in message:
            QueueProc.put(event.Register(message['register'],self))

    def on_close(self):
        QueueProc.put(event.Close(self))

