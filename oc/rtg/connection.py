from proc import QueueProc
import event
import json
from sockjs.tornado import SockJSConnection
class EventConnection(SockJSConnection):
    def on_open(self, info):
        QueueProc.put(event.Open(self))

    def on_message(self,message):
        message = json.loads(message)
        if 'register' in message:
            QueueProc.put(event.Register(message['register'],self))
        if 'user_id' in message:
            QueueProc.put(event.Auth(self,int(message['user_id']),message['key']))

    def on_close(self):
        QueueProc.put(event.Close(self))

