'use strict';

import Github from '../../src/github-extended';
import testUser from '../fixtures/user.json';

/** @test {Github} */
describe('Github', () => {
   let github, repository, testRepositoryName;

   /**
    * Creates or update a file
    *
    * @param {Object} data The data to create or update the file
    * @param {string} data.repository The repository to work with
    * @param {string} data.branch The branch in which the file has to be created or updated
    * @param {string} data.filename The full path of the file
    * @param {string} data.content The content of the file
    * @param {string} data.commitMessage The commit message to use
    *
    * @returns {Promise}
    */
   function promisifiedWrite(data) {
      return new Promise((resolve, reject) => {
         data.repository.write(data.branch, data.filename, data.content, data.commitMessage, error => {
            if (error) {
               reject(error);
            }

            // Fixes an issue when writing multiple files in succession.
            // This issue only happens in Travis CI.
            // (http://stackoverflow.com/questions/19576601/github-api-issue-with-file-upload#comment29076073_19576601)
            setTimeout(resolve, 500);
         });
      });
   }

   /**
    * Delete one or more repositories
    *
    * @param {string|Array} repository
    *
    * @returns {Promise}
    */
   function deleteRepository(repository) {
      if (typeof repository === 'string') {
         repository = [repository];
      }

      let repositoriesPromises = repository.map(name => {
         return new Promise((resolve, reject) => {
            github
               .getRepo(testUser.username, name)
               .deleteRepo((error, result) => {
                  if (error) {
                     reject(error);
                  }

                  resolve(result);
               });
         })
      });

      return Promise.all(repositoriesPromises);
   }

   before(done => {
      github = new Github({
         username: testUser.username,
         password: testUser.password,
         auth: 'basic'
      });
      let user = github.getUser();

      testRepositoryName = 'github-extended-' + Math.floor(Math.random() * 100000);
      user.createRepo({
            name: testRepositoryName
         },
         error => {
            if (error) {
               throw error;
            }

            repository = github.getRepo(testUser.username, testRepositoryName);
            promisifiedWrite({
               repository: repository,
               branch: 'master',
               filename: 'README.md',
               content: '# GitHub Extended',
               commitMessage: 'Initial commit'
            })
               .then(() => done());
         }
      );
      repository = github.getRepo(testUser.username, testRepositoryName);
   });

   after(done => repository.deleteRepo(() => done()));

   describe('search()', () => {
      let branchName = 'search';
      let files = [
         'package.json',
         'Hello world.md',
         'README.md',
         'app/index.html',
         'app/scripts/main.js'
      ];

      before(done => {
         repository.branch('master', branchName, error => {
            if (error) {
               throw error;
            }

            let promise = Promise.resolve();

            files.forEach(file => {
               promise = promise.then(() => {
                  return promisifiedWrite({
                     repository: repository,
                     branch: branchName,
                     filename: file,
                     content: 'THIS IS A TEST',
                     commitMessage: 'Commit message'
                  });
               });
            });

            promise.then(() => done());
         });
      });

      it('should find matches with the default configuration', () => {
         let search = repository.search('PAC', {
            branch: branchName
         });
         let results = search.then(result => {
            return result.map(item => {
               return {
                  type: item.type,
                  path: item.path
               };
            });
         });

         return Promise.all([
            assert.eventually.isArray(search, 'An array is returned'),
            assert.eventually.lengthOf(search, 1, 'One file found'),
            assert.eventually.sameDeepMembers(
               results,
               [{
                  type: 'blob',
                  path: 'package.json'
               }],
               'Correct information returned'
            )
         ]);
      });

      it('should find matches with the caseSensitive option', () => {
         let search = repository.search('acka', {
            branch: branchName,
            caseSensitive: true
         });
         let results = search.then(result => {
            return result.map(item => {
               return {
                  type: item.type,
                  path: item.path
               };
            });
         });

         return Promise.all([
            assert.eventually.isArray(search, 'An array is returned'),
            assert.eventually.lengthOf(search, 1, 'One file found'),
            assert.eventually.sameDeepMembers(
               results,
               [{
                  type: 'blob',
                  path: 'package.json'
               }],
               'Correct information returned'
            )
         ]);
      });

      it('should find only files with the excludeFolders option', () => {
         let search = repository.search('PAC', {
            branch: branchName,
            excludeFolders: true
         });
         let results = search.then(result => {
            return result.map(item => {
               return {
                  type: item.type,
                  path: item.path
               };
            });
         });

         return Promise.all([
            assert.eventually.isArray(search, 'An array is returned'),
            assert.eventually.lengthOf(search, 1, 'One file found'),
            assert.eventually.sameDeepMembers(
               results,
               [{
                  type: 'blob',
                  path: 'package.json'
               }],
               'Correct information returned'
            )
         ]);
      });

      it('should find only folders with the excludeFolders option', () => {
         let search = repository.search('app', {
            branch: branchName,
            excludeFiles: true
         });
         let results = search.then(result => {
            return result.map(item => {
               return {
                  type: item.type,
                  path: item.path
               };
            });
         });

         return Promise.all([
            assert.eventually.isArray(search, 'An array is returned'),
            assert.eventually.lengthOf(search, 1, 'One folder found'),
            assert.eventually.sameDeepMembers(
               results,
               [{
                  type: 'tree',
                  path: 'app'
               }],
               'Correct information returned'
            )
         ]);
      });

      it('should not find any match with a non-matching string with the default configuration', () => {
         let search = repository.search('random.unknown');

         return Promise.all([
            assert.eventually.isArray(search, 'An array is returned'),
            assert.eventually.lengthOf(search, 0, 'Zero files found')
         ]);
      });
   });

   describe('mergePullRequest()', () => {
      let branchName = 'mergePullRequest';
      let branchIndex = 0;
      let filename = 'index.md';
      let pullRequest;

      before(done => {
         repository.branch('master', branchName, error => {
            if (error) {
               throw error;
            }

            promisifiedWrite({
               repository: repository,
               branch: branchName,
               filename: filename,
               content: 'This is a text',
               commitMessage: 'Commit'
            })
               .then(() => done());
         });
      });

      beforeEach(done => {
         branchIndex++;
         let updatesBranchName = branchName + branchIndex;
         repository.branch(branchName, updatesBranchName, error => {
            if (error) {
               throw error;
            }

            promisifiedWrite({
               repository: repository,
               branch: updatesBranchName,
               filename: filename,
               content: 'This is a different text',
               commitMessage: 'Commit message'
            })
               .then(() => {
                  repository.createPullRequest({
                        title: 'Pull request',
                        body: 'Pull request',
                        base: branchName,
                        head: `${testUser.username}:${updatesBranchName}`
                     },
                     (error, pullRequestInfo) => {
                        if (error) {
                           throw error;
                        }

                        pullRequest = pullRequestInfo;
                        done();
                     }
                  );
               });
         });
      });

      it('should merge a valid pull request with the default merge commit message', () => {
         let merge = repository.mergePullRequest(pullRequest);

         return Promise.all([
            assert.isFulfilled(merge, 'The request is successful'),
            assert.eventually.isObject(merge, 'The information about the merged pull request are returned'),
            assert.eventually.propertyVal(merge, 'merged', true, 'The pull request is merged')
         ]);
      });

      it('should merge a valid pull request with a custom merge commit message', () => {
         let options = {
            commitMessage: 'Custom message'
         };
         let merge = repository.mergePullRequest(pullRequest, options);

         return Promise.all([
            assert.isFulfilled(merge, 'The request is successful'),
            assert.eventually.isObject(merge, 'The information about the merged pull request are returned'),
            assert.eventually.propertyVal(merge, 'merged', true, 'The pull request is merged')
         ]);
      });

      it('should throw an error for an invalid pull request', () => {
         pullRequest.head.sha += 'random-text';
         let merge = repository.mergePullRequest(pullRequest);

         return assert.isRejected(merge, 'The pull request is not merged');
      });
   });

   describe('remove()', () => {
      let branchName = 'remove';
      let files = [
         'package.json',
         'Hello world.md',
         'README.md',
         'app/index.html',
         'app/scripts/main.js'
      ];

      function promisifiedGetTree(repository, branchName) {
         return new Promise((resolve, reject) => {
            repository.getRef(`heads/${branchName}`, (error, sha) => {
               if (error) {
                  reject(error);
               }

               repository.getTree(`${sha}?recursive=true`, (error, tree) => {
                  if (error) {
                     reject(error);
                  }

                  resolve(tree);
               });
            });
         })
      }

      before(done => {
         repository.branch('master', branchName, error => {
            if (error) {
               throw error;
            }

            let promise = Promise.resolve();

            files.forEach(file => {
               promise = promise.then(() => {
                  return promisifiedWrite({
                     repository: repository,
                     branch: branchName,
                     filename: file,
                     content: 'THIS IS A TEST',
                     commitMessage: 'Commit message'
                  });
               });
            });

            promise.then(() => done());
         });
      });

      it('should delete a file', () => {
         let itemsNumber;

         return promisifiedGetTree(repository, branchName)
            .then(tree => itemsNumber = tree.length)
            .then(() => repository.remove(branchName, 'package.json'))
            .then(() => promisifiedGetTree(repository, branchName))
            .then(tree => {
               let readContent = new Promise((resolve, reject) => {
                  repository.read(branchName, 'package.json', (error, data) => {
                     if (error) {
                        reject(error);
                     }

                     resolve(data);
                  });
               });

               return Promise.all([
                  assert.strictEqual(tree.length, itemsNumber - 1, 'The items count is decreased'),
                  assert.isRejected(readContent, 'The file is not found')
               ]);
            });
      });

      it('should delete a folder and all its content', () => {
         let itemsNumber;

         return promisifiedGetTree(repository, branchName)
            .then(tree => itemsNumber = tree.length)
            .then(() => repository.remove(branchName, 'app'))
            .then(() => promisifiedGetTree(repository, branchName))
            .then(tree => {
               let readContent = new Promise((resolve, reject) => {
                  repository.contents(branchName, 'app/', (error, contents) => {
                     if (error) {
                        reject(error);
                     }

                     resolve(contents);
                  });
               });

               return Promise.all([
                  assert.strictEqual(tree.length, itemsNumber - 4, 'The items count is decreased'),
                  assert.isRejected(readContent, 'The folder is not found')
               ]);
            });
      });
   });

   describe('fork()', () => {
      let forkUsername = 'AurelioDeRosa';
      let forkRepositoryName = 'HTML5-API-demos';

      afterEach(done => {
         let fork = github.getRepo(testUser.username, forkRepositoryName);

         fork.deleteRepo(() => done());
      });

      it('should be able to fork an existent repository', () => {
         let repositoryToFork = github.getRepo(forkUsername, forkRepositoryName);
         let fork = repositoryToFork.fork();

         return Promise.all([
            assert.eventually.propertyVal(fork, 'fork', true, 'The repository is a fork'),
            assert.eventually.propertyVal(
               fork,
               'full_name',
               `${testUser.username}/${forkRepositoryName}`,
               'The fork is created in the account of the user'
            )
         ]);
      });

      it('should throw an error if the repository to fork does not exist', () => {
         let repositoryToFork = github.getRepo(forkUsername, 'non-existent-repository');
         let fork = repositoryToFork.fork();

         return assert.isRejected(fork, 'The fork is not created');
      });
   });
});