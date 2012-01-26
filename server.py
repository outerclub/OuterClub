from flask import render_template
import MySQLdb
from flask import Flask,request,session
import flask
import database as db,config
from config import DefaultConfig
from datetime import datetime
import hashlib
import random

from rtg.t_rtg import RtgService
from rtg.t_rtg.ttypes import *

from thrift import Thrift
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
import os

# setup rtg
transport = TSocket.TSocket(DefaultConfig.rtg_server,DefaultConfig.rtg_server_port)
transport = TTransport.TBufferedTransport(transport)
protocol = TBinaryProtocol.TBinaryProtocol(transport)

client = RtgService.Client(protocol)

# setup app
app = Flask(__name__)

conn = None
conn = MySQLdb.connect(DefaultConfig.mysql_server,DefaultConfig.mysql_user,DefaultConfig.mysql_password,DefaultConfig.mysql_database)
cur = conn.cursor()

def isLoggedIn():
    return  'username' in session

def initSession(id,name,avatar):
    session['user_id'] = id
    session['username'] = name
    session['avatar'] = avatar

def displaySignup():
    return flask.redirect(flask.url_for('signup'))

def globals():
    return {'username':session['username'],'user_id':session['user_id'],'avatar':session['avatar']}

@app.route('/')
def index():
    if not isLoggedIn():
        return displaySignup()
    res = cur.execute('select name,image,cat_id from category order by cat_id asc') 
    categories = []
    for c in cur.fetchall():
        cat = c[0]
        sanitized = cat.lower().replace(' ','+')
        categories.append({'name':cat,'url':sanitized,'image':c[1],'id':c[2]})
    
    g = globals()
    g.update({'categories':categories,'tab':'categories'})

    d = db.fetchTrendingConversations(cur)
    g.update({'trending':d})

    u = db.fetchLeaderboard(cur)
    g.update({'leaderboard':u})

    return render_template('index.html',**g)

@app.route('/about')
def about():
    if not isLoggedIn():
        return displaySignup()
    g = globals()

    return render_template('about.html',**g)

@app.route('/category/<category>')
def category(category):
    if not isLoggedIn():
        return displaySignup()

    # fetch the category id from the name
    category = category.replace('+',' ')
    cur.execute('select cat_id from category where name=%s', (category,))
    cat_id = cur.fetchone()[0]

    # fetch the conversations for this category
    res = cur.execute('select d_id,user.name,title,postDate,content from conversation inner join user using (user_id) where cat_id=%s order by postDate desc',(cat_id,))
    posts = []
    cur2 = conn.cursor()
    for conversation in cur.fetchall():
        tags = db.fetchConversationTags(cur2,conversation[0])
        posts.append({'id':conversation[0], 'title':conversation[2],  \
                      'user':conversation[1], \
                      'date': config.dateFormat(conversation[3]), \
                      'tags': tags})
    popular_tags = db.fetchPopularTags(cur,cat_id)
    
    category = ' '.join(c.capitalize() for c in category.split())

    return flask.jsonify(popular=popular_tags,posts=posts)

@app.route('/conversation/<id>')
def conversation(id):
    if not isLoggedIn():
        return displaySignup()

    # fetch the main conversation metadata
    res = cur.execute('select user.name,title,postDate,content,cat_id,avatar_image,user.prestige from (conversation inner join user using (user_id)) where d_id=%s',(id,))
    conversation = cur.fetchone()
    cat_id = conversation[4]
    cur.execute('select name from category where cat_id=%s',(cat_id,))
    categoryName = cur.fetchone()[0]
    tags = db.fetchConversationTags(cur,id)
    popular_tags = db.fetchPopularTags(cur,conversation[4])

    # populate the data object 
    conversation = {'id': id, 'title':conversation[1], \
                  'user':conversation[0], \
                   'prestige':conversation[6], \
                   'date': config.dateFormat(conversation[2]), \
                   'content': conversation[3], \
                    'avatar_image': conversation[5], \
                   'tags': tags, \
                  }
    responses = db.fetchResponses(cur,id)

    c_url = '/category/'+categoryName.lower().replace(' ','+')
    return flask.jsonify(conversation=conversation,popular=popular_tags,responses=responses,category_name=categoryName,category_id=cat_id,category_url=c_url)

