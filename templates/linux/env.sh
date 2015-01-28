#!/bin/bash
export PORT=80
export ROOT_URL=http://localhost

export MONGO_URL=mongodb://127.0.0.1/<%= appName %>
export MONGO_OPLOG_URL=mongodb://127.0.0.1/<%= appName %>/local

#it is possible to override above env-vars from the user-provided values
<% for(var key in env) { %>
  export <%- key %>=<%- ("" + env[key]).replace(/./ig, '\\$&') %>
<% } %>