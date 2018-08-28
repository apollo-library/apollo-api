#!/bin/bash

# Install NodeJS
if [ ! -f "/etc/debian_version" ];
   echo "error: this script only supports Debian versions 8 or 9"
fi

sudo apt-get install curl software-properties-common less
curl -sL https://deb.nodesource.com/setup_10.x | sudo bash -
sudo apt-get install -y nodejs

# Install MongoDB
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4

if [ "$(cat /etc/debian_version | head -c 1)" -eq "8" ]; then
	echo "deb http://repo.mongodb.org/apt/debian jessie/mongodb-org/4.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list
elif [ "$(cat /etc/debian_version | head -c 1)" -eq "9" ]; then
	echo "deb http://repo.mongodb.org/apt/debian stretch/mongodb-org/4.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list
else
	echo "error: unsupported version"
	exit(1)
fi

sudo apt-get update
sudo apt-get install -y mongodb-org

# Set up mongo config
echo "replSet=rs0" >> /etc/mongod.conf
sudo service mongod start
echo "rs.initiate()" | mongo

# Run MongoDB on startup
sudo systemctl enable mongod.service

# Install Nginx
sudo apt-get install nginx

# Run Nginx on startup
sudo systemctl enable nginx

# Copy files to appropriate locations
sudo cp apollo-api /etc/nginx/sites-available/apollo-api
ln -s /etc/nginx/sites-available/apollo-api /etc/nginx/sites-enabled/apollo-api
