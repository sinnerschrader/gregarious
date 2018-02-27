#!/usr/bin/env node
"use strict";
const path = require("path");
const { readFile } = require("fs");
const meow = require("meow");
const execa = require("execa");
const globby = require("globby");
const pkgDir = require("pkg-dir");
const cli = meow(
  `
    Usage
    $ greg <input>

    Options
      --scope, -s  scope of the package 

    Examples
      $ greg run foo --scope packages/foo
      cd packages/foo && npm run foo
`,
  {
    flags: {
      scope: {
        type: "string",
        alias: "s"
      }
    }
  }
);

const { input, flags: { scope = [] } } = cli;

pkgDir(process.cwd()).then(cwd => {
  const pkg = path.join(cwd, "package.json");

  readFile(pkg, "utf-8", (err, content) => {
    if (err) {
      throw err;
    }
    const { workspaces = [] } = JSON.parse(content);
    const packages = workspaces.map(dir => path.join(dir, "package.json"));

    globby(packages).then(files => {
      files.forEach(file => {
        const { dir: cwd } = path.parse(file);
        if (scope.length > 0) {
          if (!scope.includes(cwd)) {
            return;
          }
        }
        const { scripts } = JSON.parse(content);
        const fullpath = path.join(__dirname, cwd);
        execa("npm", input, { cwd })
          .then(result => {})
          .catch(err => {
            const missingScript = err.stderr.match("missing script:");
            if (missingScript) {
              // skip error
              return;
            }
            throw err;
          });
      });
    });
  });
});