@app.route('/post',methods=['POST'])
def post():
    # fetch the category information
    cur.execute('select cat_id,image from category where name=%s', (request.form['area'],))
    res = cur.fetchone()
    cat_id = res[0]
    cat_image = res[1]

    # insert the post
    cur.execute('insert into conversation (cat_id,user_id,title,postDate,content) values (%s,%s,%s,NOW(),%s)',(cat_id,session['user_id'],request.form['title'],request.form['content']))
    conn.commit()

    d_id = cur.lastrowid
    # fetch the inserted postdate
    cur.execute('select postDate from conversation where d_id=%s', (d_id,))
    date = cur.fetchone()[0]

    # push the new post
    push = TPost()
    push.d_id = d_id
    push.user_id = session['user_id']
    push.username = session['username']
    push.avatar = session['avatar']
    push.date = config.dateFormat(date)
    push.content = request.form['content']
    push.category_id = cat_id
    push.category_image = cat_image
    push.title = request.form['title']
    transport.open()
    client.newPost(push)
    transport.close()
    
    return ''

@app.route('/reply',methods=['POST'])
def reply():
    if not isLoggedIn():
        return displaySignup()
    d_id = int(request.form['d_id'])
    data = request.form['data']

    cur.execute('insert into response (d_id,user_id,replyDate,content) values (%s,%s,NOW(),%s)',(d_id,session['user_id'],data))
    conn.commit()
    
    cur.execute('select replyDate from response where r_id=%s', (cur.lastrowid,))
    myRow = cur.fetchone()

    push = TResponse()
    push.d_id = d_id
    push.user_id = session['user_id']
    push.username = session['username']
    push.avatar = session['avatar']
    push.date = config.dateFormat(myRow[0])
    push.content = data

    cur.execute('select cat_id,category.image,title from conversation inner join category using (cat_id) where d_id=%s',(d_id,))
    myRow = cur.fetchone()

    push.category_id = myRow[0]
    push.category_image = myRow[1]
    push.title = myRow[2]
    transport.open()
    client.newResponse(push)
    transport.close()

    return ''

@app.route('/login',methods=['POST'])
def login():
    if isLoggedIn():
        return flask.redirect(flask.url_for('index'))

    # check to see if user exists
    cur.execute('select user_id,avatar_image,password from user where name=%s', (request.form['l_username'],))
    test = cur.fetchone()

    if test != None:
        initSession(test[0],request.form['l_username'],test[1])
        return flask.redirect(flask.url_for('index'))
    # user doesn't exist!
    else:
        return displaySignup()
    
@app.route('/signup',methods=['GET','POST'])
def signup():
    # don't let the user sign up if he's logged in
    if isLoggedIn():
        return flask.redirect(flask.url_for('index'))

    # display the page?
    if request.method == 'GET':
        return render_template('signup.html')

    # check to see if user exists
    cur.execute('select user_id,avatar_image from user where name=%s', (request.form['username'],))
    test = cur.fetchone()

    # if the user exists
    if (test != None):
        return render_template('signup.html')
    else:
        avatar = 'user_%s.png' % random.randrange(1,6)
        # process the form submission
        res = cur.execute('insert into user (name,email,password,avatar_image) values (%s,%s,%s,%s)', (request.form['username'],request.form['email'],hashlib.sha224(request.form['password']).hexdigest(),avatar))
        conn.commit()
        initSession(cur.lastrowid,request.form['username'],avatar)
    
    return flask.redirect(flask.url_for('index'))
    
@app.route('/logout')
def logout():
    session.pop('username',None)
    session.pop('user_id',None)
    return flask.redirect(flask.url_for('signup'))

app.debug = DefaultConfig.debug
app.secret_key = os.urandom(32)
app.run(host=DefaultConfig.bind_address,port=DefaultConfig.port)
