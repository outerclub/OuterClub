delete from user;
delete from user_guild;
delete from upvote;
delete from response;
delete from task;
delete from conversation;
delete from category where private=true and name != 'question of the week';
delete from invite_key;
delete from user_category_blurb;
