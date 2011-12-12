from flask import render_template
from flask import Flask
app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/categories')
def categories():
    cts = ['LOUNGE','CURRENT EVENTS','HIGH SCHOOL','COLLEGE','ADULTHOOD','LOVE CLINIC','PHILOSOPHY','SPORTS','TV & MOVIES','VIDEO & COMPUTER GAMES','MUSIC','FASHION','TECHNOLOGY']
    ct_dict = dict()
    for c in cts:
        sanitized = c.lower().replace(' ','')
        ct_dict[sanitized] = c

    return render_template('categories.html',categories=ct_dict,tab='categories')

@app.route('/categories/<category>')
def category(category):
    popular_tags = ['Nokia','Technology','Apple']
    posts = []
    for i in range(5):
        posts.append({'id':i,'title':'random title', \
                      'user': 'myUser', \
                      'date': '19 July 2011 at 4:55PM', \
                      'tags': ['tag 1','tag 2','tag 3']})
    return render_template('category.html',popular=popular_tags,posts=posts)

@app.route('/post')
def post():
    print 'post'

app.debug = True
app.run()
