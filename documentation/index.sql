create index code_index on invite_key(code);
create index cat_id_index on user_category_blurb(cat_id);
create index user_id_index on user_category_blurb(user_id);
create index name_index on category(name);
create index cat_id_index on conversation(cat_id);
create index d_id_index on response(d_id);
create index user_id_index on upvote(user_id);
create index name_index on user(name)
