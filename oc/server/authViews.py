from server import app
import viewFunctions
import database as db
import flask
from flask import request,render_template
import uuid
import hashlib
from datetime import datetime
from ..rtg.t_rtg.ttypes import TAuth
import json
import util
import re
import urllib2

def initAuth(id):
    auth = TAuth()
    auth.user_id = id
    auth.key = str(uuid.uuid4())
    app.config['transport'].open()
    app.config['client'].auth(auth)
    app.config['transport'].close()

    app.config['globalAuths'][auth.key] = id

    conn = app.config['pool'].connection()
    cur = conn.cursor()
    # update the last activity time
    cur.execute('update user set last_login=NOW() where user_id=%s',(id,))
    conn.commit()
    cur.close()
    conn.close()
    return auth.key

@app.route('/login',methods=['POST'])
def login():
    if viewFunctions.isLoggedIn():
        return ''
    
    if 'userID' in request.form and 'accessToken' in request.form:
        try:
            fetch = json.loads(urllib2.urlopen("https://graph.facebook.com/me?access_token=%s" % (request.form['accessToken'])).read())
        except:
            fetch = dict()
        if (not 'error' in fetch and 'id' in fetch and fetch['id'] == request.form['userID']):
            userID = request.form['userID']
            name = fetch['first_name']+' '+fetch['last_name']
            email = fetch['email']
            
            # check to see if user exists and has linked facebook account
            conn = app.config['pool'].connection()
            cur = conn.cursor()
            cur.execute('select user_id,avatar_image from user where fbId=%s', (userID,))
            test = cur.fetchone()
            
            ret = ''
            if test != None:
                ret = flask.jsonify(key=initAuth(test[0]))
            else:
                cur.execute('select user_id from user where email=%s',(email,))
                res = cur.fetchone()
                
                # try to match fb login against e-mail and link
                if (res != None):
                    cur.execute('update user set fbId=%s,fbName=%s where email=%s',(userID,name,email))
                    conn.commit()
                    ret =  flask.jsonify(key=initAuth(res[0]))
                else:
                    if ('alias' in request.form):
                        error = None
                        invite_uid = None
                        # do we require an invite key?
                        '''
                        if not app.debug:
                            # did the user provide an invite key?
                            if not ('k' in request.form):
                                error = "Sorry, OuterClub is not accepting signups at this time."
                            else:
                                cur.execute('select email,code,user_id from invite_key where code=%s',(request.form['k'],))
                                row = cur.fetchone()
                                if (not row):
                                    error = "Sorry, OuterClub is not accepting signups at this time."
                                else:
                                    invite_uid = row[2]
                        '''
                        if 'k' in request.form:
                            cur.execute('select email,code,user_id from invite_key where code=%s',(request.form['k'],))
                            row = cur.fetchone()
                            if (row):
                                invite_uid = row[2]
                        if (not error):
                            alias = request.form['alias']
                            if len(alias) == 0:
                                error = "Alias cannot be empty."
                            elif len(alias) <= 2:
                                error = "Alias must be greater than 2 characters long."
                            elif len(alias) > 12:
                                error = "Alias was too long."
                            elif not re.match("^\w+$",alias):
                                error = "Alias can only contain alphanumeric characters or underscores."
                    
                            else:
                                # check to see if user exists
                                cur.execute('select user_id,avatar_image from user where LCASE(name)=%s', (alias,))
                                test = cur.fetchone()
                        
                                # if the user exists
                                if (test != None):
                                    error = "Alias already in use."
                        if (not error):
                            avatar = 'generic.png'
                            cover = 'default.jpg'
                            # process the form submission
                            res = cur.execute('insert into user (name,email,avatar_image,prestige,cover_image,fbId,fbName,signup_date) values (%s,%s,%s,0,%s,%s,%s,NOW())', ( \
                                          alias, \
                                          email, \
                                          avatar, \
                                          cover, \
                                          userID, \
                                          name))
                    
                            uid = cur.lastrowid
                            
                            if invite_uid:
                                # increment the user prestige only if not admin
                                cur.execute('update user set prestige=prestige+3 where user_id=%s and admin=0',(invite_uid,))
                    
                            # delete the invite key
                            if ('k' in request.form):
                                res = cur.execute('delete from invite_key where code=%s',(request.form['k'],))
                    
                            conn.commit()
                    
                            # push the prestige change
                            if invite_uid:
                                app.config['transport'].open()
                                app.config['client'].userModified(invite_uid);
                                app.config['transport'].close()
                    
                            # initialize the user
                            ret = flask.jsonify(key=initAuth(uid))
                        if (error):
                            ret = flask.jsonify(error=error)
                    else:
                        # display signup button
                        ret = flask.jsonify(signup=True)
            cur.close()
            conn.close()
            return ret
        return ''
    else:
        # check to see if user exists
        conn = app.config['pool'].connection()
        cur = conn.cursor()
        cur.execute('select user_id,avatar_image,password from user where email=%s and password=%s', (request.form['l_email'],hashlib.sha224(request.form['l_password']).hexdigest()))
        test = cur.fetchone()
        cur.close()
        conn.close()
    
        if test != None:
            return flask.jsonify(key=initAuth(test[0]))
        # user doesn't exist!
        else:
            return flask.jsonify(error='E-mail or password was not valid.');

