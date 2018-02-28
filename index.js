#!/usr/bin/env node
"use strict";
const path = require("path");
const fs = require("fs");
const pify = require("pify");
const meow = require("meow");
const execa = require("execa");
const globby = require("globby");
const pkgDir = require("pkg-dir");
const winston = require("winston");

/**
 * Helper to create spaces for alignment
 */
const createSpaces = (str, maxLength = 10) =>
  Array(Math.max(0, maxLength - str.length))
    .map(() => " ")
    .join(" ");

/**
 * A simple logger with colors
 */
const log = winston.createLogger({
  level: process.env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.json(),
    winston.format.colorize(),
    winston.format.simple(),
    winston.format.printf(info => {
      const spaces = createSpaces(info.level, 20);

      return `${info.level}${spaces}${info.message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

/**
 * Promise based fs methods
 */
const { readFile } = pify(fs);

/**
 * CLI interface
 */
const cli = meow(
  `
    Usage
    $ greg <input>

    Options
      --scope, -s  scope of the package 

    Examples
      $ greg run foo
      $ greg run foo --scope packages/foo
      $ greg run foo --scope packages/foo --scope packages/bar
`,
  {
    flags: {
      /**
       * Defines which scopes we want to work in.
       */
      scope: {
        type: "string",
        alias: "s"
      }
    }
  }
);

/**
 * Data from CLI
 */
const { input: INPUT, flags: { scope = [] } } = cli;

/**
 * Make sure we always get an array
 */
const ensureArray = arrOrStr =>
  Array.isArray(arrOrStr) ? arrOrStr : [arrOrStr];

/**
 * Ensure that scope is an array
 */
const SCOPE = ensureArray(scope);

/**
 * Simple error handling using the custom logger
 */
const handleError = err => {
  log.error(err);
};

/**
 * Take care of the CWD context
 * It reads the content of the package.json
 * This will allow us to get the yarn workspaces
 */
const handleCWD = cwd => {
  const pkg = path.join(cwd, "package.json");
  readFile(pkg, "utf-8")
    .then(handleRootContent)
    .catch(handleError);
};

/**
 * Take care of the content from the root package.json.
 * We look for workspaces here.
 * Next we glob for all packages (must have a package.json)
 * We manually exclude all node_modules directories
 * (these should not exist on that level anyways but "better safe than sorry")
 */
const handleRootContent = content => {
  const { workspaces = [] } = JSON.parse(content);
  const packages = workspaces.map(dir => path.join(dir, "package.json"));
  globby([...packages, "!node_modules"])
    .then(packages => {
      const { length } = packages
        .map(x => x.replace(/\/package.json$/, ""))
        .sort((a, b) => b.length - a.length)[0];
      handlePackages(packages, length + 2);
    })
    .catch(handleError);
};

/**
 * Take care of the actual package.
 * We parse the package.json and then look for scripts.
 * Only scripts defined in the package can be used.
 * (This prevents calling undefined or core scripts)
 * @todo better handling of this decission
 */
const handlePackage = (pkg, length) => {
  const { dir: cwd } = path.parse(pkg);
  if (SCOPE.length > 0) {
    if (!SCOPE.includes(cwd)) {
      const spaces = createSpaces(cwd, length);
      log.info(`${cwd}:${spaces}skip`);
      return;
    }
  }
  readFile(pkg, "utf-8")
    .then(content => {
      const { scripts } = JSON.parse(content);
      const scriptNames = Object.keys(scripts);
      const [run, scriptName] = INPUT;

      // Let's check if the script has been defined.
      // If it has not been defined we simply skip the package.
      if (scriptNames.includes(scriptName)) {
        const spaces = createSpaces(cwd, length);
        log.info(`${cwd}:${spaces}npm ${INPUT.join(" ")}`);
        execa("npm", INPUT, { cwd, stdio: "inherit" }).catch(handleError);
      } else {
        const spaces = createSpaces(cwd, length);
        log.info(`${cwd}:${spaces}skip`);
      }
    })
    .catch(handleError);
};

/**
 * Handles each package.
 */
const handlePackages = (packages, length) => {
  packages.forEach(pkg => {
    handlePackage(pkg, length);
  });
};

/**
 * Get the package directory from cwd.
 * SImply handle the promise and pass on.
 */
pkgDir(process.cwd())
  .then(handleCWD)
  .catch(handleError);
