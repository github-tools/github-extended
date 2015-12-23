'use strict';

import GithubApi from 'github-api';

/**
 * The class that extends Github.js
 *
 * @extends GithubApi
 */
export
 default class Github extends GithubApi {
   /**
    * @constructor
    * @param {Object} options The object containing the information to work with the GitHub API
    * @param {string} options.username The username used on GitHub
    * @param {string} options.password The password of the GitHub account
    * @param {string} options.auth The type of authentication to use. It can be either `basic` or `oauth`
    * @param {string} options.token The token to access the GitHub API
    */
   constructor(options) {
      super(options);

      let superGetRepo = this.getRepo;
      let request = this.request || this._request; // jscs:ignore disallowDanglingUnderscores

      /**
       * Returns an object representing a specific repository
       *
       * @param {string} user The username that possesses the repository
       * @param {string} repo The name of the repository to work on
       *
       * @returns {Object}
       */
      this.getRepo = (user, repo) => {
         let repository = superGetRepo(user, repo);
         let superRemove = repository.remove;
         let superFork = repository.fork;

         function getRepositoryInfo(repository) {
            return new Promise((resolve, reject) => {
               repository.show((error, repo) => {
                  if (error) {
                     reject(error);
                  }

                  resolve(repo);
               });
            });
         }

         /**
          * Searches files and folders
          *
          * @param {string} string The string to search
          * @param {Object} [options={}] Possible options
          * @param {string} [options.branch] The name of the branch in which the search must be performed
          * @param {boolean} [options.caseSensitive=false] If the search must be case sensitive
          * @param {boolean} [options.excludeFiles=false] If the result must exclude files
          * @param {boolean} [options.excludeFolders=false] If the result must exclude folders
          *
          * @returns {Promise}
          */
         repository.search = (string, options = {}) => {
            const FILE = 'blob';
            const FOLDER = 'tree';

            options = Object.assign({
               branch: 'master',
               caseSensitive: false,
               excludeFiles: false,
               excludeFolders: false
            }, options);

            return new Promise((resolve, reject) => {
               repository.getSha(options.branch, '', (error, sha) => {
                  if (error) {
                     reject(error);
                  }

                  resolve(sha);
               });
            })
               .then(sha => {
                  return new Promise((resolve, reject) => {
                     repository.getTree(`${sha}?recursive=true`, (error, list) => {
                        if (error) {
                           // No matches
                           if (error.error === 404) {
                              resolve([]);
                           } else {
                              reject(error);
                           }
                        }

                        resolve(list);
                     });
                  });
               })
               .then(list => {
                  let regex = new RegExp(string, options.caseSensitive ? '' : 'i');

                  return list.filter(content => {
                     let fileCondition = options.excludeFiles ? content.type !== FILE : true;
                     let folderCondition = options.excludeFolders ? content.type !== FOLDER : true;
                     let extractName = (path) => path.substring(path.lastIndexOf('/') + 1);

                     return fileCondition && folderCondition && regex.test(extractName(content.path));
                  });
               });
         };

         /**
          * Merges a pull request
          *
          * @param {Object} pullRequest The pull request to merge
          * @param {Object} [options={}] Possible options
          * @param {string} [options.commitMessage] The commit message for the merge
          *
          * @returns {Promise}
          */
         repository.mergePullRequest = (pullRequest, options = {}) => {
            options = Object.assign(
               {
                  commitMessage: `Merged pull request gh-${pullRequest.number}`
               },
               options
            );

            return getRepositoryInfo(repository)
               .then(repositoryInfo => {
                  return new Promise((resolve, reject) => {
                     request(
                        'PUT',
                        `/repos/${repositoryInfo.full_name}/pulls/${pullRequest.number}/merge`, // jscs:ignore
                        {
                           commit_message: options.commitMessage, // jscs:ignore
                           sha: pullRequest.head.sha
                        },
                        (error, mergeInfo) => {
                           if (error) {
                              reject(error);
                           }

                           resolve(mergeInfo);
                        }
                     );
                  });
               });
         };

         /**
          * Deletes a file or a folder and all of its content from a given branch
          *
          * @param {string} [branchName='master'] The name of the branch in which the deletion must be performed
          * @param {string} [path=''] The path of the file or the folder to delete
          *
          * @returns {Promise}
          */
         repository.remove = (branchName = 'master', path = '') => {
            function removeFile(branchName, path) {
               return new Promise((resolve, reject) => {
                  superRemove(branchName, path, error => {
                     if (error) {
                        reject(error);
                     }

                     resolve();
                  });
               });
            }

            function removeFolder() {
               return new Promise((resolve, reject) => {
                  repository.getRef(`heads/${branchName}`, (error, sha) => {
                     if (error) {
                        reject(error);
                     }

                     resolve(sha);
                  });
               })
                  .then(sha => {
                     return new Promise((resolve, reject) => {
                        repository.getTree(`${sha}?recursive=true`, (error, tree) => {
                           if (error) {
                              reject(error);
                           }

                           resolve(tree);
                        });
                     });
                  })
                  .then(tree => {
                     let filesPromises = Promise.resolve();

                     // Filters all items that aren't in the path of interest and aren't files
                     // and delete them.
                     tree
                        .filter(item => item.path.indexOf(path) === 0 && item.type === 'blob')
                        .map(item => item.path)
                        .forEach(path => {
                           filesPromises = filesPromises.then(() => removeFile(branchName, path));
                        });

                     return filesPromises;
                  });
            }

            // Remove any trailing slash from the path.
            // GitHub does not accept it even when dealing with folders.
            path = path.replace(/\/$/, '');

            let removeFilePromise = removeFile(branchName, path);

            return removeFilePromise
               .then(
                  () => removeFilePromise,
                  error => {
                     // If the operation fails because the path specified is that of a folder
                     // keep going to retrieve the files recursively
                     if (error.error !== 422) {
                        throw error;
                     }

                     return removeFolder();
                  });
         };

         /**
          * Creates a fork of the repository
          *
          * @returns {Promise}
          */
         repository.fork = () => {
            return new Promise((resolve, reject) => {
               superFork((err, forkInfo) => {
                  function pollFork(fork) {
                     fork.contents('master', '', (err, contents) => {
                        if (contents) {
                           resolve(forkInfo);
                        } else {
                           setTimeout(pollFork.bind(null, fork), 250);
                        }
                     });
                  }

                  if (err) {
                     reject(err);
                  } else {
                     pollFork(superGetRepo(options.username, repo));
                  }
               });
            });
         };

         return repository;
      };
   }
}