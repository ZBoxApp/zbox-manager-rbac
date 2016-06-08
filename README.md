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
upstream rbac-manager {
  server localhost:8070;
}

location /powerdns_proxy/ {
  auth_request /auth/powerdns;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header x-api-key 'otto';
  proxy_set_header Host 192.168.0.112;
  proxy_redirect off;
  proxy_pass http://192.168.0.112:8081/;
  proxy_connect_timeout 10m;
}

location /folio/ {
  auth_request /auth/folio;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header Host the_host;
  proxy_redirect off;
  proxy_pass http://company.folio.cl/;
  proxy_cache_valid   200  5m;
  proxy_connect_timeout 10m;
  proxy_cache_use_stale  error timeout invalid_header updating http_500 http_502 http_503 http_504;
  proxy_set_header Authorization "Basic theuser:thepassword";
}

location /auth {
    proxy_pass http://rbac-manager/;
    proxy_pass_request_body off;
    proxy_set_header X-Original-URI $request_uri;
    proxy_set_header Content-Length ""; # Without this POST,PATH,PUT,DEL fail.
  }
```

In the example `auth_request /auth/powerdns` tells Nginx that it should validate the
request asking to the `/auth/powerdns` location, wich is configured as follows at the
`/etc/nginx/conf.d/zbox-rbac-manager.conf` file:

```
# Conf para ZBOX-RBAC

server {
    listen       8070;
    server_name  rbac-manager.zboxapp.com;

    error_log /var/log/nginx/rbac-error.log warn;
    access_log /var/log/nginx/rbac-access.log;

    #ssl_ciphers  HIGH:!aNULL:!MD5;
    #ssl_prefer_server_ciphers   on;

    root /var/www/zbox-manager-rbac/public;
    passenger_enabled on;
    # Tell Passenger that your app is a Node.js app
    passenger_app_type node;
    passenger_startup_file /var/www/zbox-manager-rbac/lib/index.js;

    gzip            on;
    gzip_min_length 1000;
    gzip_proxied    expired no-cache no-store private auth;
    gzip_types      text/plain application/xml application/javascript application/json;

  client_max_body_size 4G;
  keepalive_timeout 10;

}
```

## Config File
A JSon config file loaded from the `zbox_rbac_config` environment variable.
The config file should have the following format:

```javascript
{
 "port": _listen_port_,
 "zimbra_url": "https://_zimbra_server_:7071/service/admin/soap"
}
```
