var refreshToken;
const fs = require('fs/promises');

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
console.log(queryURL);

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

    writeToken();

    // make request
    loginBH(data.access_token);

}).catch(function (error) {
	console.warn('Something went wrong w/access token: ', error);
});
}

function loginBH(accessToken) {

    let queryURL = "https://rest-emea.bullhornstaffing.com/rest-services/login?version=*&access_token=" + accessToken;

    fetch(queryURL, {
        method: 'POST'
    }).then(function (response) {
        if (response.ok) {
            return response.json();
        }
        return Promise.reject(response);
    }).then(function (data) {
        console.log(data);
    
    }).catch(function (error) {
        console.warn('Something went wrong w/login: ', error);
    });
}


// generates access token using refresh
readToken();

// login
loginBH();

// make update
// sendPost();