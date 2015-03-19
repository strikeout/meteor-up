#!/bin/bash

# puts number of cores in nginx site conf
export CORES=$(grep -c ^processor /proc/cpuinfo)
sed -i -e 's/CORES/'"$CORES"'/g' /etc/nginx/sites-enabled/global.conf