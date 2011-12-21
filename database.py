def fetchDiscussionTags(cursor,d_id):
    cursor.execute('select tag.name from link_discussion_tag inner join tag using (tag_id) where d_id=%s',(d_id,))
    tags = []
    for tag in cursor.fetchall():
        tags.append(tag[0])
    return tags
    
def fetchResponses(cursor,d_id):
    cursor.execute('select r_id,user.name,replyDate,content from response inner join user using (user_id) where d_id=%s order by replyDate asc', (d_id,))
    responses = []
    for resp in cursor.fetchall():
        responses.append({'r_id':resp[0],'user':resp[1], \
                          'date': resp[2], 'content': resp[3]})
    return responses

def fetchPopularTags(cursor,cat_id):
    cursor.execute('select tag.name,count(*) from link_discussion_tag inner join discussion using (d_id) inner join tag using (tag_id) where cat_id=%s group by tag_id order by count(*) desc limit 10',(cat_id,))
    tags = []
    for r in cursor.fetchall():
        tags.append(r[0])
    return tags
