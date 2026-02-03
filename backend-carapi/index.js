import express from "express";
import axios from "axios"; // Changed from fetch to axios
import cors from "cors";
import jsforce from "jsforce";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
// import mysql from "mysql2/promise"; // Import MySQL with promise support
import sgMail from "@sendgrid/mail"; // Import SendGrid
dotenv.config();
const app = express();
const BASE_URL = process.env.BASE_URL;

const API_TOKEN = process.env.API_TOKEN;
const API_SECRET = process.env.API_SECRET;

// SendGrid Configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_VERIFIED_EMAIL = "noreply@befer.co";
const LEAD_NOTIFICATION_EMAIL = "Leads@thecartrackers.com";
const SECOND_LEAD_NOTIFICATION_EMAIL = "hatzs001@gmail.com"; // Add new email recipient

// Initialize SendGrid
sgMail.setApiKey(SENDGRID_API_KEY);

// Variable to store the JWT token
let jwtToken = null;

// MySQL Database Configuration
// const dbConfig = {
//   host: "mainline.proxy.rlwy.net",
//   user: "root",
//   password: "GReCoHcLdsduQszHuUgsuekNWxrGlDBY",
//   port: 56234,
//   database: "railway",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// };

// Create a connection pool
// const pool = mysql.createPool(dbConfig);

// Initialize database tables if they don't exist
// async function initializeDatabase() {
//   try {
//     const connection = await pool.getConnection();

//     // Create error_logs table
//     await connection.query(`
//       CREATE TABLE IF NOT EXISTS error_logs (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         error_message TEXT NOT NULL,
//         error_stack TEXT,
//         timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         endpoint VARCHAR(255),
//         request_data JSON
//       )
//     `);

//     // Create lead_information table
//     await connection.query(`
//       CREATE TABLE IF NOT EXISTS lead_information (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         salesforce_id VARCHAR(255),
//         first_name VARCHAR(255),
//         last_name VARCHAR(255),
//         email VARCHAR(255),
//         phone VARCHAR(50),
//         source VARCHAR(255),
//         vehicle_year VARCHAR(20),
//         vehicle_make VARCHAR(100),
//         vehicle_model VARCHAR(100),
//         vehicle_trim VARCHAR(100),
//         vin VARCHAR(50),
//         submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         form_data JSON
//       )
//     `);

//     connection.release();
//     console.log("Database tables initialized successfully");
//   } catch (error) {
//     console.error("Error initializing database:", error);
//   }
// }

// Initialize database on startup
// initializeDatabase();

// Function to log errors to MySQL
// async function logError(error, endpoint = "", requestData = {}) {
//   try {
//     await pool.query(
//       "INSERT INTO error_logs (error_message, error_stack, endpoint, request_data) VALUES (?, ?, ?, ?)",
//       [
//         error.message || "Unknown error",
//         error.stack || "",
//         endpoint,
//         JSON.stringify(requestData),
//       ]
//     );
//     console.log("Error logged to database");
//   } catch (dbError) {
//     console.error("Error logging to database:", dbError);
//   }
// }

// Function to store lead information in MySQL
// async function storeLead(leadData, salesforceId = null, formData = {}) {
//   try {
//     await pool.query(
//       `INSERT INTO lead_information
//        (salesforce_id, first_name, last_name, email, phone, source,
//         vehicle_year, vehicle_make, vehicle_model, vehicle_trim, vin, form_data)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         salesforceId,
//         leadData.firstName || leadData.FirstName || "",
//         leadData.lastName || leadData.LastName || "",
//         leadData.email || leadData.Email || "",
//         leadData.phone || leadData.Phone || "",
//         leadData.source || leadData.LeadSource || "",
//         leadData.year || leadData.Year__c || "",
//         leadData.make || leadData.Make__c || "",
//         leadData.model || leadData.Model__c || "",
//         leadData.trim || leadData.Trim__c || "",
//         leadData.vin || leadData.VIN__c || "",
//         JSON.stringify(formData),
//       ]
//     );
//     console.log("Lead stored in database");
//   } catch (dbError) {
//     console.error("Error storing lead in database:", dbError);
//     await logError(dbError, "storeLead", formData);
//   }
// }

