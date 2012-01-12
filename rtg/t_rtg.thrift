struct TResponse
{
    1:optional i32 d_id,
    2:optional i32 user_id,
    3:optional string username,
    4:optional string avatar,
    5:optional string date,
    6:optional string content
    7:string category_image
    8:i32 category_id
    9:string title
}
struct TPost
{
    1:optional i32 d_id,
    2:optional i32 user_id,
    3:optional string username,
    4:optional string avatar,
    5:optional string date,
    6:optional string content
    7:string category_image
    8:i32 category_id
    9:string title
}
service RtgService
{
    void newResponse(1:TResponse response);
    void newPost(1:TPost post);
}
