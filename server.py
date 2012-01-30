from flask import render_template
import MySQLdb
from flask import Flask,request
import flask
import database as db
import util
from config import DefaultConfig
from datetime import datetime
import hashlib
import random
import uuid
import re

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

conn = MySQLdb.connect(DefaultConfig.mysql_server,DefaultConfig.mysql_user,DefaultConfig.mysql_password,DefaultConfig.mysql_database)

globalAuths = {}
def isLoggedIn():
    return 'uid' in request.cookies and 'key' in request.cookies and int(request.cookies['uid']) in globalAuths and globalAuths[int(request.cookies['uid'])] == request.cookies['key']

def displaySignup():
    return flask.redirect(flask.url_for('signup'))

def getUid():
    return int(request.cookies['uid'])

@app.route('/')
def index():
    if not isLoggedIn():
        return displaySignup()
    cur = conn.cursor()
    res = cur.execute('select name,image,cat_id from category order by cat_id asc') 
    categories = []
    for c in cur.fetchall():
        cat = c[0]
        sanitized = cat.lower().replace(' ','+')
        categories.append({'name':util.formatCategoryName(cat),'url':sanitized,'image':c[1],'id':c[2]})
    
    g = {}
    user = db.fetchUser(cur,getUid())
    g.update({'username':user['name'],'avatar':user['avatar_image']})
    g.update({'categories':categories,'tab':'categories'})

    d = db.fetchTrendingConversations(cur)
    g.update({'trending':d})

    u = db.fetchLeaderboard(cur)
    g.update({'leaderboard':u})

    g.update({'announcements':db.fetchAnnouncements(cur)})
    g.update({'tasks':db.fetchTasks(cur,user['user_id'])})
    cur.close()

    return render_template('index.html',**g)

@app.route('/about')
def about():
    if not isLoggedIn():
        return displaySignup()

    return render_template('about.html')

@app.route('/category/<category>')
def category(category):
    if not isLoggedIn():
        return displaySignup()

    # fetch the category id from the name
    category = category.replace('+',' ')
    cur = conn.cursor()
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
                      'date': util.dateFormat(conversation[3]), \
                      'tags': tags})
    popular_tags = db.fetchPopularTags(cur,cat_id)
    cur2.close()
    cur.close()
    
    category = ' '.join(c.capitalize() for c in category.split())

    return flask.jsonify(popular=popular_tags,posts=posts)

@app.route('/conversation/<id>')
def conversation(id):
    if not isLoggedIn():
        return displaySignup()

    # fetch the main conversation metadata
    cur = conn.cursor()
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
                   'date': util.dateFormat(conversation[2]), \
                   'content': conversation[3], \
                    'avatar_image': conversation[5], \
                   'tags': tags, \
                  }
    responses = db.fetchResponses(cur,id)
    cur.close()

    c_url = '/category/'+categoryName.lower().replace(' ','+')

    categoryName = util.formatCategoryName(categoryName)
    return flask.jsonify(conversation=conversation,popular=popular_tags,responses=responses,category_name=categoryName,category_id=cat_id,category_url=c_url)

