import config

def fetchDiscussionTags(cursor,d_id):
    cursor.execute('select tag.name from link_discussion_tag inner join tag using (tag_id) where d_id=%s',(d_id,))
    tags = []
    for tag in cursor.fetchall():
        tags.append(tag[0])
    return tags
    
def fetchResponses(cursor,d_id):
    cursor.execute('select r_id,user.name,replyDate,content,avatar_image from response inner join user using (user_id) where d_id=%s order by replyDate asc', (d_id,))
    responses = []
    for resp in cursor.fetchall():
        responses.append({'r_id':resp[0],'user':resp[1], \
                          'date': config.dateFormat(resp[2]), 'content': resp[3], \
                          'avatar': resp[4]})
    print responses
    return responses

def fetchPopularTags(cursor,cat_id):
    cursor.execute('select tag.name,count(*) from link_discussion_tag inner join discussion using (d_id) inner join tag using (tag_id) where cat_id=%s group by tag_id order by count(*) desc limit 10',(cat_id,))
    tags = []
    for r in cursor.fetchall():
        tags.append(r[0])
    return tags

def fetchTrendingDiscussions(cursor):
    cursor.execute('select d_id,image,user_id,title,postDate,content from discussion inner join category using (cat_id) limit 10')
    
    discussions = []
    i=1
    for d in cursor.fetchall():
        discussions.append({'rank':i,'d_id': d[0],'image':d[1],'title':d[3],'date':d[4],'content':d[5]})
        i += 1
    return discussions
