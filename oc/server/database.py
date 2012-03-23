import util
import datetime
import pickle
cache = dict()
def fetchCategoryPosts(cur,cat_id):
    # fetch the conversations for this category
    res = cur.execute('select d_id,title,postDate,user_id,content from conversation where cat_id=%s order by postDate desc',(cat_id,))
    posts = []
    maxResponses = 3
    for conversation in cur.fetchall():
        key = 'd_id_%s'%(conversation[0])
        if not key in cache:
            # collect the last responses
            cur.execute('select user_id,replyDate,content from response where d_id=%s order by replyDate desc limit %s',(conversation[0],maxResponses))
            responses = []
            for response in cur.fetchall():
                responses.insert(0,{'user':fetchUser(cur,response[0]),'date':response[1].isoformat(),'content':util.replaceMentions(cur,util.escape(response[2]),True)})
    
            # fetch the poster
            user = fetchUser(cur,conversation[3])
    
            # add in the original post, if applicable
            if (len(responses) < maxResponses):
                responses.insert(0,{'user':user,'date':(conversation[2]).isoformat(),'content':util.replaceMentions(cur,util.escape(conversation[4]),True)})
    
            # count replies
            cur.execute('select COUNT(*) from response where d_id=%s',(conversation[0],))
            numReplies = cur.fetchone()[0]
    
            # count participants
            cur.execute('select DISTINCT user_id from response where d_id=%s',(conversation[0],))
            uids = set()
            for u in cur.fetchall():
                uids.add(u[0])
            uids.add(user['user_id'])
            
            numUsers = len(uids)
            convo = {'id':conversation[0], 'title':conversation[1],  \
                     'user':user, \
                     'date': (conversation[2]).isoformat(),'responses':responses,'numReplies':numReplies,'numUsers':numUsers}
            cache[key] = convo

        posts.append(cache[key])
    return posts
    

def fetchResponses(cursor,d_id,user_id):
    cursor.execute('select r_id,user_id,replyDate,content from response where d_id=%s order by replyDate asc', (d_id,))
    
    responses = []
    for resp in cursor.fetchall():
        responses.append({'r_id':resp[0],'user':fetchUser(cursor,resp[1]), \
                          'date': resp[2].isoformat(), 'content': util.replaceMentions(cursor,util.escape(resp[3]))})
    return responses

def fetchTrendingConversations(cursor):
    # a simple order by most recent date
    cursor.execute('select c.d_id,cat_id,c.user_id,title,postDate,c.content from conversation c join response r on c.d_id = r.d_id where replyDate > (select subtime(now(), \'2 00:00:00\')) group by d_id,cat_id,c.user_id,title,postDate,c.content order by count(*) desc limit 10')
	
    conversations = []
    i=1
    for d in cursor.fetchall():
        conversations.append({'rank':i,'id': d[0],'cat_id':d[1],'title':d[3],'date': d[4].isoformat(),'content':util.escape(d[5])})
        i += 1
    return conversations

def fetchLeaderboard(cursor):
    cursor.execute('select user_id,name,prestige,avatar_image from user order by prestige desc limit 20')

    users = []
    i=1
    for u in cursor.fetchall():
        users.append({'rank':i,'user_id':u[0],'name':u[1],'prestige':u[2],'avatar_image':u[3]})
        i += 1
    return  users

def fetchTasks(cursor,user_id):
    cursor.execute('select task_id,type,done,external_id from task where user_id=%s',(user_id,))
    
    tasks = [{'task_id':0,'type':'read tutorial','done':False,'external_id':0}]
    for t in cursor.fetchall():
        tasks.append({'task_id':t[0],'type':t[1],'done':t[2],'external_id':t[3]})
    return tasks

def invalidateConversation(cursor,d_id):
    key = 'd_id_%s'%d_id
    if key in cache:
        del cache[key]
def invalidateUserCache(cursor,user_id):
    conversations = set()
    # find any conversations that rely on this user
    cursor.execute('select d_id from conversation where user_id=%s',(user_id,))
    for r in cursor.fetchall():
        conversations.add(r[0])
    cursor.execute('select d_id from response where user_id=%s',(user_id,))
    for r in cursor.fetchall():
        conversations.add(r[0])
    
    key = 'uid_%s'%user_id
    if key in cache:
        del cache[key]
    
    for d_id in conversations:
        key = 'd_id_%s'%d_id
        if key in cache:
            del cache[key]

