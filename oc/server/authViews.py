from server import app
import viewFunctions
import database as db
import flask
from flask import request,render_template
import uuid
import hashlib
from datetime import datetime
from ..rtg.t_rtg.ttypes import TAuth
import util
import re

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

@app.route('/invite',methods=['POST'])
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
    email = request.form['email']
    if len(name) == 0:
        error = 'Friend name must be provided.'
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
         
    
@app.route('/signup',methods=['GET','POST'])
def signup():
    # display the page?
    if request.method == 'GET':
        # write the key, if exists
        k = ''
        if ('k' in request.args):
            k = request.args['k'] 
        return render_template('signup.html',k=k)

    error = None
    conn = app.config['pool'].connection()
    cur = conn.cursor()

    invite_uid = None
    # do we require an invite key?
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

    if not error:
        if len(request.form['email']) == 0:
            error = "E-mail cannot be empty."
        elif not util.emailValid(request.form['email']):
            error = "E-mail was not valid."
            
        # check to see if email exists
        cur.execute('select user_id from user where LCASE(email)=%s', (request.form['email'],))
        test = cur.fetchone()
        
        if (test != None):
            error = "E-mail already in use."
    
    # test for user
    if not error:
        if len(request.form['username']) == 0:
            error = "Username cannot be empty."
        elif len(request.form['username']) <= 2:
            error = "Username must be greater than 2 characters long."
        elif len(request.form['username']) > 12:
            error = "Username was too long."
        elif not re.match("^\w+$",request.form['username']):
            error = "Username can only contain alphanumeric characters or underscores."
        elif request.form['password'] != request.form['confirm']:
            error = "Passwords did not match."

        else:
            # check to see if user exists
            cur.execute('select user_id,avatar_image from user where LCASE(name)=%s', (request.form['username'],))
            test = cur.fetchone()
    
            # if the user exists
            if (test != None):
                error = "Username already in use."
            elif len(request.form['password']) == 0:
                error = "Password cannot be empty."
    
    # any errors?
    if (error):
        if cur:
            cur.close()
        if conn:
            conn.close()
        return flask.jsonify(error=error)
    else:
        avatar = 'generic.png'
        cover = 'default.jpg'
        # process the form submission
        res = cur.execute('insert into user (name,email,password,avatar_image,prestige,cover_image) values (%s,%s,%s,%s,0,%s)', (request.form['username'],request.form['email'],hashlib.sha224(request.form['password']).hexdigest(),avatar,cover))

        uid = cur.lastrowid
        
        if invite_uid:
            # increment the user prestige only if not admin
            cur.execute('update user set prestige=prestige+3 where user_id=%s and admin=0',(invite_uid,))

        # delete the invite key
        res = cur.execute('delete from invite_key where code=%s',(request.form['k'],))

        conn.commit()
        cur.close()
        conn.close()

        # push the prestige change
        if invite_uid:
            app.config['transport'].open()
            app.config['client'].userModified(invite_uid);
            app.config['transport'].close()

        # initialize the user
        return flask.jsonify(key=initAuth(uid))
    
@app.route('/logout')
def logout():
    redir = flask.redirect(flask.url_for('signup'))
    resp = app.make_response(redir)
    resp.set_cookie('key',expires=datetime.now())
    return resp
