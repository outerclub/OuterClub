import rtg
import event
import json
from sockjs.tornado import SockJSConnection
class EventConnection(SockJSConnection):
    def on_open(self, info):
        rtg.StaticQueue.instance.put(event.Open(self))

    def on_message(self,message):
        message = json.loads(message)
        if 'register' in message:
            rtg.StaticQueue.instance.put(event.Register(message['register'],self))
        if 'user_id' in message:
            rtg.StaticQueue.instance.put(event.Auth(self,int(message['user_id']),message['key']))

    def on_close(self):
        rtg.StaticQueue.instance.put(event.Close(self))