// Function to format phone numbers as (XXX) XXX-XXXX
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return "";

  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // Check if we have enough digits
  if (digitsOnly.length < 10) return phoneNumber; // Return original if not enough digits

  // Format as (XXX) XXX-XXXX
  return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(
    3,
    6
  )}-${digitsOnly.slice(6)}`;
}

// Format phone to E.164 (e.g. +1XXXXXXXXXX)
function formatPhoneE164(phoneNumber) {
  if (!phoneNumber) return "";
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  if (digitsOnly.length < 10) return phoneNumber;
  const normalized = digitsOnly.length === 10 ? `1${digitsOnly}` : digitsOnly;
  return `+${normalized}`;
}

const RAILWAY_LEADS_URL =
  "https://abundant-miracle-production.up.railway.app/api/v1/leads";

// Build Abundant Miracles payload from form data. formData can be flat (submit-form) or nested (chatbot).
// vehicleOverrides: optional { year, make, model, trim, vin } from VIN/license lookup (chatbot).
function buildRailwayPayload(formData, fromChatbot = false, vehicleOverrides = {}) {
  const get = (flat, nested) =>
    fromChatbot ? nested : flat;
  const firstName = get(formData.firstName, formData.contact?.first_name);
  const lastName = get(formData.lastName, formData.contact?.last_name);
  const email = get(formData.email, formData.contact?.email);
  const phone = get(formData.phone, formData.contact?.phone);
  const year = get(formData.year, formData.vehicle?.year) || vehicleOverrides.year || "";
  const make = get(formData.make, formData.vehicle?.make) || vehicleOverrides.make || "";
  const model = get(formData.model, formData.vehicle?.model) || vehicleOverrides.model || "";
  const trim = get(formData.trim, formData.vehicle?.trim) || vehicleOverrides.trim || "";
  const vin = get(formData.vin, formData.vehicle?.vin) || vehicleOverrides.vin || "";
  const mileage = get(formData.mileage, formData.vehicle?.mileage);
  const zip = get(formData.zip, formData.vehicle?.zip || formData.vehicle?.car_location);
  const state = get(formData.state, formData.vehicle?.state);
  const title = get(formData.title, formData.vehicle?.title);
  const titleInName = get(formData.titleInName, formData.vehicle?.titleInName);
  const accident = get(formData.accident, formData.vehicle?.accident);
  const drivable = get(formData.drivable, formData.vehicle?.drivable);
  const repainted = get(formData.repainted, formData.vehicle?.repainted);
  let source = get(formData.source, formData.lead?.source) || "Manual";
  if (source === "thecartrackers.com") source = "CT website";
  const subLeadSource = get(formData.subLeadSource, formData.lead?.subLeadSource);
  if (subLeadSource) source = `${source} ${subLeadSource}`.trim();
  const vehicleStr = [year, make, model, trim].filter(Boolean).join(" ");
  const carLocation = zip || state || "";

  return {
    firstName: firstName || "",
    lastName: lastName || "",
    email: email || "",
    phone: formatPhoneE164(phone),
    vehicleYear: year || "",
    vehicleMake: make || "",
    vehicleModel: model || "",
    vehicleTrim: trim || "",
    year: year || "",
    make: make || "",
    model: model || "",
    trim: trim || "",
    vin: vin || "",
    mileage: mileage || "",
    zipCode: zip || "",
    title: title || "",
    titleOnName: titleInName || "",
    accident: accident || "",
    drivable: drivable || "",
    painted: repainted || "",
    vehicle: vehicleStr,
    carLocation,
    source,
    lead_type: "buying",
    status: "new",
    leadFormId: 70,
  };
}

// Send lead to Abundant Miracles (Railway). Does not throw; logs errors.
async function sendLeadToRailway(formData, fromChatbot = false, vehicleOverrides = {}) {
  try {
    const payload = buildRailwayPayload(formData, fromChatbot, vehicleOverrides);
    await axios.post(RAILWAY_LEADS_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("Lead sent to Abundant Miracles (Railway)");
  } catch (error) {
    console.error("Abundant Miracles (Railway) lead send error:", error?.response?.data || error.message);
  }
}

// Configure multer for file storage
// Use memory storage for Vercel serverless environment
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

app.use(cors({ origin: "*" })); // Allow requests from your origin
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function for Salesforce authentication
async function getSalesforceConnection() {
  const conn = new jsforce.Connection({
    loginUrl: "https://login.salesforce.com",
  });

  try {
    // Authenticate
    await conn.login(
      process.env.SALESFORCE_USERNAME,
      process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
    );

    return conn;
  } catch (error) {
    console.error("Salesforce Authentication Error:", error);
    throw error;
  }
}

async function createSalesforceLead(formData) {
  try {
    // Get authenticated connection
    const conn = await getSalesforceConnection();

    // Format the phone number
    const formattedPhone = formatPhoneNumber(formData.phone);

    // Create Lead
    // Only include fields if they are present in formData (make all fields optional)
    const leadPayload = {
      // Basic Contact Information
      ...(formData.firstName && { FirstName: formData.firstName }),
      ...(formData.lastName && { LastName: formData.lastName }),
      ...(formData.email && { Email: formData.email }),
      ...(formData.phone && { Phone: formattedPhone }),
      ...(formData.phone && { MobilePhone: formattedPhone }),
      Company: "CarTracker", // Company is still required by Salesforce

      // Vehicle Information
      ...(formData.year && { Year__c: formData.year }),
      ...(formData.make && { Make__c: formData.make }),
      ...(formData.model && { Model__c: formData.model }),
      ...(formData.trim && { Trim__c: formData.trim }),
      ...(formData.vin && { VIN__c: formData.vin }),

      // Additional Vehicle Details
      ...(formData.mileage && { Mileage__c: formData.mileage }),
      ...(formData.zip && { Zip_Code__c: formData.zip }),
      ...(formData.title && { Title: formData.title }),
      ...(formData.titleInName && { Ownership_Type__c: formData.titleInName }),
      ...(formData.licensePlate && { License_Plate__c: formData.licensePlate }),
      ...(formData.state && { State__c: formData.state }),

      // Vehicle Condition
      ...(formData.accident && { Accident__c: formData.accident }),
      ...(formData.drivable && { Operable_Status__c: formData.drivable }),
      ...(formData.repainted && { Repaint__c: formData.repainted }),
      ...(formData.source && { LeadSource: formData.source }),
      ...(formData.subLeadSource && {
        Sub_Lead_Source__c: formData.subLeadSource,
      }),

      ...(formData.alternatePhone && {
        Alternate_Phone_number__c: formData.alternatePhone,
      }),

      // Default Lead Status
      Status: "New",
    };

    const leadResult = await conn.sobject("Lead").create(leadPayload);

    console.log("Salesforce Lead Created:", leadResult);

    // Store lead information in MySQL
    // await storeLead(formData, leadResult.id, formData);

    // Send email notification
    await sendLeadNotificationEmail(formData, formData, leadResult.id);

    // Send lead to Abundant Miracles (Railway)
    await sendLeadToRailway(formData, false);

    return leadResult;
  } catch (error) {
    console.error("Salesforce Lead Creation Error:", error);
    // Log error to MySQL
    // await logError(error, "createSalesforceLead", formData);
    throw error;
  }
}

// Function to get JWT token
const authenticate = async () => {
  if (!jwtToken) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        api_token: API_TOKEN,
        api_secret: API_SECRET,
      });
      jwtToken = response.data; // Assuming the token is returned as plain text
      console.log("JWT Token obtained successfully");
    } catch (error) {
      console.error("Error during authentication:", error);
    }
  }
};

// Middleware to ensure authentication
app.use(async (req, res, next) => {
  if (!jwtToken) {
    await authenticate();
  }
  next();
});

// Function to fetch data with JWT
const fetchDataWithAuth = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("Token expired or invalid. Re-authenticating...");
      jwtToken = null; // Reset token
      await authenticate(); // Re-authenticate
      return fetchDataWithAuth(url); // Retry the request
    }
    console.error("Error fetching data:", error);
    throw error;
  }
};

// Endpoint for fetching trims by ID
app.get("/trims/:id", async (req, res) => {
  const { id } = req.params;

  try {
    let data = await fetchDataWithAuth(`${BASE_URL}/trims/${id}`);
    res.json(data); // Send vehicle data
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vehicle data by trim ID" });
  }
});

// Other endpoints
app.get("/years", async (req, res) => {
  try {
    const data = await fetchDataWithAuth(`${BASE_URL}/years`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch years from CarAPI" });
  }
});

app.get("/makes", async (req, res) => {
  const { year } = req.query;
  try {
    const data = await fetchDataWithAuth(`${BASE_URL}/makes?year=${year}`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch makes from CarAPI" });
  }
});

app.get("/models", async (req, res) => {
  const { year, make_id } = req.query;
  try {
    const data = await fetchDataWithAuth(
      `${BASE_URL}/models?year=${year}&make_id=${make_id}`
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch models from CarAPI" });
  }
});

app.get("/vin/:vin", async (req, res) => {
  const { vin } = req.params;
  const { verbose = "no", all_trims = "no" } = req.query; // Optional query parameters
  try {
    const url = `${BASE_URL}/vin/${vin}?verbose=${verbose}&all_trims=${all_trims}`;
    const data = await fetchDataWithAuth(url);
    res.json(data); // Send VIN details
  } catch (error) {
    console.error("Error fetching VIN details:", error);
    res.status(500).json({ error: "Failed to fetch VIN details" });
  }
});

app.get("/trims", async (req, res) => {
  const { year, make_id, make_model_id } = req.query;
  try {
    const data = await fetchDataWithAuth(
      `${BASE_URL}/trims?year=${year}&make_id=${make_id}&make_model_id=${make_model_id}`
    );

    res.json(data);
  } catch (error) {
    console.log(error);

    res.status(500).json({ error: "Failed to fetch trims from CarAPI" });
  }
});

app.get("/license-plate", async (req, res) => {
  const { country_code, lookup, region } = req.query;

  if (!country_code || !lookup) {
    return res.status(400).json({
      error: "Missing required parameters: 'country_code' and 'lookup'",
    });
  }

  try {
    const url = `${BASE_URL}/license-plate?country_code=${country_code}&lookup=${lookup}${
      region ? `&region=${region}` : ""
    }`;
    const data = await fetchDataWithAuth(url);
    res.json(data); // Send vehicle data
  } catch (error) {
    console.error("Error fetching license plate details:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch license plate details from CarAPI" });
  }
});

app.post("/api/submit-form", async (req, res) => {
  try {
    const formData = req.body;

    console.log("Complete Form Submission:", {
      // First form data
      vehicle: {
        year: formData.year,
        make: formData.make,
        model: formData.model,
        trim: formData.trim,
        vin: formData.vin,
        licensePlate: formData.licensePlate,
        state: formData.state,
      },
      // Extended form data
      vehicleInfo: {
        mileage: formData.mileage,
        zipCode: formData.zip,
        title: formData.title,
        titleInName: formData.titleInName,
      },
      vehicleCondition: {
        accident: formData.accident,
        drivable: formData.drivable,
        repainted: formData.repainted,
      },
      contactInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
      },
      source: formData.source, // Include the source in the log
      subLeadSource: formData.subLeadSource, // Include the subLeadSource in the log
    });

    // Create Salesforce Lead using our reusable function
    const salesforceLead = await createSalesforceLead(formData);

    res.json({
      success: true,
      message: "Form data received and lead created in Salesforce",
      salesforceLeadId: salesforceLead.id,
    });
  } catch (error) {
    console.error("Error processing form submission:", error);
    // Log error to MySQL
    // await logError(error, "/api/submit-form", req.body);

    res.status(500).json({
      error: "Failed to process form submission and create Salesforce lead",
      details: error.message,
    });
  }
});

// File upload endpoint for chatbot
app.post(
  "/api/upload-chatbot-files",
  upload.fields([
    { name: "vehicle_photos", maxCount: 5 },
    { name: "dealer_offer", maxCount: 2 },
  ]),
  async (req, res) => {
    try {
      const files = req.files;
      const fileData = {};

      // Process vehicle photos
      if (files.vehicle_photos) {
        fileData.vehicle_photos = files.vehicle_photos.map((file) => ({
          filename: file.originalname,
          buffer: file.buffer,
          type: file.mimetype,
          size: file.size,
        }));
      }

      // Process dealer offer files
      if (files.dealer_offer) {
        fileData.dealer_offer = files.dealer_offer.map((file) => ({
          filename: file.originalname,
          buffer: file.buffer,
          type: file.mimetype,
          size: file.size,
        }));
      }

      res.json({
        success: true,
        message: "Files uploaded successfully",
        files: fileData,
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({
        error: "Failed to upload files",
        details: error.message,
      });
    }
  }
);

// Consolidated endpoint for chatbot form submissions
app.post("/api/submit-chatbot-form", async (req, res) => {
  try {
    const formData = req.body;

    console.log("Chatbot Form Submission:", formData);

    // Get vehicle details from various sources
    let vehicleDetails = {};
    const vin = formData.vehicle?.vin || "";
    const licensePlate = formData.vehicle?.license_plate || "";
    const state = formData.vehicle?.state || "";

    // First try VIN lookup if available
    if (vin) {
      try {
        console.log(`Looking up VIN details for: ${vin}`);
        const url = `${BASE_URL}/vin/${vin}?verbose=yes`;
        vehicleDetails = await fetchDataWithAuth(url);
        console.log("VIN lookup results:", vehicleDetails);
      } catch (vinError) {
        console.error("Error looking up VIN details:", vinError);
        // Log error to MySQL
        // await logError(vinError, "VIN lookup", { vin });
        // Continue with form submission even if VIN lookup fails
      }
    }
    // If no VIN but license plate and state are available, try license plate lookup
    else if (licensePlate && state) {
      try {
        console.log(
          `Looking up license plate details for: ${licensePlate}, state: ${state}`
        );
        const url = `${BASE_URL}/license-plate?country_code=US&region=${state}&lookup=${licensePlate}`;
        const plateData = await fetchDataWithAuth(url);
        console.log("License plate lookup results:", plateData);

        if (plateData && !plateData.error) {
          vehicleDetails = plateData;
          // If license plate lookup provides VIN but we don't have one, use it
          if (plateData.vin && !vin) {
            formData.vehicle = formData.vehicle || {};
            formData.vehicle.vin = plateData.vin;
          }
        }
      } catch (plateError) {
        console.error("Error looking up license plate details:", plateError);
        // Log error to MySQL
        // await logError(plateError, "License plate lookup", {
        //   licensePlate,
        //   state,
        // });
        // Continue with form submission even if license plate lookup fails
      }
    }

    // Extract data from the nested structure
    const leadData = {
      // Lead source information
      LeadSource: formData.lead?.source || "Website Chatbot",
      Status: formData.lead?.status || "New",

      // Set CreatedDate as current time in Anaheim timezone (America/Los_Angeles)
      CreatedDate: (() => {
        const now = new Date();
        // Get date components in Anaheim timezone (America/Los_Angeles)
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        const parts = formatter.formatToParts(now);
        const year = parts.find((p) => p.type === "year").value;
        const month = parts.find((p) => p.type === "month").value;
        const day = parts.find((p) => p.type === "day").value;
        const hour = parts.find((p) => p.type === "hour").value;
        const minute = parts.find((p) => p.type === "minute").value;
        const second = parts.find((p) => p.type === "second").value;

        // Calculate timezone offset by formatting date in both UTC and Anaheim timezone
        const utcFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        const utcParts = utcFormatter.formatToParts(now);
        const utcHour = parseInt(utcParts.find((p) => p.type === "hour").value);
        const utcMinute = parseInt(
          utcParts.find((p) => p.type === "minute").value
        );
        const anaheimHour = parseInt(hour);
        const anaheimMinute = parseInt(minute);

        // Calculate offset: America/Los_Angeles is UTC-8 (PST) or UTC-7 (PDT)
        // Determine offset by comparing UTC and Anaheim times
        let offsetMinutes =
          anaheimHour * 60 + anaheimMinute - (utcHour * 60 + utcMinute);

        // Normalize offset to -8 or -7 hours range (accounting for date boundaries)
        // If offset is positive and large, subtract 24 hours (e.g., +16 becomes -8)
        // If offset is very negative, add 24 hours to get into valid range
        if (offsetMinutes > 12 * 60) offsetMinutes -= 24 * 60;
        if (offsetMinutes < -12 * 60) offsetMinutes += 24 * 60;

        // Format offset (America/Los_Angeles is always negative: UTC-8 or UTC-7)
        const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
        const offsetMins = Math.abs(offsetMinutes % 60);
        const offsetSign = "-";

        // Construct ISO string with timezone offset
        const anaheimDateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        return `${anaheimDateStr}${offsetSign}${String(offsetHours).padStart(
          2,
          "0"
        )}:${String(offsetMins).padStart(2, "0")}`;
      })(),

      // Contact information - with fallbacks for required fields
      FirstName: formData.contact?.first_name || "Unknown",
      LastName: formData.contact?.last_name || "Unknown", // Required field

      // Format and use phone number for both Phone and MobilePhone
      Phone: formatPhoneNumber(formData.contact?.phone || ""),
      MobilePhone: formatPhoneNumber(formData.contact?.phone || ""),

      Email: formData.contact?.email || "",
      Company:
        formData.contact?.company ||
        `${formData.contact?.full_name || "Unknown"} Website Chatbot`,

      // Vehicle information - only essential fields
      VIN__c: formData.vehicle?.vin || vehicleDetails.vin || "",
      Mileage__c: formData.vehicle?.mileage || "",
      Desired_Price__c: formData.vehicle?.desired_price
        ? (() => {
            // Convert to string, trim whitespace, remove currency symbols and commas
            const priceStr = String(formData.vehicle.desired_price)
              .trim()
              .replace(/[$,]/g, "");
            // Return empty string if result is not a valid number, otherwise return cleaned value
            return priceStr && !isNaN(priceStr) && priceStr !== ""
              ? priceStr
              : "";
          })()
        : "",

      // Essential vehicle details from lookup
      Year__c: formData.vehicle?.year || vehicleDetails.year || "",
      Make__c: formData.vehicle?.make || vehicleDetails.make || "",
      Model__c: formData.vehicle?.model || vehicleDetails.model || "",
      Trim__c: formData.vehicle?.trim || vehicleDetails.trim || "",

      // License plate information
      License_Plate__c: formData.vehicle?.license_plate || "",
      State__c: formData.vehicle?.state || "",

      // Car location information - map to both fields
      ...(formData.vehicle?.car_location && {
        Car_Location__c: formData.vehicle.car_location,
      }),

      // Appointment information - format as local time to preserve intended appointment time
      Appointment_Request_Date_Time__c: formData.appointment?.requested_time
        ? (() => {
            const datetimeStr = formData.appointment.requested_time;
            // Convert "2025-09-26 15:00" to "2025-09-26T15:00:00" and treat as local time
            const isoFormat = datetimeStr.replace(" ", "T") + ":00";
            // Create a Date object to get timezone offset, then format to preserve local time
            const tempDate = new Date(isoFormat);
            const offset = tempDate.getTimezoneOffset();
            const offsetHours = Math.abs(Math.floor(offset / 60));
            const offsetMinutes = Math.abs(offset % 60);
            const offsetSign = offset > 0 ? "-" : "+";
            const timezoneOffset = `${offsetSign}${String(offsetHours).padStart(
              2,
              "0"
            )}:${String(offsetMinutes).padStart(2, "0")}`;
            return isoFormat + timezoneOffset;
          })()
        : null,

      // Private party URL information
      ...(formData.vehicle?.private_party_url && {
        Private_Party_URL__c: formData.vehicle.private_party_url,
      }),
    };

    console.log("Salesforce Lead Data:", leadData);

    // Get authenticated connection
    const conn = await getSalesforceConnection();

    let leadResult;

    // First try to create the lead
    try {
      leadResult = await conn.sobject("Lead").create(leadData);

      // Store lead information in MySQL
      // await storeLead(leadData, leadResult.id, formData);

      // Send email notification
      await sendLeadNotificationEmail(leadData, formData, leadResult.id);
    } catch (error) {
      console.error("Error creating lead:", error);
      // Log error to MySQL
      // await logError(error, "create lead", leadData);
      throw error;
    }

    // Send lead to Abundant Miracles (Railway), with vehicle details from VIN/plate lookup if available
    await sendLeadToRailway(formData, true, {
      year: vehicleDetails.year,
      make: vehicleDetails.make,
      model: vehicleDetails.model,
      trim: vehicleDetails.trim,
      vin: vehicleDetails.vin,
    });

    console.log("Salesforce Chatbot Lead Created/Updated:", leadResult);

    res.json({
      success: true,
      message:
        "Chatbot form data received and lead created/updated in Salesforce",
      salesforceLeadId: leadResult.id,
      parsedData: formData, // Return parsed data to client for verification
      vehicleDetails: vehicleDetails, // Return the looked up vehicle details
    });
  } catch (error) {
    console.error("Error processing chatbot form submission:", error);
    // Log error to MySQL
    // await logError(error, "/api/submit-chatbot-form", req.body);

    res.status(500).json({
      error: "Failed to process chatbot form submission",
      details: error.message,
      stack: error.stack,
    });
  }
});

app.get("/manheim", async (req, res) => {
  try {
    const response = await axios.post(
      process.env.MANHEIM_ENDPOINT,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${process.env.MANHEIM_AUTH}`,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching Manheim data:", error);
    res.status(500).json({ error: "Failed to fetch Manheim data" });
  }
});

