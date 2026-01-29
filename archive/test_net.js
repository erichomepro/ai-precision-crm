const axios = require('axios');
axios.get('https://google.com')
    .then(res => console.log("SUCCESS: " + res.status))
    .catch(err => console.error("FAIL: " + err.message));
