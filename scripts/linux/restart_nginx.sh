#!/bin/bash

sudo initctl reload-configuration

# Restart nginx
sudo service nginx reload;