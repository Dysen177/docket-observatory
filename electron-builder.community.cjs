const { build } = require('./package.json')

const communityBuild = JSON.parse(JSON.stringify(build))

communityBuild.forceCodeSigning = false
communityBuild.mac = {
  ...communityBuild.mac,
  identity: '-',
  notarize: false,
  artifactName: 'Docket-Observatory-${version}-macOS-${arch}-unsigned.${ext}',
}
communityBuild.win = {
  ...communityBuild.win,
  // Resource editing writes the bundled icon and version metadata. It does not
  // sign the binary and remains compatible with a free unsigned release.
  signAndEditExecutable: true,
  artifactName: 'Docket-Observatory-${version}-Windows-${arch}-unsigned.${ext}',
}

module.exports = communityBuild
