import MySQLdb
from DBUtils.PooledDB import PooledDB
import database as db

import flask
from flask import render_template
from flask import Flask,request

import util
from datetime import datetime
from werkzeug.contrib.fixers import ProxyFix

import urllib2
 
from ..rtg.t_rtg import RtgService
from ..rtg.t_rtg.ttypes import *

from thrift import Thrift
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
import os

# setup app
app = Flask(__name__)

import userViews
import conversationViews
import authViews
import viewFunctions

@app.route('/')
def index():
    if not viewFunctions.isLoggedIn():
        return viewFunctions.displaySignup()
    conn = app.config['pool'].connection()
    cur = conn.cursor()
    
    g = {}
    uid = viewFunctions.getUid()
    user = db.fetchUser(cur,uid)
    g.update({'user_id':uid,'username':user['name'],'avatar':user['avatar_image'],'prestige':user['prestige']})
    g.update({'categories':[]})

    g.update({'announcements':db.fetchAnnouncements(cur)})
    #g.update({'tasks':db.fetchTasks(cur,user['user_id'])})

    g.update({'question':db.fetchQuestion(cur)})
    cur.close()
    conn.close()

    return render_template('index.html',**g)

@app.route('/twitter')
def twitter():
    if not app.config['DEBUG']:
        if not 'twitter' in app.config or (datetime.now()-app.config['twitter']['time']).seconds >= 60*30:
            data = urllib2.urlopen('http://api.twitter.com/1/statuses/user_timeline.json?screen_name=outerclub&include_rts=true&include_entities=true&count=5').read()
            app.config['twitter'] = {'data':data,'time':datetime.now()}
        return app.config['twitter']['data']
    return '[]'


@app.route('/news')
def news():
    if not viewFunctions.isLoggedIn():
        return viewFunctions.displaySignup()
    conn = app.config['pool'].connection()
    cur = conn.cursor()
    
    uid = viewFunctions.getUid()
    news = db.fetchNews(cur,uid)
    for item in news:
        item['date'] = (item['date']).isoformat()

    cur.close()
    conn.close()
    return flask.jsonify(news=news)

@app.route('/about')
def about():
    if not viewFunctions.isLoggedIn():
        return viewFunctions.displaySignup()

    return render_template('about.html')

@app.route('/categories')
def categories():
    conn = app.config['pool'].connection()
    cur = conn.cursor()
    res = cur.execute('select cat_id,name,image,icon,thumb from category where private=false order by cat_id asc') 
    categories = []
    for c in cur.fetchall():
        categories.append({'id':c[0],'name':util.formatCategoryName(c[1]),'image':c[2],'icon':c[3],'thumb':c[4]})
    cur.close()
    conn.close()
    return flask.jsonify(categories=categories)

@app.route('/category/<category>')
def category(category):
    if not viewFunctions.isLoggedIn():
        return ''

    # fetch the category id/visibility from the name
    category = category.replace('+',' ')
    conn = app.config['pool'].connection()
    cur = conn.cursor()
    cur.execute('select cat_id,private,icon from category where name=%s', (category,))
    row = cur.fetchone()
    cat_id = row[0]
    isPrivate = bool(row[1])
    icon = row[2]

    self = db.fetchUser(cur,viewFunctions.getUid())
    
    # verify that this user has access to this category
    if not isPrivate or (isPrivate and cat_id in self['guilds']):
        # fetch the conversations for this category
        res = cur.execute('select d_id,title,postDate,user_id,content from conversation where cat_id=%s order by postDate desc',(cat_id,))
        posts = []
        maxResponses = 4
        for conversation in cur.fetchall():
            # collect the last responses
            cur.execute('select user_id,replyDate,content from response where d_id=%s order by replyDate desc limit %s',(conversation[0],maxResponses))
            responses = []
            for response in cur.fetchall():
                responses.insert(0,{'user':db.fetchUser(cur,response[0]),'date':response[1].isoformat(),'content':util.replaceMentions(cur,util.escape(response[2]))})

            # fetch the poster
            user = db.fetchUser(cur,conversation[3])

            # add in the original post, if applicable
            if (len(responses) < maxResponses):
                responses.insert(0,{'user':user,'date':(conversation[2]).isoformat(),'content':util.replaceMentions(cur,util.escape(conversation[4]))})

            # count replies
            cur.execute('select COUNT(*) from response where d_id=%s',(conversation[0],))
            numReplies = cur.fetchone()[0]

            # count participants
            cur.execute('select DISTINCT user_id from response where d_id=%s',(conversation[0],))
            uids = set()
            for u in cur.fetchall():
                uids.add(u[0])
            uids.add(user['user_id'])
                
            numUsers = len(uids)


            posts.append({'id':conversation[0], 'title':conversation[1],  \
                          'user':user, \
                          'date': (conversation[2]).isoformat(),'responses':responses,'numReplies':numReplies,'numUsers':numUsers})
        cur.close()
        conn.close()
        
        category = ' '.join(c.capitalize() for c in category.split())

        return flask.jsonify(posts=posts,id=cat_id,private=isPrivate,icon=icon)
    return ''
