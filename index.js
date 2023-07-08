var refreshToken, bhRestToken;
const fs = require('fs/promises');
const express = require('express');
const app = express();
require('dotenv').config();
const https = require('https');

var firstName, lastName, companyName, email, phone, preferredContact, leadSource, formData, status, leadCity;

function getToken() {
// get new access token using refresh
let queryURL = "https://auth-emea.bullhornstaffing.com/oauth/token?grant_type=refresh_token&refresh_token=" + process.env.TOKEN + "&client_id=" + process.env.CLIENT_ID + "&client_secret=" + process.env.CLIENT_SECRET;

// call to bullhorn to get access token
fetch(queryURL, {
	method: 'POST'
}).then(function (response) {

  if (response.ok) {
		return response.json();
	}
  
	return Promise.reject(response);

}).then(function (data) {

    // update refresh token
    refreshToken = data.refresh_token;

    // store for next use
    process.env.TOKEN = refreshToken;
    setVar();

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

      (data);
      // set new refresh value
      bhRestToken = data.BhRestToken;
          
      // send content to bh
      sendCompany(bhRestToken);  

    }).catch(function (error) {
        console.warn('Something went wrong w/login: ', error);
    });
}

const sendCompany = () => {
  const queryURL = `https://rest21.bullhornstaffing.com/rest-services/8yh2c1/entity/ClientCorporation?BhRestToken=${bhRestToken}`;
  console.log(JSON.stringify({
    "name": companyName,
    "numEmployees": 0,
    "annualRevenue": 0,
    "status": status,
    "address": {
      "city": leadCity,
      "countryID": 2359
    }
  }));
  fetch(queryURL, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "name": companyName,
      "numEmployees": 0,
      "annualRevenue": 0,
      "status": status,
      "address": {
        "city": leadCity,
        "countryID": 2359
      }
    })
  })    
    .then(response => {

      if (response.ok) {
        return response.json();
      }
      return Promise.reject(response);
    })
    .then(data => {
     // lead to assign note to
      corpID = data.changedEntityId;
     

      // add note content (form content)
      sendContact(corpID, bhRestToken);
    })
    .catch(error => {
      console.warn('Something went wrong w/company:', error);
    });
};


function sendContact(corpID, bhRestToken) {
let queryURL = "https://rest21.bullhornstaffing.com/rest-services/8yh2c1/entity/ClientContact?BhRestToken=" + bhRestToken;

  fetch(queryURL, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
      body: JSON.stringify(
        {
          "firstName": firstName,
          "lastName": lastName,
          "name": firstName + " " + lastName,
          "clientCorporation": { "id": corpID },
          "email": email,
          "phone": phone,
          "preferredContact": preferredContact,
          "isDeleted": false,
          "status": status,
          "type": "Unknown",
          "source": leadSource,
          "address": {
             "city": leadCity,
             "countryID": 2359
          },
          "customText1": gclid,
       }
      )
  }).then(function (response) {
     
    if (response.ok) {
          return response.json();

      }
      return Promise.reject(response);
  }).then(function (data) {
    (data);
    // lead to assign note to
    contactID = data.changedEntityId;
    
    // add note content (form content)
    addNote(bhRestToken, contactID);
  
  }).catch(function (error) {
      console.warn('Something went wrong w/request: ', error);
  });
}

// adding note to the lead
function addNote(bhRestToken, contactID) {
  let queryURL = "https://rest21.bullhornstaffing.com/rest-services/8yh2c1/entity/Note?BhRestToken=" + bhRestToken;
  console.log(JSON.stringify({
    "commentingPerson": { "id": 14084 },
    "clientContacts": [
      { "id": contactID }
    ],
    "comments": formData,
    "personReference": { "id": 14836 }
  }))
  fetch(queryURL, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "commentingPerson": { "id": 14084 },
        "clientContacts": [
          { "id": contactID }
        ],
        "comments": formData,
        "personReference": { "id": 14836 }
      })
  }).then(function(response) {
    console.log("bh response: ", response);

    if (response.ok) {
      return response.json();
    }
    return Promise.reject(response);
  }).then(function(data) {
    console.log(data);
  }).catch(function(error) {
    console.warn('Something went wrong w/note: ', error);
  });
}


app.use(express.json());

app.post('/api/receive', (req, res) => {
  const jsonData = req.body;
  console.log(jsonData);

  // assign content
  firstName = jsonData.firstName;
  lastName = jsonData.lastName;
  companyName = jsonData.companyName;
  email = jsonData.email;
  phone = jsonData.phone;
  preferredContact = jsonData.preferredContact;
  leadSource = jsonData.leadSource;
  jobTitle = jsonData.jobTitle;
  formData = jsonData.formData;
  leadCity = jsonData.city;
  status = jsonData.status;
  gclid = jsonData.gclid;

  // generates access token using refresh
  getToken();

  res.json({
    message: 'JSON data received successfully!'
  });
});

function setVar() {
const apiKey = process.env.API_KEY;
const appName = 'bh-api';

const configVars = {
  // Specify the config vars you want to update
  TOKEN: refreshToken,
};

const requestOptions = {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.heroku+json; version=3',
    'Authorization': `Bearer ${apiKey}`
  }
};

const request = https.request(`https://api.heroku.com/apps/${appName}/config-vars`, requestOptions, (response) => {
  let responseData = '';
  response.on('data', (data) => {
    responseData += data;
  });

  response.on('end', () => {
    ('Config vars updated successfully!');
  });
});

request.write(JSON.stringify(configVars));
request.end();
}



app.listen(process.env.PORT || 3001, () => { 
  ("Express server listening"); 
});

