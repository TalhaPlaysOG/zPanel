const Docker = require('dockerode');
const d = new Docker({
  protocol: 'https',
  host: 'ais-pre-wvw6coh3gwnwgq2ehkdsjx-59612131379.asia-east1.run.app', // wait, we don't have the node's URL
  port: 443
});
// Let's just create a mock server locally to see if Node Agent can proxy docker API.
