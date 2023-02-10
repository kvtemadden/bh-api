var refreshToken, bhRestToken;
const fs = require('fs/promises');
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.post('/api/receive', (req, res) => {
  const jsonData = req.body;
  console.log(jsonData);
  console.log('Received JSON data:', jsonData);
  
  res.json({
    message: 'JSON data received successfully!'
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// save new token
async function writeToken() {
    try {
      const content = refreshToken;
      await fs.writeFile('./token.txt', content);
    } catch (err) {
      console.log("this is the write error: " + err);
    }
  }

// read current token
async function readToken() {
    try {
      const data = await fs.readFile('./token.txt', { encoding: 'utf8' });
      console.log(data);
      refreshToken = data;
      getToken();
    } catch (err) {
      console.log(err);
    }
  }

function getToken() {
// get new access token using refresh
let queryURL = "https://auth-emea.bullhornstaffing.com/oauth/token?grant_type=refresh_token&refresh_token=" + refreshToken + "&client_id=8d604de2-62b8-426a-89f8-c1655f6f7c6c&client_secret=bexWfa8VMu6TJO79IV257g0h";

fetch(queryURL, {
	method: 'POST'
}).then(function (response) {
	if (response.ok) {
		return response.json();
	}
	return Promise.reject(response);
}).then(function (data) {
	console.log(data);
    
    // update refresh token
    refreshToken = data.refresh_token;

    // store for next use
    writeToken();
    
    // make request
    console.log("rest token: " + data.access_token);
    loginBH(data.access_token);

}).catch(function (error) {
	console.warn('Something went wrong w/access token: ', error);
});
}

function loginBH(accessToken) {

    let queryURL = "https://rest-emea.bullhornstaffing.com/rest-services/login?version=*&access_token=" + accessToken;
    console.log("access url: " + queryURL);

    fetch(queryURL, {
        method: 'POST'
    }).then(function (response) {
        if (response.ok) {
            return response.json();
        }
        return Promise.reject(response);
    }).then(function (data) {
        console.log(data);
        bhRestToken = data.BhRestToken;
        sendPost(bhRestToken);
    
    }).catch(function (error) {
        console.warn('Something went wrong w/login: ', error);
    });
}

function sendPost() {
  
  let queryURL = "https://rest21.bullhornstaffing.com/rest-services/8yh2c1/entity/Lead?BhRestToken=" + bhRestToken;
  console.log("got here: " + queryURL);

  fetch(queryURL, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
      body: JSON.stringify(
        {
          "owner": {
          "id": 14084
          },
             "firstName": "testfirst2",
             "lastName": "testlast2",
             "companyName": "test company name 2",
             "email": "test@testtest2.com",
             "phone": "111-222-3333",
             "preferredContact": "Email",
             "isDeleted": false,
                "status": "New Lead",
             "type": "Unknown"
          }
      )
  }).then(function (response) {
    console.log("bh response: " + response);

    if (response.ok) {
          return response.json();
      }
      return Promise.reject(response);
  }).then(function (data) {
      console.log(data);
  
  }).catch(function (error) {
      console.warn('Something went wrong w/request: ', error);
  });
}


// generates access token using refresh
readToken();

// login
// loginBH();