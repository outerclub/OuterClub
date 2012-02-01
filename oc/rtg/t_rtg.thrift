struct TResponse
{
    1:optional i32 d_id,
    2:optional i32 user_id,
    3:optional string date,
    4:optional string content
    5:string category_image
    6:i32 category_id
    7:string title,
    8:i32 r_id
}
struct TPost
{
    1:optional i32 d_id,
    2:optional i32 user_id,
    3:optional string date,
    4:optional string content
    5:string category_image
    6:i32 category_id
    7:string title
}
struct TAuth
{
    1:i32 user_id;
    2:string key;
}
service RtgService
{
    void newResponse(1:TResponse response);
    void newPost(1:TPost post);
    void auth(1:TAuth auth);
    void userModified(1:i32 user_id);
}
