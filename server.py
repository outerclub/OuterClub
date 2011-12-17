from flask import render_template
import MySQLdb
from flask import Flask
app = Flask(__name__)

conn = None
conn = MySQLdb.connect('localhost','root','','oc')
cur = conn.cursor()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/categories')
def categories():
    res = cur.execute('select * from category') 
    ct_dict = dict()
    for c in cur.fetchall():
        cat = c[1]
        sanitized = cat.lower().replace(' ','+')
        ct_dict[sanitized] = cat

    return render_template('categories.html',categories=ct_dict,tab='categories')

posts = []
for i in range(5):
    posts.append({'id':i,'title':'random title', \
                  'user': 'myUser', \
                  'date': '19 July 2011 at 4:55PM', \
                  'tags': ['tag 1','tag 2','tag 3']})

@app.route('/categories/<category>')
def category(category):
    popular_tags = ['Nokia','Technology','Apple']
    posts = []
    return render_template('category.html',popular=popular_tags,posts=posts)

@app.route('/discussion/<id>')
def discussion(id):
    discussion = {'id': id, 'title':'random title', \
                  'user':'a temp user', \
                   'date': '19 July 2011 at 4:55PM', \
                   'tags': ['tag 1','tag 2','tag 3'], \
                   'responses': [ \
                        {'user':'reply user', \
                        'date': '19 July 2011 at 5:00PM', \
                        'content': 'A sample of content'}] \
                  }
    popular_tags = ['Nokia','Technology','Apple']
    return render_template('discussion.html',discussion=discussion,popular=popular_tags)

@app.route('/post')
def post():
    print 'post'

app.debug = True
app.run()
