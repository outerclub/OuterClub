from server import app
import viewFunctions
import database as db
import os
import flask
from flask import request
from werkzeug import secure_filename
import uuid
ALLOWED_EXTENSIONS = set(['png','jpg','jpeg'])

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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

@app.route('/avatar',methods=['POST'])
def avatar():
    if not viewFunctions.isLoggedIn():
        return ''
    if 'avatar' in request.files:
        file = request.files['avatar']
        if file and allowed_file(file.filename):
            rand = uuid.uuid4()
            fileext = secure_filename(file.filename).rsplit('.',1)[1].lower()
            filename = 'avatar-%s.%s' % (rand,fileext)
            if not os.path.exists(app.config['UPLOAD_FOLDER']):
                os.makedirs(app.config['UPLOAD_FOLDER'])
            file.save(os.path.join(app.config['UPLOAD_FOLDER'],filename))
            return flask.jsonify(file=filename)
    elif 'temp_file' in request.form:
        temp_file = secure_filename(request.form['temp_file'])
        if temp_file != '':
            try:
                full_path = os.path.join(app.config['UPLOAD_FOLDER'],temp_file)
                open(full_path)
                os.rename(full_path,os.path.join(app.config['AVATARS_FOLDER'],temp_file))
                
                # update the user
                uid = viewFunctions.getUid()
                conn = app.config['pool'].connection()
                cur = conn.cursor()
                cur.execute('update user set avatar_image=%s where user_id=%s',(temp_file,uid))
                db.invalidateUserCache(cur,uid)
                conn.commit()
                cur.close()
                conn.close()
        
                app.config['transport'].open()
                app.config['client'].userModified(uid)
                app.config['transport'].close()
            except Exception as e:
                print e
    return ''
    
@app.route('/cover',methods=['POST'])
def cover():
    if not viewFunctions.isLoggedIn():
        return ''
    if 'cover' in request.files:
        file = request.files['cover']
        if file and allowed_file(file.filename):
            rand = uuid.uuid4()
            fileext = secure_filename(file.filename).rsplit('.',1)[1].lower()
            filename = 'cover-%s.%s' % (rand,fileext)
            if not os.path.exists(app.config['UPLOAD_FOLDER']):
                os.makedirs(app.config['UPLOAD_FOLDER'])
            file.save(os.path.join(app.config['UPLOAD_FOLDER'],filename))
            return flask.jsonify(file=filename)
    elif 'temp_file' in request.form:
        temp_file = secure_filename(request.form['temp_file'])
        if temp_file != '':
            try:
                full_path = os.path.join(app.config['UPLOAD_FOLDER'],temp_file)
                open(full_path)
                os.rename(full_path,os.path.join(app.config['COVERS_FOLDER'],temp_file))
                
                # update the user
                uid = viewFunctions.getUid()
                conn = app.config['pool'].connection()
                cur = conn.cursor()
                cur.execute('update user set cover_image=%s where user_id=%s',(temp_file,uid))
                db.invalidateUserCache(cur,uid)
                conn.commit()
                cur.close()
                conn.close()
        
                app.config['transport'].open()
                app.config['client'].userModified(uid)
                app.config['transport'].close()
            except Exception as e:
                print e
    return ''

'''
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
'''

'''
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
'''
    
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
    
    # self ?
    if int(id) == viewFunctions.getUid():
        cur.execute('select fbId,fbName from user where user_id=%s',(id,))
        res = cur.fetchone()
        user['fbId'] = res[0]
        user['fbName'] = res[1]
    cur.close()
    conn.close()
    return flask.jsonify(user=user)
