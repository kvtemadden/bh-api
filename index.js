var refreshToken, bhRestToken;
const fs = require('fs/promises');
const express = require('express');
const app = express();
require('dotenv').config();

var firstName, lastName, companyName, email, phone, preferredContact, leadSource, jobTitle, leadId, formData;

function getToken() {
// get new access token using refresh
let queryURL = "https://auth-emea.bullhornstaffing.com/oauth/token?grant_type=refresh_token&refresh_token=" + process.env.TOKEN + "&client_id=8d604de2-62b8-426a-89f8-c1655f6f7c6c&client_secret=bexWfa8VMu6TJO79IV257g0h";

// call to bullhorn to get access token
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
    process.env.TOKEN = refreshToken;
    console.log(process.env.TOKEN);
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
      // set new refresh value
      bhRestToken = data.BhRestToken;
          
      // send content to bh
      sendPost(bhRestToken);  

    }).catch(function (error) {
        console.warn('Something went wrong w/login: ', error);
    });
}

function sendPost() {
  
  let queryURL = "https://rest21.bullhornstaffing.com/rest-services/8yh2c1/entity/Lead?BhRestToken=" + bhRestToken;

  fetch(queryURL, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
      body: JSON.stringify(
        {
          "owner": {
          "id": 14084 // chris port account
          },
             "firstName": firstName,
             "lastName": lastName,
             "name": firstName + " " + lastName,
             "companyName": companyName,
             "email": email,
             "phone": phone,
             "preferredContact": preferredContact,
             "isDeleted": false,
                "status": "New Lead",
             "type": "Unknown",
             "leadSource": leadSource,
             "address": {
                "city": leadCity,
                "countryID": 2359
             },
             "role": jobTitle
          }
      )
  }).then(function (response) {
     
    if (response.ok) {
          return response.json();

      }
      return Promise.reject(response);
  }).then(function (data) {
    console.log(data);
    // lead to assign note to
    leadId = data.changedEntityId;
    
    // add note content (form content)
    addNote();
  
  }).catch(function (error) {
      console.warn('Something went wrong w/request: ', error);
  });
}

// adding note to the lead
function addNote() {
  let queryURL = "https://rest21.bullhornstaffing.com/rest-services/8yh2c1/entity/Note?BhRestToken=" + bhRestToken;

  fetch(queryURL, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
      body: JSON.stringify(
        {
          "commentingPerson": { "id" : 14084},
          "leads" : [ 
                      { "id" : leadId}
                      ],
          "comments": formData,
          "action": "Other",
          "personReference": { "id" : 14836}
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
      console.warn('Something went wrong w/note: ', error);
  });
}

app.use(express.json());

app.post('/api/receive', (req, res) => {
  const jsonData = req.body;

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
  leadCity = jsonData.leadCity;

  // generates access token using refresh
  getToken();

  res.json({
    message: 'JSON data received successfully!'
  });
});

app.listen(process.env.PORT || 3000, () => { 
  console.log("Express server listening"); 
});
