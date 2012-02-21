import re
import cgi

qtext = '[^\\x0d\\x22\\x5c\\x80-\\xff]'
dtext = '[^\\x0d\\x5b-\\x5d\\x80-\\xff]'
atom = '[^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\x5d\\x7f-\\xff]+'
quoted_pair = '\\x5c[\\x00-\\x7f]'
domain_literal = "\\x5b(?:%s|%s)*\\x5d" % (dtext, quoted_pair)
quoted_string = "\\x22(?:%s|%s)*\\x22" % (qtext, quoted_pair)
domain_ref = atom
sub_domain = "(?:%s|%s)" % (domain_ref, domain_literal)
word = "(?:%s|%s)" % (atom, quoted_string)
domain = "%s(?:\\x2e%s)*" % (sub_domain, sub_domain)
local_part = "%s(?:\\x2e%s)*" % (word, word)
addr_spec = "%s\\x40%s" % (local_part, domain)

emailValidator = re.compile('\A%s\Z' % addr_spec)
def emailValid(s):
    return emailValidator.match(s)

def formatCategoryName(c):
    return ' '.join([spl.capitalize() if len(spl) > 2 else spl.upper() for spl in c.split(' ')])

def dateFormat(dt):
    s = dt.strftime(str(dt.day)+' %B, %Y '+str(dt.hour if dt.hour <= 12 else dt.hour-12)+':%M%p')
    return s
def hourDateFormat(dt):
    s = dt.strftime(str(dt.hour if dt.hour <= 12 else dt.hour-12)+':%M%p')
    return s

def escape(s):
    return cgi.escape(s)

def replaceMentions(cur,data):
    users = findMentions(cur,data)
    isAction = data.startswith('/me')
    
    accum = ''
    for segment in re.split('(@\w+)',data):
        if (segment.startswith('@')):
            name = segment[1:]
            u = users[name.lower()] 
            
            if isAction:
                accum += '<a name="%s" href="/user/%s"><img width="30" height="30" src="/static/images/avatars/%s" /></a>' % (u['user_id'],u['user_id'],u['avatar_image'])
            else:
                accum += '<a name="%s" href="/user/%s">@%s</a>' % (u['user_id'],u['user_id'],name)
        else:
            accum += segment
    return accum

def findMentions(cur,data):
    mentions = re.findall('@(\w+)',data)

    # convert to lowercase.
    mentions = map(lambda x: x.lower(),mentions)

    users = dict()
    if (len(mentions) > 0):
        replacements = map(lambda x:'%s',mentions)
        cur.execute('select name,user_id,avatar_image from user where LCASE(name) in (%s)' % ','.join(replacements),tuple(mentions))
        for u in cur.fetchall():
            users[u[0].lower()] = {'user_id':u[1],'avatar_image':u[2]}
        for n in mentions:
            if not (n in users):
                users[n] = None
    
    return users

class Upvote:
    UserType = 0
                

