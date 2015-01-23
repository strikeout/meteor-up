#!/bin/bash

# Remove the lock
set +e
sudo rm /var/lib/dpkg/lock > /dev/null
sudo rm /var/cache/apt/archives/lock > /dev/null
sudo dpkg --configure -a
set -e

sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 561F9B9CAC40B2F7
sudo apt-get -y install apt-transport-https ca-certificates

# Ubuntu 14.04
# deb https://oss-binaries.phusionpassenger.com/apt/passenger trusty main
# Ubuntu 12.04
# deb https://oss-binaries.phusionpassenger.com/apt/passenger precise main
# Ubuntu 10.04
# deb https://oss-binaries.phusionpassenger.com/apt/passenger lucid main
# Debian 7
# deb https://oss-binaries.phusionpassenger.com/apt/passenger wheezy main
# Debian 6
# deb https://oss-binaries.phusionpassenger.com/apt/passenger squeeze main
echo 'deb https://oss-binaries.phusionpassenger.com/apt/passenger trusty main' | sudo tee /etc/apt/sources.list.d/passenger.list
sudo chown root: /etc/apt/sources.list.d/passenger.list
sudo chmod 600 /etc/apt/sources.list.d/passenger.list

sudo apt-get update
sudo apt-get install -y nginx-extras passenger



# Restart nginx
sudo stop nginx || :
sudo start nginx