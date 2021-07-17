# Sublayer Message

## Send Email

```
POST http://0.0.0.0:5011/v0/send
Content-Type: application/json
Authorization: Bearer 10f37828-cf89-11ea-ab34-0242ac140004

{
    "channel": "email",
    "subject": "Welcome to this app",
    "attention": "John Doe",
    "to": "johndoe@acme.com",
    "payload": {
        "param": 123,
        "abc": "def"
    },
    "body": "<h1>It works!</h1>"
}
```

## Send SMS

```
POST http://0.0.0.0:5011/v0/send
Content-Type: application/json
Authorization: Bearer 10f37828-cf89-11ea-ab34-0242ac140004

{
    "channel": "sms",
    "subject": "Welcome to this app",
    "attention": "John Doe",
    "to": "johndoe@acme.com",
    "payload": {
        "param": 123,
        "abc": "def"
    },
    "body": "<h1>It works!</h1>"
}
```