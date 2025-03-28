var refreshToken, bhRestToken;
var express = require("express");
var app = express();
require("dotenv").config();
var https = require("https");
var WebflowClient = require("webflow-api");
const cron = require("node-cron");
const axios = require("axios");
const moment = require("moment");

var firstName,
  lastName,
  companyName,
  email,
  phone,
  preferredContact,
  leadSource,
  formData,
  status,
  leadCity;
var jobRef,
  salaryFrom,
  salaryTo,
  salaryPer,
  salaryBenefits,
  locationId,
  sectorId,
  jobTitle,
  jobSummary,
  jobDescription,
  jobTypeId,
  aplitrakEmail,
  url,
  exists,
  coburgJobCollection,
  coburgJobs,
  today;

// WEBFLOW INIT

var webflow = new WebflowClient({
  accessToken: process.env.WEBFLOW_TOKEN,
  accept: "application/json",
  "content-type": "application/json",
});

function getToken() {
  // get new access token using refresh
  let queryURL =
    "https://auth-emea.bullhornstaffing.com/oauth/token?grant_type=refresh_token&refresh_token=" +
    process.env.REFRESH_TOKEN +
    "&client_id=" +
    process.env.CLIENT_ID +
    "&client_secret=" +
    process.env.CLIENT_SECRET;

  // call to bullhorn to get access token
  fetch(queryURL, {
    method: "POST",
  })
    .then(function (response) {
      if (response.ok) {
        return response.json();
      }

      return Promise.reject(response);
    })
    .then(function (data) {
      // update refresh token
      refreshToken = data.refresh_token;

      // store for next use
      process.env.REFRESH_TOKEN = refreshToken;
      setVar();

      // make request
      loginBH(data.access_token);
    })
    .catch(function (error) {
      console.warn("Something went wrong w/access token: ", error);
    });
}

function loginBH(accessToken) {
  let queryURL =
    "https://rest-emea.bullhornstaffing.com/rest-services/login?version=*&access_token=" +
    accessToken;

  fetch(queryURL, {
    method: "POST",
  })
    .then(function (response) {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject(response);
    })
    .then(function (data) {
      data;
      // set new refresh value
      bhRestToken = data.BhRestToken;

      // send content to bh
      sendCompany(bhRestToken);
    })
    .catch(function (error) {
      console.warn("Something went wrong w/login: ", error);
    });
}

var sendCompany = () => {
  var queryURL = `https://rest21.bullhornstaffing.com/rest-services/8yh2c1/entity/ClientCorporation?BhRestToken=${bhRestToken}`;

  fetch(queryURL, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: companyName ?? "",
      numEmployees: 0,
      annualRevenue: 0,
      status: "Active",
      address: {
        city: leadCity ?? "",
        countryID: 2359,
      },
    }),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject(response);
    })
    .then((data) => {
      // lead to assign note to
      corpID = data.changedEntityId;

      // add note content (form content)
      sendContact(corpID, bhRestToken);
    })
    .catch((error) => {
      console.warn("Something went wrong w/company:", error);
    });
};

function sendContact(corpID, bhRestToken) {
  let queryURL =
    "https://rest21.bullhornstaffing.com/rest-services/8yh2c1/entity/ClientContact?BhRestToken=" +
    bhRestToken;

  fetch(queryURL, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstName: firstName,
      lastName: lastName,
      name: firstName + " " + lastName,
      clientCorporation: { id: corpID },
      email: email,
      phone: phone,
      preferredContact: preferredContact,
      isDeleted: false,
      status: "Lead - New",
      type: "Unknown",
      source: leadSource,
      address: {
        city: leadCity,
        countryID: 2359,
      },
      customText1: gclid,
    }),
  })
    .then(function (response) {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject(response);
    })
    .then(function (data) {
      data;
      // lead to assign note to
      contactID = data.changedEntityId;

      // add note content (form content)
      addNote(bhRestToken, contactID);
    })
    .catch(function (error) {
      console.warn("Something went wrong w/contact: ", error);
    });
}

// adding note to the lead
function addNote(bhRestToken, contactID) {
  let queryURL =
    "https://rest21.bullhornstaffing.com/rest-services/8yh2c1/entity/Note?BhRestToken=" +
    bhRestToken;

  fetch(queryURL, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      commentingPerson: { id: 13095 },
      clientContacts: [{ id: contactID }],
      comments: formData,
      personReference: { id: 16287 },
      action: status,
    }),
  })
    .then(function (response) {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject(response);
    })
    .then(function (data) {
      console.log(data);
    })
    .catch(function (error) {
      console.warn("Something went wrong w/note: ", error);
    });
}

