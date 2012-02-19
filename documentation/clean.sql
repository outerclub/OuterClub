delete from user;
delete from user_guild;
delete from upvote;
delete from response;
delete from task;
delete from conversation;
delete from announcement;
delete from category where private=true and name != 'question of the week';
