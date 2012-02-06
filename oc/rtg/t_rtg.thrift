struct TAuth
{
    1:i32 user_id;
    2:string key;
}
service RtgService
{
    void response(1:i32 r_id);
    void conversation(1:i32 d_id);
    void auth(1:TAuth auth);
    void userModified(1:i32 user_id);
}
