import flask
from flask import request
from server import app
 
def isLoggedIn():
    return 'key' in request.cookies and request.cookies['key'] in app.config['globalAuths']

def displaySignup():
    return flask.redirect(flask.url_for('signup'))

def getUid():
    return int(app.config['globalAuths'][request.cookies['key']])

