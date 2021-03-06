var nodemiral = require('nodemiral');
var fs = require('fs');
var path = require('path');

var SCRIPT_DIR = path.resolve(__dirname, '../../scripts/linux');
var TEMPLATES_DIR = path.resolve(__dirname, '../../templates/linux');

//installMongo, setupNode, nodeVersion, setupPhantom, setupPassenger, appName
exports.setup = function (config) {
    var taskList = nodemiral.taskList('Setup (linux)');

    // Installation
    if (config.setupNode) {
        taskList.executeScript('Installing Node.js', {
            script: path.resolve(SCRIPT_DIR, 'install-node.sh'),
            vars: {
                nodeVersion: config.nodeVersion
            }
        });
    }

    if (config.setupPhantom) {
        taskList.executeScript('Installing PhantomJS', {
            script: path.resolve(SCRIPT_DIR, 'install-phantomjs.sh')
        });
    }

    taskList.executeScript('Setting up Environment', {
        script: path.resolve(SCRIPT_DIR, 'setup-env.sh'),
        vars: {
            appName: config.appName
        }
    });

    if (config.setupMongo) {
        taskList.copy('Copying MongoDB configuration', {
            src: path.resolve(TEMPLATES_DIR, 'mongodb.conf'),
            dest: '/etc/mongodb.conf'
        });

        taskList.executeScript('Installing MongoDB', {
            script: path.resolve(SCRIPT_DIR, 'install-mongodb.sh')
        });
    }

    if (config.setupPassenger) {

        // Passenger config
        taskList.executeScript('Installing Nginx w/ Passenger', {
            script: path.resolve(SCRIPT_DIR, 'install-nginx_passenger.sh')
        });

        taskList.copy('Creating Nginx global configuration', {
            src: path.resolve(TEMPLATES_DIR, 'nginx_global.conf'),
            dest: '/etc/nginx/sites-enabled/global.conf'
        });

        taskList.executeScript('Counting CPU cores for auto-scaling', {
            script: path.resolve(SCRIPT_DIR, 'setup-scaling_per_core.sh')
        });


        taskList.execute('Reloading Nginx config', {
            command: '(sudo initctl reload-configuration) && (sudo service nginx reload)'
        });

    } else {
        // Forever config
        taskList.copy('Configuring upstart', {
            src: path.resolve(TEMPLATES_DIR, 'meteor.conf'),
            dest: '/etc/init/' + config.appName + '.conf',
            vars: {
                appName: config.appName
            }
        });
    }
    return taskList;
};

exports.deploy = function (bundlePath, config) {
    var taskList = nodemiral.taskList("Deploy app '" + config.appName + "' (linux)");

    taskList.copy('Uploading bundle', {
        src: bundlePath,
        dest: '/opt/' + config.appName + '/tmp/bundle.tar.gz'
    });

    taskList.copy('Setting up Environment Variables', {
        src: path.resolve(TEMPLATES_DIR, 'env.sh'),
        dest: '/opt/' + config.appName + '/config/env.sh',
        vars: {
            env: config.env || {},
            appName: config.appName
        }
    });

    // deploying
    taskList.executeScript('Invoking deployment process', {
        script: path.resolve(TEMPLATES_DIR, 'deploy.sh'),
        vars: {
            deployCheckWaitTime: config.deployCheckWaitTime || 10,
            appName: config.appName
        }
    });


    if (config.setupPassenger) {

        // we cant easily use ENV vars, so we have to write them into the conf
        var MONGO_URL = config.env.MONGO_URL || 'mongodb://127.0.0.1';
        var MONGO_OPLOG_URL = config.env.MONGO_OPLOG_URL || MONGO_URL + '/local';

        taskList.copy('Creating Nginx configuration for vhost: ' + config.appName, {
            src: path.resolve(TEMPLATES_DIR, 'nginx_vhost.conf'),
            dest: '/etc/nginx/sites-enabled/vhost_' + config.appName,
            vars: {
                appName: config.appName,
                serverDomains: config.serverDomains,
                ROOT_URL: config.env.ROOT_URL,
                DDP_DEFAULT_CONNECTION_URL: config.env.DDP_DEFAULT_CONNECTION_URL || "",
                MONGO_URL: MONGO_URL,
                MONGO_OPLOG_URL: MONGO_OPLOG_URL
            }
        });

    }


    taskList.execute('Reloading Nginx config', {
        command: '(sudo initctl reload-configuration) && (sudo service nginx reload)'
    });


    return taskList;
};

exports.reconfig = function (config) {
    var taskList = nodemiral.taskList("Updating configurations (linux)");

    taskList.copy('Setting up Environment Variables', {
        src: path.resolve(TEMPLATES_DIR, 'env.sh'),
        dest: '/opt/' + config.appName + '/config/env.sh',
        vars: {
            env: config.env || {},
            appName: config.appName
        }
    });

    if (config.setupPassenger) {

        // we cant easily use ENV vars, so we have to write them into the conf
        var MONGO_URL = config.env.MONGO_URL || 'mongodb://127.0.0.1';
        var MONGO_OPLOG_URL = config.env.MONGO_OPLOG_URL || MONGO_URL + '/local';

        taskList.copy('Creating Nginx configuration for vhost: ' + config.appName, {
            src: path.resolve(TEMPLATES_DIR, 'nginx_vhost.conf'),
            dest: '/etc/nginx/sites-enabled/vhost_' + config.appName,
            vars: {
                appName: config.appName,
                serverDomains: config.serverDomains,
                ROOT_URL: config.env.ROOT_URL,
                DDP_DEFAULT_CONNECTION_URL: config.env.DDP_DEFAULT_CONNECTION_URL || "",
                MONGO_URL: MONGO_URL,
                MONGO_OPLOG_URL: MONGO_OPLOG_URL
            }
        });

    }


    taskList.execute('Restarting app', {
        command: '(sudo stop ' + config.appName + ' || :) && (sudo start ' + config.appName + ')'
    });

    return taskList;
};
