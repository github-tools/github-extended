# GitHub Extended

[GitHub Extended](https://github.com/AurelioDeRosa/github-extended) is a collection of methods to extend the 
functionality of [Github.js](https://github.com/michael/github) (known on [npm](https://www.npmjs.com) as
[github-api](https://www.npmjs.com/package/github-api)).

## Requirements

Being an extension for Github.js, the only requirement is to install and include
[Github.js](https://github.com/michael/github) before
[GitHub Extended](https://github.com/AurelioDeRosa/github-extended).

## Installation

You can install GitHub Extended by using [npm](https://www.npmjs.com):

```
npm install github-extended
```

Alternatively, you can install it via [Bower](http://bower.io):

```
bower install github-extended --save
```

Another possibility is to manually download it.

## Methods

The sections below describe the methods provided.

### repository.search(string, options = {})

Searches files and folders

### repository.mergePullRequest(pullRequest, options = {})

Merges a pull request

### repository.remove(branchName = 'master', path = '')

Deletes a file or a folder and all of its content from a given branch

### repository.fork()

Creates a fork of the repository

## License

[GitHub Extended](https://github.com/AurelioDeRosa/github-extended) is dual licensed under
[MIT](http://www.opensource.org/licenses/MIT) and [GPL-3.0](http://opensource.org/licenses/GPL-3.0).

## Author

[Aurelio De Rosa](http://www.audero.it) ([@AurelioDeRosa](https://twitter.com/AurelioDeRosa))