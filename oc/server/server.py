import MySQLdb
from DBUtils.PooledDB import PooledDB
import database as db

import flask
from flask import render_template
from flask import Flask,request

import util
from config import DefaultConfig
from datetime import datetime
import hashlib
import random
import uuid
import re

from ..rtg.t_rtg import RtgService
from ..rtg.t_rtg.ttypes import *

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

pool = PooledDB(creator=MySQLdb,mincached=10,host=DefaultConfig.mysql_server,user=DefaultConfig.mysql_user,passwd=DefaultConfig.mysql_password,db=DefaultConfig.mysql_database)

globalAuths = {}
def isLoggedIn():
    return 'user_id' in request.cookies and 'key' in request.cookies and int(request.cookies['user_id']) in globalAuths and globalAuths[int(request.cookies['user_id'])] == request.cookies['key']

def displaySignup():
    return flask.redirect(flask.url_for('signup'))

def getUid():
    return int(request.cookies['user_id'])

@app.route('/')
def index():
    if not isLoggedIn():
        return displaySignup()
    conn = pool.connection()
    cur = conn.cursor()
    res = cur.execute('select name,image,cat_id from category order by cat_id asc') 
    categories = []
    for c in cur.fetchall():
        cat = c[0]
        sanitized = cat.lower().replace(' ','+')
        categories.append({'name':util.formatCategoryName(cat),'url':sanitized,'image':c[1],'id':c[2]})
    
    g = {}
    uid = getUid()
    user = db.fetchUser(cur,uid)
    g.update({'user_id':uid,'username':user['name'],'avatar':user['avatar_image'],'prestige':user['prestige']})
    g.update({'categories':categories,'tab':'categories'})

    g.update({'announcements':db.fetchAnnouncements(cur)})
    g.update({'tasks':db.fetchTasks(cur,user['user_id'])})
    cur.close()
    conn.close()

    return render_template('index.html',**g)

@app.route('/about')
def about():
    if not isLoggedIn():
        return displaySignup()

    return render_template('about.html')

@app.route('/category/<category>')
def category(category):
    if not isLoggedIn():
        return ''

    # fetch the category id from the name
    category = category.replace('+',' ')
    conn = pool.connection()
    cur = conn.cursor()
    cur.execute('select cat_id from category where name=%s', (category,))
    cat_id = cur.fetchone()[0]

    # fetch the conversations for this category
    res = cur.execute('select d_id,title,postDate,user_id from conversation where cat_id=%s order by postDate desc',(cat_id,))
    posts = []
    cur2 = conn.cursor()
    for conversation in cur.fetchall():
        tags = db.fetchConversationTags(cur2,conversation[0])
        posts.append({'id':conversation[0], 'title':conversation[1],  \
                      'user':db.fetchUser(cur,conversation[3]), \
                      'date': util.dateFormat(conversation[2]), \
                      'tags': tags})
    popular_tags = db.fetchPopularTags(cur,cat_id)
    cur2.close()
    cur.close()
    conn.close()
    
    category = ' '.join(c.capitalize() for c in category.split())

    return flask.jsonify(popular=popular_tags,posts=posts)

@app.route('/conversation/<id>')
def conversation(id):
    if not isLoggedIn():
        return ''

    # fetch the main conversation metadata
    conn = pool.connection()
    cur = conn.cursor()
    res = cur.execute('select title,postDate,content,cat_id,user_id from conversation where d_id=%s',(id,))
    conversation = cur.fetchone()
    cat_id = conversation[3]
    cur.execute('select name from category where cat_id=%s',(cat_id,))
    categoryName = cur.fetchone()[0]
    tags = db.fetchConversationTags(cur,id)
    popular_tags = db.fetchPopularTags(cur,conversation[3])

    # populate the data object 
    conversation = {'id': id, 'title':conversation[0], \
                  'user':db.fetchUser(cur,conversation[4]), \
                   'date': util.dateFormat(conversation[1]), \
                   'content': util.replaceMentions(cur,conversation[2]), \
                   'tags': tags \
                  }
    responses = db.fetchResponses(cur,id,getUid())
    cur.close()
    conn.close()

    c_url = '/category/'+categoryName.lower().replace(' ','+')

    categoryName = util.formatCategoryName(categoryName)
    return flask.jsonify(conversation=conversation,popular=popular_tags,responses=responses,category_name=categoryName,category_id=cat_id,category_url=c_url)

@app.route('/trending')
def trending():
    if not isLoggedIn():
        return ''
    conn = pool.connection()
    cur = conn.cursor()

    d = db.fetchTrendingConversations(cur)
    cur.close()
    conn.close()
    return flask.jsonify(conversations=d)

@app.route('/leaderboard')
def leaderboard():
    if not isLoggedIn():
        return ''
    conn = pool.connection()
    cur = conn.cursor()

    d = db.fetchLeaderboard(cur)
    cur.close()
    conn.close()
    return flask.jsonify(users=d)

