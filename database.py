import config
import datetime

def fetchConversationTags(cursor,d_id):
    cursor.execute('select tag.name from link_conversation_tag inner join tag using (tag_id) where d_id=%s',(d_id,))
    tags = []
    for tag in cursor.fetchall():
        tags.append(tag[0])
    return tags
    
def fetchResponses(cursor,d_id):
    cursor.execute('select r_id,user.name,replyDate,content,avatar_image,prestige from response inner join user using (user_id) where d_id=%s order by replyDate asc', (d_id,))
    responses = []
    for resp in cursor.fetchall():
        responses.append({'r_id':resp[0],'user':resp[1], \
                          'date': config.dateFormat(resp[2]), 'content': resp[3], \
                          'avatar_image': resp[4],'prestige':resp[5]})
    return responses

def fetchPopularTags(cursor,cat_id):
    cursor.execute('select tag.name,count(*) from link_conversation_tag inner join conversation using (d_id) inner join tag using (tag_id) where cat_id=%s group by tag_id order by count(*) desc limit 10',(cat_id,))
    tags = []
    for r in cursor.fetchall():
        tags.append(r[0])
    return tags

def fetchTrendingConversations(cursor):
    cursor.execute('select d_id,image,user_id,title,postDate,content from conversation inner join category using (cat_id) limit 10')
    
    conversations = []
    i=1
    for d in cursor.fetchall():
        conversations.append({'rank':i,'d_id': d[0],'image':d[1],'title':d[3],'date':d[4],'content':d[5]})
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
    res = cursor.execute('select name,avatar_image from user where user_id=%s',(user_id,))
    user = cursor.fetchone()
    return {'name':user[0],'avatar_image':user[1],'user_id':user_id}

