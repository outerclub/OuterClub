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
    print 'hi'

app.debug = True
app.run()
