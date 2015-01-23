var nodemiral = require('nodemiral');
var fs = require('fs');
var path = require('path');

var SCRIPT_DIR = path.resolve(__dirname, '../../scripts/linux');
var TEMPLATES_DIR = path.resolve(__dirname, '../../templates/linux');

exports.setup = function (config) {
    var taskList = nodemiral.taskList('Setup (linux)');
    //installMongo, setupNode, nodeVersion, setupPhantom, setupPassenger, appName
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

    if (config.installMongo) {
        taskList.copy('Copying MongoDB configuration', {
            src: path.resolve(TEMPLATES_DIR, 'mongodb.conf'),
            dest: '/etc/mongodb.conf'
        });

        taskList.executeScript('Installing MongoDB', {
            script: path.resolve(SCRIPT_DIR, 'install-mongodb.sh')
        });
    }


    if (config.setupPassenger) {

        taskList.executeScript('Installing Nginx w/ Passenger', {
            script: path.resolve(SCRIPT_DIR, 'install-passenger_nginx.sh')
        });
        //taskList.copy('Copying Nginx configuration', {
        //  src: path.resolve(TEMPLATES_DIR, 'nginx.conf'),
        //  dest: '/etc/nginx/nginx.conf'
        //});

        console.log("config", config);

        var MONGO_URL = config.env.MONGO_URL || ' mongodb://127.0.0.1';
        var MONGO_OPLOG_URL = config.env.MONGO_OPLOG_URL || ' mongodb://' + MONGO_URL + '/local';

        taskList.copy('Copying Nginx server{} configuration', {
            src: path.resolve(TEMPLATES_DIR, 'nginx_server.conf'),
            dest: '/etc/nginx/sites-enabled/' + config.appName,
            vars: {
                appName: config.appName,
                ROOT_URL: config.env.ROOT_URL,
                DDP_DEFAULT_CONNECTION_URL: config.env.DDP_DEFAULT_CONNECTION_URL || "",
                MONGO_URL: MONGO_URL,
                MONGO_OPLOG_URL: MONGO_OPLOG_URL
            }
        });
        taskList.executeScript('Restarting Nginx w/ Passenger', {
            script: path.resolve(SCRIPT_DIR, 'restart_nginx.sh')
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

exports.deploy = function (bundlePath, env, deployCheckWaitTime, appName) {
    var taskList = nodemiral.taskList("Deploy app '" + appName + "' (linux)");

    taskList.copy('Uploading bundle', {
        src: bundlePath,
        dest: '/opt/' + appName + '/tmp/bundle.tar.gz'
    });

    taskList.copy('Setting up Environment Variables', {
        src: path.resolve(TEMPLATES_DIR, 'env.sh'),
        dest: '/opt/' + appName + '/config/env.sh',
        vars: {
            env: env || {},
            appName: appName
        }
    });

    // deploying
    taskList.executeScript('Invoking deployment process', {
        script: path.resolve(TEMPLATES_DIR, 'deploy.sh'),
        vars: {
            deployCheckWaitTime: deployCheckWaitTime || 10,
            appName: appName
        }
    });

    return taskList;
};

exports.reconfig = function (env, appName, setupPassenger) {
    var taskList = nodemiral.taskList("Updating configurations (linux)");

    taskList.copy('Setting up Environment Variables', {
        src: path.resolve(TEMPLATES_DIR, 'env.sh'),
        dest: '/opt/' + appName + '/config/env.sh',
        vars: {
            env: env || {},
            appName: appName
        }
    });

    //deploying
    if (!setupPassenger) { // passenger takes care of this by starting when a request comes via nginx
        taskList.execute('Restarting app', {
            command: '(sudo stop ' + appName + ' || :) && (sudo start ' + appName + ')'
        });
    }

    return taskList;
};
