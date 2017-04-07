'use babel';

function getUserHome() {
  return process.env['USERPROFILE'];
}

module.exports = {
  JSONLocation: {
    title: 'JSON Location',
    description: 'Set to the location of the scriptbinds.json file on your computer.',
    type: 'string',
    default: getUserHome() + '\\.hexe\\docs'
  }
}
