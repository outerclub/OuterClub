from flask import render_template
import MySQLdb
from flask import Flask
import database as db
from flask import request
app = Flask(__name__)

conn = None
conn = MySQLdb.connect('localhost','root','','oc')
cur = conn.cursor()
def isLoggedIn():
    return True;
def login():
    return True

@app.route('/')
def index():
    if not isLoggedIn():
        login()

    return render_template('index.html')

@app.route('/about')
def about():
    if not isLoggedIn():
        login()

    return render_template('about.html')

@app.route('/categories')
def categories():
    if not isLoggedIn():
        login()

    res = cur.execute('select * from category') 
    ct_dict = dict()
    for c in cur.fetchall():
        cat = c[1]
        sanitized = cat.lower().replace(' ','+')
        ct_dict[sanitized] = cat

    return render_template('categories.html',categories=ct_dict,tab='categories')

@app.route('/category/<category>')
def category(category):
    if not isLoggedIn():
        login()

    category = category.replace('+',' ')
    cur.execute('select cat_id from category where name=%s', (category,))
    cat_id = cur.fetchone()[0]

    res = cur.execute('select d_id,user.name,title,postDate,content from discussion inner join user using (user_id) where cat_id=%s',(cat_id,))
    posts = []
    cur2 = conn.cursor()
    for discussion in cur.fetchall():
        tags = db.fetchDiscussionTags(cur2,discussion[0])
        posts.append({'id':discussion[0], 'title':discussion[2],  \
                      'user':discussion[1], \
                      'date': discussion[3], \
                      'tags': tags})
    popular_tags = db.fetchPopularTags(cur,cat_id)
    return render_template('category.html',popular=popular_tags,posts=posts,category_name=category,category_url=category.replace(' ','+'))

@app.route('/discussion/<id>')
def discussion(id):
    if not isLoggedIn():
        login()

    res = cur.execute('select user.name,title,postDate,content,cat_id from (discussion inner join user using (user_id)) where d_id=%s',(id,))
    discussion = cur.fetchone()
    cur.execute('select name from category where cat_id=%s',(discussion[4],))
    categoryName = cur.fetchone()[0]
    tags = db.fetchDiscussionTags(cur,id)
    popular_tags = db.fetchPopularTags(cur,discussion[4])

    discussion = {'id': id, 'title':discussion[1], \
                  'user':discussion[0], \
                   'date': discussion[2], \
                   'content': discussion[3], \
                   'tags': tags, \
                  }
    responses = db.fetchResponses(cur,id)
    return render_template('discussion.html',discussion=discussion,popular=popular_tags,responses=responses,category_name=categoryName,category_url=categoryName.replace(' ','+'))

@app.route('/post',methods=['POST'])
def post():
    print 'post'

@app.route('/reply',methods=['POST'])
def reply():
    if not isLoggedIn():
        login()
    d_id = request.form['d_id']
    data = request.form['data']

    cur.execute('insert into response (d_id,user_id,replyDate,content) values (%s,%s,NOW(),%s)',(d_id,1,data))

    return "true"

app.debug = True
app.run()
