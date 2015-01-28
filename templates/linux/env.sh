#!/bin/bash
export PORT=80
export MONGO_URL=mongodb://127.0.0.1/<%= appName %>
export ROOT_URL=http://localhost

#it is possible to override above env-vars from the user-provided values
<% for(var key in env) { %>
  export <%- key %>=<%- ("" + env[key]).replace(/./ig, '\\$&') %>
<% } %>


#put number of cores in nginx conf
export CORES=$(grep -c ^processor /proc/cpuinfo)
sed -i -e 's/CORES/'"$CORES"'/g' /etc/nginx/sites-enabled/<%= appName %>
