const { AccessReview } = require("../utils/functions/AccessReview");
const { PrismaClient } = require("@prisma/client");
const qs = require("qs");
const { logger } = require("../utils/logger");
const { default: axios } = require("axios");

const prisma = new PrismaClient();

const calendly = async (AccDetails) => {
  console.log("Inside Calendly checker");

  try {
    let token = AccDetails.Credentials.access_token;
    let users = await fetchUsersWithTokenRetry(token, AccDetails);

    // Extract and print emails
    let emailArray = users.map((member) => member.user.email);

    let calendlyChecks = AccessReview(AccDetails.Tenant_ID, emailArray);

    return calendlyChecks;
  } catch (error) {
    console.error("Error in Calendly function:", error);
    return null;
  }
};

const fetchUsersWithTokenRetry = async (access_token, AccDetails) => {
  let users = await getUsers(access_token);

  if (users === "expired_access_token") {
    console.log("Access token expired. Refreshing...");

    let newToken = await refreshCalendlyToken(AccDetails);
    if (!newToken) throw new Error("Failed to refresh Calendly token");

    console.log("Retrying user fetch with new token...");
    users = await getUsers(newToken);
  }

  return users;
};

const getUsers = async (access_token) => {
  try {
    const userResponse = await axios.get("https://api.calendly.com/users/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const organizationUri = userResponse.data.resource.current_organization;

    const usersResponse = await axios.get(
      "https://api.calendly.com/organization_memberships",
      {
        headers: { Authorization: `Bearer ${access_token}` },
        params: { organization: organizationUri },
      }
    );

    const data = usersResponse.data.collection;

    if (data.error && data.error[".tag"] === "expired_access_token") {
      return "expired_access_token"; // Indicating token expiration
    }

    return data; // Return users list
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("Calendly Access Token Expired.");
      return "expired_access_token";
    }
    console.error("Error fetching users:", error);
  }
};

const refreshCalendlyToken = async (AccDetails) => {
  console.log("Entered Refresh Token");
  try {
    // Fetch tool details from your database
    let ToolDetails = await prisma.AE_EXT_SYS.findUnique({
      where: { Ext_Sys_ID: 33 },
    });

    const CLIENT_ID = ToolDetails.Conn_Details.Client_ID;
    const CLIENT_SECRET = ToolDetails.Conn_Details.Client_Secret;

    const payload = qs.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: AccDetails.Credentials.refresh_token,
    });

    // Make the POST request with the correct headers
    const response = await axios.post(
      "https://auth.calendly.com/oauth/token",
      payload,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = response.data;

    // Update the access token (and refresh token if provided) in your database
    await prisma.AE_ACCOUNTS.update({
      where: { Acct_ID: AccDetails.Acct_ID },
      data: {
        Credentials: {
          access_token: data.access_token,
          refresh_token:
            data.refresh_token || AccDetails.Credentials.refresh_token,
        },
      },
    });
    return data.access_token;
  } catch (error) {
    logger.info(error, `error while refresh token`);
  }
};

module.exports = { calendly };
