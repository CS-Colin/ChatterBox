const {build,releaseLabel} = require('./package.json');
if(releaseLabel) build.win.artifactName=`Chatterbox-Setup-${releaseLabel}.`+'${ext}';
const slug = process.env.GITHUB_REPOSITORY || 'CS-Colin/ChatterBox';
if (slug) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(slug)) throw new Error('GITHUB_REPOSITORY must be owner/repository');
  const [owner,repo] = slug.split('/');
  build.publish = [{provider:'github',owner,repo,releaseType:'release'}];
}
module.exports = build;
