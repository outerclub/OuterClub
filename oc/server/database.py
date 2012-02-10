import util
import datetime
def fetchResponses(cursor,d_id,user_id):
    cursor.execute('select r_id,user_id,replyDate,content from response where d_id=%s order by replyDate asc', (d_id,))
    
    responses = []
    r_ids = []
    for resp in cursor.fetchall():
        r_ids.append(resp[0])
        responses.append({'r_id':resp[0],'user':fetchUser(cursor,resp[1]), \
                          'date': util.dateFormat(resp[2]), 'content': util.replaceMentions(cursor,resp[3]), \
                          'canVote':True})
    if (len(responses) > 0):
        whereClause = map(lambda x:'object_id=%s',r_ids)
        sql = 'select object_id from upvote where user_id=%s and type=%s and (' + ' or '.join(whereClause)+')'
        cursor.execute(sql,(user_id,util.Upvote.ResponseType,)+tuple(r_ids))
        
        myVotes = set()
        for r in cursor.fetchall():
            myVotes.add(r[0])
        for r in responses:
            if r['r_id'] in myVotes or r['user']['user_id'] == user_id:
                r['canVote'] = False
    return responses

def fetchTrendingConversations(cursor):
    cursor.execute('select d_id,image,user_id,title,postDate,content from conversation inner join category using (cat_id) limit 10')
    
    conversations = []
    i=1
    for d in cursor.fetchall():
        conversations.append({'rank':i,'d_id': d[0],'image':d[1],'title':d[3],'date':util.dateFormat(d[4]),'content':d[5]})
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
    
    announcements = [{'a_id':0,'title':'test announcement','content':'test Content','postDate':datetime.datetime.now(),'user_id':0}]
    for a in cursor.fetchall():
        announcements.append({'a_id':a[0],'title':a[1],'content':a[2],'postDate':a[3],'user_id':a[4]})
    return announcements

def fetchTasks(cursor,user_id):
    cursor.execute('select task_id,type,done,external_id from task where user_id=%s',(user_id,))
    
    tasks = [{'task_id':0,'type':'read tutorial','done':False,'external_id':0}]
    for t in cursor.fetchall():
        tasks.append({'task_id':t[0],'type':t[1],'done':t[2],'external_id':t[3]})
    return tasks

def fetchUser(cursor,user_id):
    res = cursor.execute('select name,avatar_image,prestige,cover_image from user where user_id=%s',(user_id,))
    user = cursor.fetchone()
    return {'name':user[0],'avatar_image':user[1],'user_id':user_id,'prestige':user[2],'cover_image':user[3]}