// Export the app for Vercel serverless functions
export default app;

// Only start the server if not in Vercel environment
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(process.env.PORT || 3000, (err) => {
    console.log(err || `Server running on port ${process.env.PORT || 3000}`);
  });
}

// Add a health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Check database connection
    // const connection = await pool.getConnection();
    // await connection.ping();
    // connection.release();

    res.json({
      status: "ok",
      database: "disconnected", // Changed to disconnected as MySQL is commented out
      message: "System is healthy",
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// Add a direct error logging endpoint for client-side errors
app.post("/api/log-error", async (req, res) => {
  try {
    const { message, stack, source, lineNumber, columnNumber, url } = req.body;

    // Create structured error object
    const errorObj = {
      message: message || "Client error",
      stack: stack || "",
      source,
      lineNumber,
      columnNumber,
      url,
    };

    // Log to MySQL
    // await logError(errorObj, "client-side", req.body);

    res.json({ success: true, message: "Error logged successfully" });
  } catch (error) {
    console.error("Failed to log client error:", error);
    res.status(500).json({ success: false, message: "Failed to log error" });
  }
});

// Global error handler middleware - should be the last middleware
app.use((err, req, res, next) => {
  console.error("Unhandled application error:", err);

  // Log to MySQL
  // logError(err, req.path, {
  //   method: req.method,
  //   path: req.path,
  //   query: req.query,
  //   body: req.body,
  //   headers: req.headers,
  // }).catch((logErr) => {
  //   console.error("Failed to log error to database:", logErr);
  // });

  // Send error response
  res.status(500).json({
    error: "Something went wrong",
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

// Function to send lead notification emails
async function sendLeadNotificationEmail(
  leadData,
  formData,
  salesforceId = null
) {
  try {
    // Format vehicle information
    const vehicleInfo = [
      `Year: ${leadData.year || leadData.Year__c || "N/A"}`,
      `Make: ${leadData.make || leadData.Make__c || "N/A"}`,
      `Model: ${leadData.model || leadData.Model__c || "N/A"}`,
      `Trim: ${leadData.trim || leadData.Trim__c || "N/A"}`,
      `VIN: ${leadData.vin || leadData.VIN__c || "N/A"}`,
      leadData.mileage || leadData.Mileage__c
        ? `Mileage: ${leadData.mileage || leadData.Mileage__c}`
        : "",
      leadData.accident || leadData.Vehicle_Condition__c
        ? `Condition: ${leadData.accident || leadData.Vehicle_Condition__c}`
        : "",
      leadData.drivable || leadData.Operable_Status__c
        ? `Drivable: ${leadData.drivable || leadData.Operable_Status__c}`
        : "",
    ]
      .filter((item) => item)
      .join("<br>");

    // Format contact information
    const contactInfo = [
      `Name: ${leadData.firstName || leadData.FirstName || ""} ${
        leadData.lastName || leadData.LastName || ""
      }`,
      `Phone: ${leadData.phone || leadData.Phone || "N/A"}`,
      `Email: ${leadData.email || leadData.Email || "N/A"}`,
      leadData.zip || leadData.Zip_Code__c
        ? `Zip Code: ${leadData.zip || leadData.Zip_Code__c}`
        : "",
    ]
      .filter((item) => item)
      .join("<br>");

    // Source information
    const source = leadData.source || leadData.LeadSource || "Website";
    const subSource =
      leadData.subLeadSource || leadData.Sub_Lead_Source__c || "Direct";

    // Current date/time
    const now = new Date();
    const dateTimeStr = now.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Salesforce link if ID is available
    let salesforceLink = "";
    if (salesforceId) {
      salesforceLink = `
        <p><a href="https://cartrackers.lightning.force.com/lightning/r/Lead/${salesforceId}/view">
          View Lead in Salesforce
        </a></p>
      `;
    }

    // Create email message
    const msg = {
      to: [LEAD_NOTIFICATION_EMAIL, SECOND_LEAD_NOTIFICATION_EMAIL], // Send to both email addresses
      from: SENDGRID_VERIFIED_EMAIL,
      subject: `New Car Lead: ${leadData.year || leadData.Year__c || ""} ${
        leadData.make || leadData.Make__c || ""
      } ${leadData.model || leadData.Model__c || ""}`,
      text: `New lead received from ${source} (${subSource}) on ${dateTimeStr}`,
      html: `
        <h2>New Car Lead Submission</h2>
        <p>A new lead has been received from <strong>${source}</strong> (${subSource}) on ${dateTimeStr}</p>
        
        <h3>Vehicle Information:</h3>
        <p>${vehicleInfo}</p>
        
        <h3>Contact Information:</h3>
        <p>${contactInfo}</p>
        
        <p><strong>This lead has been automatically added to Salesforce.</strong></p>
        ${salesforceLink}
        
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated message. Please do not reply directly to this email.
        </p>
      `,
    };

    // Send email
    await sgMail.send(msg);
    console.log("Lead notification email sent successfully to both recipients");
    return true;
  } catch (error) {
    console.error("Error sending lead notification email:", error);
    // Log error to database but don't throw - we don't want to fail lead creation if email fails
    // await logError(error, "sendLeadNotificationEmail", { leadData, formData });
    return false;
  }
}
