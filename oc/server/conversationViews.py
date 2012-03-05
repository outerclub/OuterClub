from server import app
import viewFunctions
import database as db
import util
import flask
from flask import request

@app.route('/conversation/<id>')
def conversation(id):
    if not viewFunctions.isLoggedIn():
        return ''

    # fetch the main conversation metadata
    conn = app.config['pool'].connection()
    cur = conn.cursor()
    res = cur.execute('select title,postDate,content,cat_id,user_id from conversation where d_id=%s',(id,))
    conversation = cur.fetchone()
    cat_id = conversation[3]

    # populate the data object 
    conversation = {'id': id, 'title':conversation[0], \
                  'user':db.fetchUser(cur,conversation[4]), \
                   'date': (conversation[1]).isoformat(), \
                   'content': util.replaceMentions(cur,util.escape(conversation[2])), \
                  }
    myUid = viewFunctions.getUid()
    responses = db.fetchResponses(cur,id,myUid)

    # gather uids
    user_ids = set()
    user_ids.add(conversation['user']['user_id'])
    # gather user_ids from responses
    if (len(responses) > 0):
        for r in responses:
            user_ids.add(r['user']['user_id'])

    whereClause = map(lambda x:'object_id=%s',user_ids)
    sql = 'select object_id from upvote where context_id=%s and user_id=%s and type=%s and (' + ' or '.join(whereClause)+')'
    cur.execute(sql,(id,myUid,util.Upvote.UserType)+tuple(user_ids))
    
    for r in cur.fetchall():
        user_ids.remove(r[0])

    # can't vote for self
    user_ids.discard(myUid)

    cur.close()
    conn.close()

    return flask.jsonify(votableUsers=list(user_ids),conversation=conversation,responses=responses,cat_id=cat_id)


@app.route('/reply',methods=['POST'])
def reply():
    if not viewFunctions.isLoggedIn():
        return ''
    d_id = int(request.form['d_id'])
    data = request.form['data'].encode('utf-8')

    conn = app.config['pool'].connection()
    cur = conn.cursor()

    error = None
    if len(data) == 0:
        error = 'Please enter some text before responding.'

    uid = viewFunctions.getUid()

    # ensure that any mentions are valid
    mentions = util.findMentions(cur,data)
    for name in mentions:
        if mentions[name] == None:
            error = "@%s didn't match to a user." % name
        elif mentions[name]['user_id'] == uid:
            error = "You can only mention other people."
        

    if (error):
        return flask.jsonify(error=error)

    user = db.fetchUser(cur,uid)
    
    cur.execute('select title,user_id from conversation where d_id=%s',(d_id,))  
    res = cur.fetchone()
    convo_title = res[0]
    convo_creator = res[1]
    # insert mention news
    if (len(mentions) > 0):
        # process newsfeed
        for name in mentions:
            db.insertNews(cur,mentions[name]['user_id'],{'content':'<a href="#!/user/%s"><img height="30" src="/static/images/avatars/%s" /> %s</a> mentioned you in <a href="#!/conversation/%s">%s</a>.' % (user['user_id'],user['avatar_image'],user['name'],d_id,convo_title)})

    # add news to other participants
    cur.execute('select user_id from response where d_id=%s',(d_id,))
    participants = set()
    for u in cur.fetchall():
        participants.add(u[0]) 
    participants.add(convo_creator)
    for u in participants:
        if u != uid:
            db.insertNews(cur,u,{'content':'<a href="#!/user/%s"><img height="30" src="/static/images/avatars/%s" /> %s</a> replied in <a href="#!/conversation/%s"> %s</a>.' % (uid,user['avatar_image'],user['name'],d_id,convo_title)})
     
    # insert the response
    cur.execute('insert into response (d_id,user_id,replyDate,content) values (%s,%s,NOW(),%s)',(d_id,uid,data))
    conn.commit()
    r_id = cur.lastrowid
    
    cur.close()
    conn.close()

    app.config['transport'].open()
    app.config['client'].response(r_id)
    app.config['transport'].close()

    return '{}'

@app.route('/upvote',methods=['POST'])
def upvote():
    if not viewFunctions.isLoggedIn():
        return ''

    d_id = int(request.form['d_id'])
    object_id = int(request.form['user_id'])

    conn = app.config['pool'].connection()
    cur = conn.cursor()
    uid = viewFunctions.getUid() 
    cur.execute('select COUNT(*) from upvote where user_id=%s and context_id=%s and object_id=%s and type=%s',(uid,d_id,object_id,util.Upvote.UserType))
    
    # does this current upvote exist?
    if (cur.fetchone()[0] == 0):
        cur.execute('insert into upvote (user_id, context_id,object_id, type) values (%s,%s,%s,%s)',(uid,d_id,object_id,util.Upvote.UserType))
        cur.execute('update user set prestige=prestige+1 where user_id=%s',(object_id,))
        
        self = db.fetchUser(cur,uid)
        db.insertNews(cur,object_id,{'content':'<a href="#!/user/%s"><img height="30" src="/static/images/avatars/%s" /> %s</a> gave you a coffee!' % (uid,self['avatar_image'],self['name'])})
        conn.commit()

        app.config['transport'].open()
        app.config['client'].userModified(object_id);
        app.config['transport'].close()
    cur.close()
    conn.close()
    return ''