app.use(express.json());

app.post("/api/receive", (req, res) => {
  var jsonData = req.body;
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
    message: "JSON data received successfully!",
  });
});

function setVar() {
  var apiKey = process.env.API_KEY;
  var appName = "bh-api";

  var configVars = {
    TOKEN: refreshToken,
  };

  var requestOptions = {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.heroku+json; version=3",
      Authorization: `Bearer ${apiKey}`,
    },
  };

  var request = https.request(
    `https://api.heroku.com/apps/${appName}/config-vars`,
    requestOptions,
    (response) => {
      let responseData = "";
      response.on("data", (data) => {
        responseData += data;
      });

      response.on("end", () => {
        ("Config vars updated successfully!");
      });
    }
  );

  request.write(JSON.stringify(configVars));
  request.end();
}

// WEBFLOW

async function checkWebflowItem() {
  const options = {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + process.env.WEBFLOW_TOKEN,
    },
  };

  coburgJobCollection = await fetch(
    `https://api.webflow.com/v2/collections/${process.env.WEBFLOW_CB_COLLECTION_ID}/items`,
    options
  )
    .then((res) => res.json())
    .then((json) => {
      coburgJobs = json.items;
    })
    .catch((err) => {
      console.error("error:" + err);
      return null;
    });

  // if job exists in coburg site based on comparison of job title, job salary and job location, return true
  var coburgJobExists = coburgJobs.some((coburgJob) => {
    return (
      coburgJob.title === jobTitle &&
      coburgJob.salaryFrom === salaryFrom &&
      coburgJob.locationId === locationId
    );
  });

  exists = coburgJobExists;
}