@app.route('/avatars',methods=['GET','POST'])
def avatars():
    if not isLoggedIn():
        return ''
    # display the page?
    if request.method == 'GET':
        avatars = []
        for f in os.listdir(app.root_path+'/static/images/avatars'):
            avatars.append(f)
        return flask.jsonify(avatars=avatars)
    else:
        conn = pool.connection()
        cur = conn.cursor()
        cur.execute('update user set avatar_image=%s where user_id=%s',(request.form['avatar'],getUid()))
        conn.commit()
        cur.close()
        conn.close()

        transport.open()
        client.userModified(getUid())
        transport.close()
        
        return ''
    
@app.route('/user/<id>')
def user(id):
    if not isLoggedIn():
        return ''
    conn = pool.connection()
    cur = conn.cursor()
    user = db.fetchUser(cur,id)
    cur.close()
    conn.close()
    return flask.jsonify(user=user)

@app.route('/post',methods=['POST'])
def post():
    if not isLoggedIn():
        return ''

    # fetch the category information
    conn = pool.connection()
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
    cur.close()
    conn.close()

    transport.open()
    client.conversation(d_id)
    transport.close()
    
    return ''

@app.route('/reply',methods=['POST'])
def reply():
    if not isLoggedIn():
        return ''
    d_id = int(request.form['d_id'])
    data = request.form['data']

    conn = pool.connection()
    cur = conn.cursor()

    # ensure that any mentions are valid
    mentions = util.findMentions(cur,data)
    for name in mentions:
        if mentions[name] == None:
            return flask.jsonify(error="@%s didn't match to a user." % name) 
    
    # insert the response
    cur.execute('insert into response (d_id,user_id,replyDate,content) values (%s,%s,NOW(),%s)',(d_id,getUid(),data))
    conn.commit()
    r_id = cur.lastrowid
    
    cur.close()
    conn.close()

    transport.open()
    client.response(r_id)
    transport.close()

    return '{}'

@app.route('/upvote',methods=['POST'])
def upvote():
    if not isLoggedIn():
        return ''

    r_id = int(request.form['r_id'])
    conn = pool.connection()
    cur = conn.cursor()
    uid = getUid() 
    cur.execute('select COUNT(*) from upvote where user_id=%s and object_id=%s and type=%s',(uid,r_id,util.Upvote.ResponseType))
    
    # does this current upvote exist?
    if (cur.fetchone()[0] == 0):
        cur.execute('insert into upvote (user_id, object_id, type) values (%s,%s,%s)',(uid,r_id,util.Upvote.ResponseType))
        cur.execute('select user_id from response where r_id=%s',(r_id,))
        dest_user = cur.fetchone()[0]
        cur.execute('select prestige from user where user_id=%s',(dest_user,))
        cur.execute('update user set prestige=%s where user_id=%s',(cur.fetchone()[0]+1,dest_user))
        conn.commit()

        transport.open()
        client.userModified(dest_user);
        transport.close()
    cur.close()
    conn.close()
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
        response.set_cookie('user_id',value=id)
        response.set_cookie('key',value=auth.key)
        return response
    else:
        return auth.key

@app.route('/login',methods=['POST'])
def login():
    if isLoggedIn():
        return flask.redirect(flask.url_for('index'))

    # check to see if user exists
    conn = pool.connection()
    cur = conn.cursor()
    cur.execute('select user_id,avatar_image,password from user where name=%s and password=%s', (request.form['l_username'],hashlib.sha224(request.form['l_password']).hexdigest()))
    test = cur.fetchone()
    cur.close()
    conn.close()

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
    elif not util.emailValid(request.form['email']):
        error = "E-mail was not valid."
    elif len(request.form['password']) == 0:
        error = "Password cannot be empty."
    else:
        
        # process the signup
        # check to see if user exists
        conn = pool.connection()
        cur = conn.cursor()
        cur.execute('select user_id,avatar_image from user where name=%s', (request.form['username'],))
        test = cur.fetchone()

        # if the user exists
        if (test != None):
            error = "Username already in use."
            cur.close()
            conn.close()
        else:
            avatar = 'user_%s.png' % random.randrange(1,6)
            # process the form submission
            res = cur.execute('insert into user (name,email,password,avatar_image,prestige) values (%s,%s,%s,%s,0)', (request.form['username'],request.form['email'],hashlib.sha224(request.form['password']).hexdigest(),avatar))
            conn.commit()
            key = initAuth(cur.lastrowid,False)
            cur.close()
            conn.close()
            return flask.jsonify(success=True,user_id=cur.lastrowid,key=key)
    
    if (error):
        return flask.jsonify(error=error)
    
@app.route('/logout')
def logout():
    redir = flask.redirect(flask.url_for('signup'))
    resp = app.make_response(redir)
    resp.set_cookie('user_id',expires=datetime.now())
    resp.set_cookie('key',expires=datetime.now())
    return resp

app.debug = DefaultConfig.debug
app.secret_key = os.urandom(32)

def start():
    app.run(host=DefaultConfig.bind_address,port=DefaultConfig.port)
