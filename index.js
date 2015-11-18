var COMPILED_DIR = '.elm-stack';
var PACKAGED_DIR = COMPILED_DIR + '/' + 'packaged';

var fs = require('fs');
var rmdir = require('rimraf');
var archiver = require('archiver');
var compiler = require('node-elm-compiler');


var init = function(){
    if (!fs.existsSync(COMPILED_DIR)){
        fs.mkdirSync(COMPILED_DIR);
    }

    if (!fs.existsSync(PACKAGED_DIR)){
        fs.mkdirSync(PACKAGED_DIR);
    }
}();

var userAndProject = function(repository){
    if (repository.indexOf('.git') < 0){
        console.error("Malformed git url!")
        return null;
    }

    var re = /github.com\/(.+)\/(.+).git/;
    var groups = repository.match(re);

    var user = groups[1];
    var project = groups[2];

    return {
        user: user,
        project: project
    };
};

var makeProjectFolder = function(user, project, version){
    var userDir = COMPILED_DIR + "/" + user;
    var projectDir = userDir + "/" + project;
    var versionDir = projectDir + "/" + version;

    if (!fs.existsSync(userDir)){
       fs.mkdirSync(userDir);
    }

    if (!fs.existsSync(projectDir)){
       fs.mkdirSync(projectDir);
    }

    if (fs.existsSync(versionDir)){
        rmdir.sync(versionDir);
    }

    fs.mkdirSync(versionDir);


    return versionDir;
};

var compile = function(outFile, onClose, dir){
    if (dir){
        process.chdir(dir);
    }

    compiler.compile([], {
        output: outFile,
        yes: true
    }).on('close', onClose);
};

// for a given file, create a binary folder
var makeBinaries = function(packageJsonFile){
    var packageJson = require(packageJsonFile);
    var userProject = userAndProject(packageJson.repository);

    var dir = makeProjectFolder(userProject.user, userProject.project, packageJson.version);

    compile('/dev/null', function() {
        var name = userProject.user + "_" + userProject.project + "_" + packageJson.version;
        var output = fs.createWriteStream(__dirname + '/' + PACKAGED_DIR + '/' + name + '.zip');
        var archive = archiver('zip');

        archive.on('error', function(err) {
          console.log("here3");
          throw err;
        });

        output.on('close', function() {
          console.log(archive.pointer() + ' total bytes');
          console.log('archiver has been finalized and the output file descriptor has closed.');
        });

        output.on('open', function() {
            archive.pipe(output);
            archive.bulk([
              { expand: true, cwd: __dirname + "/" + dir, src: ['**/*'] }
            ]).finalize();
        });
    }, dir);
};


makeBinaries('./elm-package.json');