@app.route('/trending')
def trending():
    if not viewFunctions.isLoggedIn():
        return ''
    conn = app.config['pool'].connection()
    cur = conn.cursor()

    d = db.fetchTrendingConversations(cur)
    cur.close()
    conn.close()
    return flask.jsonify(conversations=d)

@app.route('/leaderboard')
def leaderboard():
    if not viewFunctions.isLoggedIn():
        return ''
    conn = app.config['pool'].connection()
    cur = conn.cursor()

    d = db.fetchLeaderboard(cur)
    cur.close()
    conn.close()
    return flask.jsonify(users=d)

@app.route('/post',methods=['POST'])
def post():
    if not viewFunctions.isLoggedIn():
        return ''

    error = None
    if len(request.form['title']) == 0:
        error = 'Please enter a title for your conversation.'
    elif len(request.form['content']) == 0:
        error = 'Please enter some content for your conversation.'
    
    if (error):
        return flask.jsonify(error=error)
        

    # fetch the category information
    conn = app.config['pool'].connection()
    cur = conn.cursor()

    user = db.fetchUser(cur,viewFunctions.getUid())
    # insert the post
    cur.execute('insert into conversation (cat_id,user_id,title,postDate,content) values (%s,%s,%s,NOW(),%s)',(request.form['area'],user['user_id'],request.form['title'].encode('utf-8'),request.form['content'].encode('utf-8')))
    conn.commit()

    d_id = cur.lastrowid
    cur.close()
    conn.close()

    app.config['transport'].open()
    app.config['client'].conversation(d_id)
    app.config['transport'].close()
    
    return '{}'


def config(config):
    # setup rtg
    transport = TSocket.TSocket(config.RTG_SERVER,config.RTG_SERVER_PORT)
    transport = TTransport.TBufferedTransport(transport)
    protocol = TBinaryProtocol.TBinaryProtocol(transport)
    app.config.from_object(config)

    app.config['transport'] = transport
    app.config['client'] = RtgService.Client(protocol)

    app.config['pool'] = PooledDB(creator=MySQLdb,mincached=10,host=config.MYSQL_SERVER,user=config.MYSQL_USER,passwd=config.MYSQL_PASSWORD,db=config.MYSQL_DATABASE)

    app.config['globalAuths'] = {}
    app.debug = config.DEBUG
    app.wsgi_app = ProxyFix(app.wsgi_app) 
    app.secret_key = os.urandom(32)

    if not app.debug:
        import logging
        from logging.handlers import SMTPHandler
        mail_handler = SMTPHandler((app.config['EMAIL_SERVER'],app.config['EMAIL_PORT']),app.config['EMAIL_ADDRESS'],[app.config['ERROR_EMAIL']],'OuterClub Exception',credentials=(app.config['EMAIL_USER'],app.config['EMAIL_PASSWORD']),secure=())
        mail_handler.setLevel(logging.ERROR)
        app.logger.addHandler(mail_handler)
        from logging.handlers import RotatingFileHandler
        handler = RotatingFileHandler('logs/app.log')
        handler.setLevel(logging.WARNING)
        app.logger.addHandler(handler)

def run():
    app.run(host=app.config['BIND_ADDRESS'],port=app.config['PORT'])
