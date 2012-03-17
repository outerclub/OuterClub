from server import app
import viewFunctions
import database as db
import os
import flask
from flask import request

@app.route('/blurb',methods=['POST'])
def blurb():
    if not viewFunctions.isLoggedIn():
        return ''

    cat_id = request.form['cat_id']
    blurb = request.form['blurb'].strip()
    uid = viewFunctions.getUid()

    conn = app.config['pool'].connection()
    cur = conn.cursor()
    cur.execute('select * from user_category_blurb where user_id=%s and cat_id=%s',(uid,cat_id))
    # exists?
    if (cur.fetchone()):
        if len(blurb) == 0:
            cur.execute('delete from user_category_blurb where user_id=%s and cat_id=%s',(uid,cat_id))
        else:
            cur.execute('update user_category_blurb set text=%s where user_id=%s and cat_id=%s',(blurb,uid,cat_id))
    else:
        cur.execute('insert into user_category_blurb (user_id,cat_id,text) values (%s,%s,%s)',(uid,cat_id,blurb))
    db.invalidateUserCache(cur,uid)
    
    conn.commit()
    cur.close()
    conn.close()
    return ''
    

@app.route('/covers',methods=['GET','POST'])
def covers():
    if not viewFunctions.isLoggedIn():
        return ''
    
    if request.method == 'GET':
        covers = []
        for f in os.listdir(app.root_path+'/static/images/covers'):
            if f != 'thumbs':
                covers.append(f)
        return flask.jsonify(covers=covers)
    else:
        uid = viewFunctions.getUid()
        conn = app.config['pool'].connection()
        cur = conn.cursor()
        cur.execute('update user set cover_image=%s where user_id=%s',(request.form['cover'],uid))
        db.invalidateUserCache(cur,uid)
        conn.commit()
        cur.close()
        conn.close()

        app.config['transport'].open()
        app.config['client'].userModified(uid)
        app.config['transport'].close()
        
        
        return ''

@app.route('/avatars',methods=['GET','POST'])
def avatars():
    if not viewFunctions.isLoggedIn():
        return ''
    # display the page?
    if request.method == 'GET':
        avatars = []
        for f in os.listdir(app.root_path+'/static/images/avatars'):
            if f != 'thumbs':
                avatars.append(f)
        return flask.jsonify(avatars=avatars)
    else:
        uid = viewFunctions.getUid()
        conn = app.config['pool'].connection()
        cur = conn.cursor()
        cur.execute('update user set avatar_image=%s where user_id=%s',(request.form['avatar'],uid))
        db.invalidateUserCache(cur,uid)
        conn.commit()
        cur.close()
        conn.close()

        app.config['transport'].open()
        app.config['client'].userModified(uid)
        app.config['transport'].close()
        
        return ''
    
@app.route('/user')
def user():
    if not viewFunctions.isLoggedIn():
        return ''
    return userId(viewFunctions.getUid())

@app.route('/user/<id>')
def userId(id):
    if not viewFunctions.isLoggedIn():
        return ''
    conn = app.config['pool'].connection()
    cur = conn.cursor()
    user = db.fetchUser(cur,id)
    cur.close()
    conn.close()
    return flask.jsonify(user=user)
