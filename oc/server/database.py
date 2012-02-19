import util
import datetime
def fetchResponses(cursor,d_id,user_id):
    cursor.execute('select r_id,user_id,replyDate,content from response where d_id=%s order by replyDate asc', (d_id,))
    
    responses = []
    for resp in cursor.fetchall():
        responses.append({'r_id':resp[0],'user':fetchUser(cursor,resp[1]), \
                          'date': util.dateFormat(resp[2]), 'content': util.replaceMentions(cursor,util.escape(resp[3]))})
    return responses

def fetchTrendingConversations(cursor):
    cursor.execute('select d_id,thumb,user_id,title,postDate,content from conversation inner join category using (cat_id) limit 10')
    
    conversations = []
    i=1
    for d in cursor.fetchall():
        conversations.append({'rank':i,'id': d[0],'image':d[1],'title':d[3],'date':util.dateFormat(d[4]),'content':util.escape(d[5])})
        i += 1
    return conversations

def fetchLeaderboard(cursor):
    cursor.execute('select user_id,name,prestige,avatar_image from user order by prestige desc')

    users = []
    i=1
    for u in cursor.fetchall():
        users.append({'rank':i,'user_id':u[0],'name':u[1],'prestige':u[2],'avatar_image':u[3]})
        i += 1
    return  users
        
def fetchAnnouncements(cursor):
    cursor.execute('select a_id,title,content,postDate,user_id from announcement order by postDate desc');
    
    announcements = [{'a_id':0,'title':'test announcement','content':'test Content','postDate':util.dateFormat(datetime.datetime.now()),'user_id':0}]
    for a in cursor.fetchall():
        announcements.append({'a_id':a[0],'title':a[1],'content':a[2],'postDate':util.dateFormat(a[3]),'user_id':a[4]})
    return announcements

def fetchTasks(cursor,user_id):
    cursor.execute('select task_id,type,done,external_id from task where user_id=%s',(user_id,))
    
    tasks = [{'task_id':0,'type':'read tutorial','done':False,'external_id':0}]
    for t in cursor.fetchall():
        tasks.append({'task_id':t[0],'type':t[1],'done':t[2],'external_id':t[3]})
    return tasks

def fetchUser(cursor,user_id):
    res = cursor.execute('select name,avatar_image,prestige,cover_image,admin from user where user_id=%s',(user_id,))
    user = cursor.fetchone()
    userData =  {'name':user[0],'avatar_image':user[1],'user_id':user_id,'prestige':user[2],'cover_image':user[3],'admin':user[4]}
    res = cursor.execute('select cat_id,name from user_guild inner join category using (cat_id) where user_id=%s',(user_id,))
    guilds = dict()
    for guild in cursor.fetchall():
        guilds[guild[0]] = guild[1]
    userData['guilds'] = guilds
    return userData

def fetchQuestion(cursor):
    res = cursor.execute('select cat_id from category where name=%s',('question of the week',))
    cat_id = cursor.fetchone()[0];
    res = cursor.execute('select d_id,title from conversation where cat_id=%s order by postDate desc limit 1',(cat_id,))
    row = cursor.fetchone()
    if (row != None):
        return {'id':row[0],'title':row[1]}
    else:
        return None
