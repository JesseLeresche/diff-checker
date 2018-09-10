    #!/usr/bin/env node
    'use strict';
    /**
     * Require dependencies
     *
     */
    const program = require('commander'),
        chalk = require("chalk"),
        execSync = require('child_process').execSync,
        pkg = require('./package.json');

/**
 * list function definition
 *
 */
let printBranchList = (directory,options)  => {
    let parameterizedCommand = listBranches(options, directory);
    console.log(parameterizedCommand);

};

function changeToDirectory(directory, parameterizedCommand) {
    if (directory) parameterizedCommand = 'cd ' + directory + ' && ' + parameterizedCommand;
    return parameterizedCommand;
}

function listBranches(options, directory) {
    const cmd = 'git for-each-ref --format=\'%(refname:short)\' refs/heads';
    let params = [];

    if (options.remotes) params.push("r");
    let parameterizedCommand = params.length
        ? cmd + ' -' + params.join('')
        : cmd;
    parameterizedCommand = changeToDirectory(directory, parameterizedCommand);

    logCommand(options.verbose, parameterizedCommand);
    let branches = execSync(parameterizedCommand).toString();
    return branches;
}

/**
* find commit hash function definition
*
*/
let printFoundCommitHash = (date, branch, directory, options)  => {
    let message = findCommitHash(date,branch, directory, options.verbose, options.pull);
    console.log(message);
};

function logCommand(verbose, parameterizedCommand) {
    if (verbose) console.log(chalk.white.bold("Running Command: ") + parameterizedCommand);
}

function findCommitHash(date, branch, directory, verbose, pull) {
    const cmd = 'git rev-list -n 1';
    let params = [];

    if (date) params.push(" --before=" + date);

    params.push(" " + branch);
    let parameterizedCommand = params.length
        ? cmd + params.join('')
        : cmd;
    parameterizedCommand = changeToDirectory(directory, parameterizedCommand);
    logCommand(verbose, parameterizedCommand);

    let message = execSync(parameterizedCommand).toString().replace('\n', '');
    return message;
}

function diffBranch(options, directory, branch) {
    let parameterizedCommand = 'git diff';

    branch = branch ? branch : options.branch;

    if (options.pull) parameterizedCommand = 'git checkout ' + branch + ' && git pull && ' + parameterizedCommand;

    let validateStartingInput = determineCommitHash(options.commit1, options.startDate, branch, "starting", directory, options.verbose);
    var success = validateStartingInput.success;
    var response = validateStartingInput.response;
    if (success) {
        parameterizedCommand += response;
    } else {
        console.log(response);
    }

    let validateEndingInput = determineCommitHash(options.commit2, options.endDate, branch, "ending", directory, options.verbose);
    var success = validateEndingInput.success;
    var response = validateEndingInput.response;
    if (success) {
        parameterizedCommand += response;
    } else {
        console.log(response);
    }

    parameterizedCommand += ' --color';
    parameterizedCommand = changeToDirectory(directory, parameterizedCommand);
    if (options.nameOnly) parameterizedCommand += " --name-only";
    logCommand(options.verbose, parameterizedCommand);
    let differences = execSync(parameterizedCommand);
    if (options.nameOnly) differences = chalk.green(differences);
    return differences;
}

/**
 * find commit hash function definition
 *
 */
let diff = (directory, options)  => {
    var branches;
    if (options.all) {
        branches = listBranches(options, directory).split("\n");
        branches.pop();
    } else {
        branches = [options.branch];
    }

    var i;
    for (i in branches) {
        console.log("Listing changes for branch " + branches[i]);
        console.log(diffBranch(options, directory, branches[i]).toString());
    }

};

function determineCommitHash(commit, date, branch, type, directory, verbose) {
    let response = "";
    let success = true;
    if (commit) {
        response =  " " + commit;
    } else if (date && branch) {
        let endCommit = findCommitHash(date, branch, directory, verbose).toString();
        response =  " " + endCommit;
    } else {
        response = (chalk.red("Error: Either " + type + " commit or " + type + " date and branch should be supplied"));
        success = false;
    }
    return {response, success};
}

program
    .version(pkg.version)
    .command('list branches in [directory] ')
    .option('-r, --remotes', 'List remotes')
    .option('-v, --verbose', 'Show verbose logging')
    .action(printBranchList);

program
    .command('find [date] <branch> [directory]')
    .option('-v, --verbose', 'Show verbose logging')
    .action(printFoundCommitHash);

program
    .command('diff commits [directory]')
    .option('-1, --commit1 [commit1]', 'Commit to Start Diff from')
    .option('-2, --commit2 [commit2]', 'Commit to End Diff at')
    .option('-s, --start-date [start_date]', 'Diff Start Date')
    .option('-e, --end-date [end_date]', 'Diff End Date')
    .option('-b, --branch [branch]', 'Branch to Diff')
    .option('-n, --name-only', 'Show file names only instead of changes')
    .option('-a, --all', 'List for all branches')
    .option('-v, --verbose', 'Show verbose logging')
    .option('-p, --pull', 'Pull branch before diff')
    .action(diff);

program.parse(process.argv);

// if program was called with no arguments, show help.
if (program.args.length === 0) program.help();
