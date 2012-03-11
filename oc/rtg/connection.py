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
        if 'key' in message:
            rtg.StaticQueue.instance.put(event.Auth(self,message['key']))
        if 'chat' in message:
            rtg.StaticQueue.instance.put(event.Chat(self,message['chat']))

    def on_close(self):
        rtg.StaticQueue.instance.put(event.Close(self))

