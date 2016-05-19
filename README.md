# ZBox Manager RBAC
Role Base Access Control for ZBox Manager using Zimbra as a backend.

Because ZBox Manager works as a fronted for several APIs, but the users are managed by Zimbra, we
need a brigde between this APIs and Zimbra, this way Zimbra returns if the user is allowed to make the
request to the API.

This works using [Nginx Auth Request Module](http://nginx.org/en/docs/http/ngx_http_auth_request_module.html), like :

```
Rest-Req ----> [ API ] <--- Authorize to RBAC service ----> [ RBAC ]
    |                                                           |
    |                                                           |
    --------------------- [ 200 OK | 401 Failed ] <--------------
```

For example the PowerDNS Proxy in Nginx would have the following configuration:

```
location /powerdns_proxy/ {
       auth_request /auth/powerdns; # <--- This is the Important part
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header Host 192.168.0.112;
       proxy_redirect off;
       proxy_pass http://192.168.0.112:8081/;
       proxy_cache_valid   200  5m;
       proxy_connect_timeout 10m;
       proxy_cache_use_stale  error timeout invalid_header updating http_500 http_502 http_503 http_504;
  }
```

In the example `auth_request /auth/powerdns` tels Nginx that it should validate the
request asking to the `/auth/powerdns` location, wich is configured as follows:

```
upstream zbox-manager-rbac {
   server auth-server:5601;
   keepalive 100;
}

location /auth {
    proxy_pass http://zbox-manager-rbac/
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URI $request_uri;
}
```

## Config File
A JSon config file loaded from the `zbox_rbac_config` environment variable.
