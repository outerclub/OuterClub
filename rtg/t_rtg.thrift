struct TResponse
{
    1:optional i32 d_id,
    2:optional i32 user_id,
    3:optional string username,
    4:optional string avatar,
    5:optional string date,
    6:optional string content
}
service RtgService
{
    void newResponse(1:TResponse response);
}
