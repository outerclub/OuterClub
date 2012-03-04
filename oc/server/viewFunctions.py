import flask
from flask import request
from server import app
 
def isLoggedIn():
    loggedIn = 'key' in request.cookies and request.cookies['key'] in app.config['globalAuths']
     
    if loggedIn:
        conn = app.config['pool'].connection()
        cur = conn.cursor()
        cur.execute('update user set last_login=NOW() where user_id=%s',(getUid(),))
        conn.commit()
        cur.close()
        conn.close()
    return loggedIn

def displaySignup():
    return flask.redirect(flask.url_for('signup'))

def getUid():
    return int(app.config['globalAuths'][request.cookies['key']])