@app.route('/post',methods=['POST'])
def post():
    if not isLoggedIn():
        return displaySignup()

    # fetch the category information
    cur = conn.cursor()
    cur.execute('select cat_id,image from category where name=%s', (request.form['area'],))
    res = cur.fetchone()
    cat_id = res[0]
    cat_image = res[1]

    user = db.fetchUser(cur,getUid())
    # insert the post
    cur.execute('insert into conversation (cat_id,user_id,title,postDate,content) values (%s,%s,%s,NOW(),%s)',(cat_id,user['user_id'],request.form['title'],request.form['content']))
    conn.commit()

    d_id = cur.lastrowid
    # fetch the inserted postdate
    cur.execute('select postDate from conversation where d_id=%s', (d_id,))
    date = cur.fetchone()[0]
    cur.close()

    # push the new post
    push = TPost()
    push.d_id = d_id
    push.user_id = user['user_id']
    push.username = user['name']
    push.avatar = user['avatar_image']
    push.date = util.dateFormat(date)
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

    cur = conn.cursor()
    user = db.fetchUser(cur,getUid())
    cur.execute('insert into response (d_id,user_id,replyDate,content) values (%s,%s,NOW(),%s)',(d_id,user['user_id'],data))
    conn.commit()
    
    cur.execute('select replyDate from response where r_id=%s', (cur.lastrowid,))
    myRow = cur.fetchone()

    push = TResponse()
    push.d_id = d_id
    push.user_id = user['user_id']
    push.username = user['name']
    push.avatar = user['avatar_image']
    push.date = util.dateFormat(myRow[0])
    push.content = data

    cur.execute('select cat_id,category.image,title from conversation inner join category using (cat_id) where d_id=%s',(d_id,))
    myRow = cur.fetchone()
    cur.close()

    push.category_id = myRow[0]
    push.category_image = myRow[1]
    push.title = myRow[2]
    transport.open()
    client.newResponse(push)
    transport.close()

    return ''

def initAuth(id,redir):
    auth = TAuth()
    auth.user_id = id
    auth.key = str(uuid.uuid4())
    transport.open()
    client.auth(auth)
    transport.close()

    globalAuths[id] = auth.key
    if (redir):
        redir = flask.redirect(flask.url_for('index'))
        response = app.make_response(redir)
        response.set_cookie('uid',value=id)
        response.set_cookie('key',value=auth.key)
        return response
    else:
        return auth.key

@app.route('/login',methods=['POST'])
def login():
    if isLoggedIn():
        return flask.redirect(flask.url_for('index'))

    # check to see if user exists
    cur = conn.cursor()
    cur.execute('select user_id,avatar_image,password from user where name=%s and password=%s', (request.form['l_username'],hashlib.sha224(request.form['l_password']).hexdigest()))
    test = cur.fetchone()
    cur.close()

    if test != None:
        return initAuth(test[0],True)
    # user doesn't exist!
    else:
        flask.flash('User or password was not valid.');
        return displaySignup()
    
@app.route('/signup',methods=['GET','POST'])
def signup():
    # don't let the user sign up if he's logged in
    if isLoggedIn():
        return flask.redirect(flask.url_for('index'))

    # display the page?
    if request.method == 'GET':
        return render_template('signup.html')

    error = None
    if len(request.form['username']) <= 2:
        error = "Username must be greater than 2 characters long."
    if not util.emailValid(request.form['email']):
        error = "E-mail was not valid."
    if len(request.form['password']) == 0:
        error = "Password cannot be empty."
    
    # process the signup
    # check to see if user exists
    cur = conn.cursor()
    cur.execute('select user_id,avatar_image from user where name=%s', (request.form['username'],))
    test = cur.fetchone()

    # if the user exists
    if (test != None):
        error = "Username already in use."
    else:
        avatar = 'user_%s.png' % random.randrange(1,6)
        # process the form submission
        res = cur.execute('insert into user (name,email,password,avatar_image,prestige) values (%s,%s,%s,%s,0)', (request.form['username'],request.form['email'],hashlib.sha224(request.form['password']).hexdigest(),avatar))
        conn.commit()
    
    if (error):
        cur.close()
        return flask.jsonify(error=error)
    else:
        key = initAuth(cur.lastrowid,False)
        cur.close()
        return flask.jsonify(success=True,uid=cur.lastrowid,key=key)
    
@app.route('/logout')
def logout():
    redir = flask.redirect(flask.url_for('signup'))
    resp = app.make_response(redir)
    resp.set_cookie('uid',expires=datetime.now())
    resp.set_cookie('key',expires=datetime.now())
    return resp

app.debug = DefaultConfig.debug
app.secret_key = os.urandom(32)
app.run(host=DefaultConfig.bind_address,port=DefaultConfig.port)
