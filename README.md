# gregarious

call nested npm scripts. This is similar to lerna but with
"no string attached".

> Definition of gregarious
>
> 1. a. tending to associate with others of one's kind : social gregarious animals  
>    b. marked by or indicating a liking for companionship : sociable is friendly, outgoing, and gregarious  
>    c. of or relating to a social group
> 2. a. of a plant : growing in a cluster or a colony  
>    b. living in contiguous nests but not forming a true colony —used especially of wasps and bees
>
> -- www.merriam-webster.com --

## Installation

```shell
npm install -g gregarious
```

## Usage

```shell
cd my-repo
greg run test
```

## Scopes

```shell
greg run test --scope packages/foo
```

```shell
greg run test --scope packages/foo --scope packages/bar
```

## Missing scripts

Gregarious will simply skip missing scripts.

```shell
greg run bar
```

See the example packages below

**package.json**

```json
{
  "name": "my-repo",
  "version": "1.0.0",
  "workspaces": ["packages/*"],
  "private": true
}
```

**packages/foo/package.json**

```json
{
  "name": "my-repo/foo",
  "version": "0.1.0",
  "scripts": {
    "foo": "echo \"called foo from foo\" >> output.txt"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

**packages/bar/package.json**

```json
{
  "name": "my-repo/bar",
  "version": "0.1.0",
  "scripts": {
    "foo": "echo \"called foo from bar\" >> output.txt",
    "bar": "echo \"called bar from bar\" >> output.txt"
  },
  "publishConfig": {
    "access": "public"
  }
}
```