async function createWebflowItem() {
  if (!exists) {
    var url = `https://api.webflow.com/v2/collections/${process.env.WEBFLOW_CB_COLLECTION_ID}/items?live=true`;

    const itemSlug =
      jobTitle
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "")
        .toLowerCase() +
      "-" +
      Math.floor(Math.random() * 1000);

    var options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${process.env.WEBFLOW_TOKEN}`,
      },
      body: JSON.stringify({
        fieldData: {
          name: jobTitle,
          _archived: false,
          _draft: false,
          salary: `£${salaryFrom} - £${salaryTo}`,
          location: locationId,
          sector: sectorId,
          "job-description": jobDescription,
          "job-type":
            jobTypeId === 1
              ? "Permanent"
              : jobTypeId === 2
              ? "Contract"
              : jobTypeId === 3
              ? "Temporary"
              : "Permanent",
          "reply-email-address": aplitrakEmail,
          "job-reference-number": jobRef,
          "date-published": today,
          slug: itemSlug,
        },
      }),
    };

    return fetch(url, options)
      .then((res) => res.json())
      .then((json) => {
        publishWebflowItem(json.id);

        return {
          url: itemSlug,
          id: json.id,
          site: "coburgbanks",
        };
      })
      .catch((err) => {
        console.error("error:" + err);
        return null;
      });
  }
}

// SEND TO TEMPS

async function createTempsJob() {
  if (!exists && sectorId === "Social Care") {
    const itemSlug =
      jobTitle.replace(/\s+/g, "-").toLowerCase() +
      "-" +
      Math.floor(Math.random() * 1000);

    var url = `https://api.webflow.com/v2/collections/${process.env.WEBFLOW_T4C_COLLECTION_ID}/items?live=true`;

    var options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${process.env.WEBFLOW_TOKEN_T4C}`,
      },
      body: JSON.stringify({
        fields: {
          name: jobTitle,
          _archived: false,
          _draft: false,
          salary: `£${salaryFrom} - £${salaryTo}`,
          location: locationId,
          sector: sectorId,
          "job-description": jobDescription,
          "job-type":
            jobTypeId === 1
              ? "Permanent"
              : jobTypeId === 2
              ? "Contract"
              : "Temporary",
          "reply-email-address": aplitrakEmail,
          "job-reference-number": jobRef,
          "date-published": today,
          slug: itemSlug,
        },
      }),
    };

    return fetch(url, options)
      .then((res) => res.json())
      .then((json) => {
        publishWebflowItem(json.id);

        return {
          url: itemSlug,
          id: json.id,
          site: "temps4care",
        };
      })
      .catch((err) => {
        console.error("error:" + err);
        return null;
      });
  }
}

// PUBLISH WEBFLOW ITEM

async function publishWebflowItem(itemId) {
  try {
    const url = `https://api.webflow.com/v2/collections/${process.env.WEBFLOW_CB_COLLECTION_ID}/items/publish`;
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${process.env.WEBFLOW_TOKEN}`,
      },
      body: JSON.stringify({
        itemIds: [itemId],
      }),
    };

    await fetch(url, options)
      .then((res) => res.json())
      .then((json) => {
        return "Published successfully";
      })
      .catch((err) => {
        console.error("error:" + err);
        return null;
      });
  } catch (error) {
    throw new Error("Error publishing collection item:", error);
  }
}

// BROADBEAN

app.use(express.urlencoded({ extended: true }));

app.post("/api/broadbean", async (req, res) => {
  var jobData = req.body === {} ? req.query : req.body;
  jobRef = jobData.job_ref;
  salaryFrom = jobData.salary_from;
  salaryTo = jobData.salary_to;
  salaryPer = jobData.salary_per;
  salaryBenefits = jobData.salary_benefits;
  locationId = jobData.location_id;
  sectorId = jobData.sector_id;
  jobTitle = jobData.job_title;
  jobSummary = jobData.job_summary;
  jobDescription = jobData.job_description;
  jobTypeId = jobData.job_type_id;
  aplitrakEmail = jobData.aplitrak_email;
  today = moment.utc().format();

  if (!jobTitle) throw new Error("Job title is required");

  await checkWebflowItem();
  const createdWebflowUrl = await createWebflowItem();
  createTempsJob();

  if (createdWebflowUrl) {
    url = createdWebflowUrl.url;
    id = createdWebflowUrl.id;
    site = createdWebflowUrl.site;

    var zapier = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: id,
        title: jobTitle,
        site: "coburgbanks",
      }),
    };

    fetch(process.env.ZAPIER_WEBHOOK, zapier);
  } else {
    res.status(500).json({
      error: "An error occurred while creating the item in Webflow.",
    });
    return;
  }

  res.json({
    message: "Job data received successfully!",
    url: "https://www.coburgbanks.co.uk/job-opportunities/" + url,
  });
});

cron.schedule("0 0 * * *", async () => {
  try {
    await archiveItemsOlderThan28Days(
      `https://api.webflow.com/v2/collections/${process.env.WEBFLOW_CB_COLLECTION_ID}/items`,
      process.env.WEBFLOW_TOKEN
    );
    console.log("Archived items older than 28 days - CB");
  } catch (error) {
    console.error(error);
  }

  try {
    await archiveItemsOlderThan28Days(
      `https://api.webflow.com/v2/collections/${process.env.WEBFLOW_T4C_COLLECTION_ID}/items`,
      process.env.WEBFLOW_TOKEN_T4C
    );
    console.log("Archived items older than 28 days - T4C");
  } catch (error) {
    console.error(error);
  }
});

// WEBFLOW - REMOVE AFTER 28 DAYS

async function archiveItemsOlderThan28Days(link, wft) {
  try {
    const url = link;
    const headers = {
      accept: "application/json",
      authorization: `Bearer ${wft}`,
    };
    const response = await axios.get(url, { headers });
    const items = response.data.items;

    // Calculate the date 28 days ago
    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    // Filter and update items that are older than 28 days
    for (const item of items) {
      const publishedOn = new Date(item.published_on);
      if (publishedOn <= twentyEightDaysAgo) {
        await archiveItem(item._id, link, wft);
      }
    }
  } catch (error) {
    throw new Error("Error fetching or archiving collection items:", error);
  }
}

async function archiveItem(itemId, link, wft) {
  try {
    const url = link + itemId;
    const headers = {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${process.env.WEBFLOW_TOKEN}`,
    };
    const data = {
      fields: {
        _archived: true,
      },
    };
    await axios.patch(url, data, { headers });
  } catch (error) {
    throw new Error("Error archiving collection item:", error);
  }
}

app.listen(process.env.PORT || 3001, () => {
  ("Express server listening");
});
