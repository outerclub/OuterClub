from proc import QueueProc
import tornadio2
import event
class EventConnection(tornadio2.conn.SocketConnection):
    def on_open(self, info):
        QueueProc.put(event.Open(self,info.arguments['key'][0]))

    def on_message(self,message):
        pass

    @tornadio2.event
    def register(self, path):
        QueueProc.put(event.Register(path,self))

    def on_close(self):
        QueueProc.put(event.Close(self))