@app.route('/connect',methods=['POST'])
def connect():
    if not viewFunctions.isLoggedIn():
        return ''
    
    if 'userID' in request.form and 'accessToken' in request.form:
        try:
            fetch = json.loads(urllib2.urlopen("https://graph.facebook.com/me?access_token=%s" % (request.form['accessToken'])).read())
        except:
            fetch = dict()
        if (not 'error' in fetch and 'id' in fetch and fetch['id'] == request.form['userID']):
            userID = request.form['userID']
            name = fetch['first_name']+' '+fetch['last_name']
    
            conn = app.config['pool'].connection()
            cur = conn.cursor()
            cur.execute('update user set fbId=%s,fbName=%s where user_id=%s', (userID,name,viewFunctions.getUid()))
            conn.commit()
            cur.close()
            conn.close()
            return flask.jsonify(fbName=name)
    return ''

@app.route('/invite',methods=['GET','POST'])
def invite():
    #return render_template('invite.html',name='test')
    if not viewFunctions.isLoggedIn():
        return ''
    uid = viewFunctions.getUid()
    conn = app.config['pool'].connection()
    cur = conn.cursor()
    cur.execute('select name,invites,admin from user where user_id=%s',(uid,))    
    username,numInvites,isAdmin = cur.fetchone()
    if not isAdmin and numInvites == 0:
        cur.close()
        conn.close()
        return flask.jsonify(error='No more invitations available!')

    error = None
    name = request.form['name'] 
    email = request.form['email'].strip()
    if len(name) == 0:
        name = email
    elif len(email) == 0:
        error = 'Friend e-mail address must be provided.'
    elif not util.emailValid(email):
        error = "E-mail address was not valid."

    if not error:
        key = str(uuid.uuid4())[:7]
        cur.execute('insert into invite_key (email,code,myDate,user_id) values (%s,%s,NOW(),%s)',(email,key,uid))
        if not isAdmin:
            cur.execute('update user set invites=%s where user_id=%s',(numInvites-1,uid))
        conn.commit()
        cur.close()
        conn.close()
        
        # use formal invitation if admin, otherwise normal referer
        if isAdmin: 
            data = render_template('invite.html',name=name,key=key)
        else:
            data = render_template('referral.html',name=name,key=key,alias=username)
        
        # only actually send if it's in prod mode
        if not app.config['DEBUG']:
            util.send(app.config,email,'%s, welcome to OuterClub!' % (name),data)
    if error:
        return flask.jsonify(error=error)
    else:
        return '{}'
         
    
@app.route('/signup')
def signup():
    # write the key, if exists
    k = ''
    if ('k' in request.args):
        k = request.args['k'] 
    return render_template('signup.html',k=k)

@app.route('/logout')
def logout():
    redir = flask.redirect(flask.url_for('signup',check=False))
    resp = app.make_response(redir)
    resp.set_cookie('key',expires=datetime.now())
    return resp