def fetchUserNoCache(cursor,user_id):
    res = cursor.execute('select name,avatar_image,prestige,cover_image,admin,invites from user where user_id=%s',(user_id,))
    user = cursor.fetchone()
    userData =  {'name':user[0], \
                 'avatar_image':user[1], \
                 'user_id':user_id, \
                 'prestige':user[2], \
                 'cover_image':user[3], \
                 'admin':user[4], \
                 'invites':user[5]}
    #res = cursor.execute('select cat_id,name from user_guild inner join category using (cat_id) where user_id=%s',(user_id,))
    guilds = dict()
    #for guild in cursor.fetchall():
    #    guilds[guild[0]] = guild[1]
    userData['guilds'] = guilds

    res = cursor.execute('select cat_id,text from user_category_blurb where user_id=%s',(user_id,))
    blurbs = dict()
    for r in cursor.fetchall():
        blurbs[r[0]] = r[1]
    userData['blurbs'] = blurbs
    return userData

def fetchUser(cursor,user_id):
    key = "uid_%s" % user_id
    if (not key in cache):
        cache[key] = fetchUserNoCache(cursor,user_id)

    return cache[key]

def fetchQuestion(cursor):
    res = cursor.execute('select cat_id from category where name=%s',('question of the week',))
    cat_id = cursor.fetchone()[0];
    res = cursor.execute('select d_id,title from conversation where cat_id=%s order by postDate desc limit 1',(cat_id,))
    row = cursor.fetchone()
    if (row != None):
        return {'id':row[0],'title':row[1]}
    else:
        return None

def fetchNews(cursor,user_id):
    res = cursor.execute('select value from object where id=%s',('news_%s' % user_id,))
    row = cursor.fetchone()
    data = []
    if (row):
        data = pickle.loads(row[0])
    else:
        data.append({'date':datetime.datetime.now(),'content':'Feed initialized.'});
    return data

def insertNews(cursor,user_id,item):
    item['date'] = datetime.datetime.now()
    news = fetchNews(cursor,user_id)
    isNew = len(news) == 1

    news.insert(0,item)
    
    # max news items
    news = news[:14]
    key = 'news_%s' %user_id
    data = pickle.dumps(news)
    if (isNew):
        cursor.execute('insert into object (id,value) values (%s,%s)',(key,data))
    else:
        cursor.execute('update object set value=%s where id=%s',(data,key))

def fetchWeekly(cur):
    cur.execute('select d_id,count(*) from response where replyDate > (select subtime(now(), \'7 00:00:00\')) group by d_id order by count(*) desc limit 5')
    MAX_RESPONSES = 5
    convos = []
    for r in cur.fetchall():
        d_id = r[0]
        cur.execute('select category.name,user_id,title,content from conversation inner join category using (cat_id) where d_id=%s',(d_id,))
        test = cur.fetchone()
        name = util.formatCategoryName(test[0]);
        title = util.escape(test[2].encode('utf-8'))
        poster = fetchUser(cur,test[1])
        
        item = {'user':poster,'content':util.escape(test[3].encode('utf-8')).replace('\n','<br />')}
        
        cur.execute('select user_id,content from response where d_id=%s order by replyDate desc limit '+str(MAX_RESPONSES),(d_id,))
        responses = []
        for r2 in cur.fetchall():
            responses.insert(0,{'user':fetchUser(cur,r2[0]),'content':util.escape(r2[1].encode('utf-8')).replace('\n','<br />')})
        if (responses < MAX_RESPONSES):
            responses.insert(0,item)
            
        # count replies
        numReplies = r[1]

        # count participants
        cur.execute('select DISTINCT user_id from response where d_id=%s',(d_id,))
        uids = set()
        for u in cur.fetchall():
            uids.add(u[0])
        uids.add(poster['user_id'])
        convos.append({'title':title,'category_name':name,'responses':responses,'numReplies':numReplies,'numUsers':len(uids)})
    return convos
def fetchNewUsers(cur):
    cur.execute('select user_id,name,signup_date from user order by user_id desc limit 10')
    users = []
    for u in cur.fetchall():
        d = {'name':u[1],'user_id':u[0]}
        if (u[2] != None):
            d['signup_date'] = u[2].strftime('%Y-%m-%d')
        users.append(d)
    return users