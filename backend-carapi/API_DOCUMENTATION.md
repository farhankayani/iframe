# Salesforce Lead API Documentation

This API provides two endpoints to create leads in Salesforce from form submissions.

---

## Endpoint 1: `/api/submit-form` (Standard Form Submission)

**Method:** `POST`  
**Content-Type:** `application/json`

### Description
Creates a Salesforce lead from a flat form data structure. All fields are optional except that `Company` is automatically set to "CarTracker".

### Request Body

```json
{
  // Contact Information
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",  // Will be auto-formatted to (123) 456-7890
  "alternatePhone": "0987654321",  // Optional

  // Vehicle Information
  "year": "2020",
  "make": "Toyota",
  "model": "Camry",
  "trim": "LE",
  "vin": "1HGBH41JXMN109186",
  "mileage": "50000",
  "licensePlate": "ABC123",
  "state": "CA",

  // Additional Vehicle Details
  "zip": "90210",
  "title": "Clean",
  "titleInName": "Yes",

  // Vehicle Condition
  "accident": "No",
  "drivable": "Yes",
  "repainted": "No",

  // Lead Source
  "source": "Website",
  "subLeadSource": "Contact Form"
}
```

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Form data received and lead created in Salesforce",
  "salesforceLeadId": "00Q5g00000ABC123"
}
```

**Error (500):**
```json
{
  "error": "Failed to process form submission and create Salesforce lead",
  "details": "Error message here"
}
```

### Example cURL Request

```bash
curl -X POST http://your-api-url/api/submit-form \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "1234567890",
    "year": "2020",
    "make": "Toyota",
    "model": "Camry",
    "vin": "1HGBH41JXMN109186",
    "source": "Website"
  }'
```

---

## Endpoint 2: `/api/submit-chatbot-form` (Chatbot Form Submission)

**Method:** `POST`  
**Content-Type:** `application/json`

### Description
Creates a Salesforce lead from a nested chatbot form structure. This endpoint automatically performs VIN or license plate lookups if provided, and supports appointment scheduling.

### Request Body

```json
{
  "contact": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "1234567890",  // Will be auto-formatted
    "company": "Acme Corp",  // Optional, defaults to "{name} Website Chatbot"
    "full_name": "John Doe"  // Optional, used as fallback for company
  },
  "vehicle": {
    "vin": "1HGBH41JXMN109186",  // If provided, triggers VIN lookup
    "license_plate": "ABC123",   // If provided with state, triggers license plate lookup
    "state": "CA",
    "year": "2020",
    "make": "Toyota",
    "model": "Camry",
    "trim": "LE",
    "mileage": "50000",
    "desired_price": "$15,000"  // Will be cleaned to "15000"
  },
  "lead": {
    "source": "Website Chatbot",  // Optional, defaults to "Website Chatbot"
    "status": "New"  // Optional, defaults to "New"
  },
  "appointment": {
    "requested_time": "2025-09-26 15:00"  // Format: "YYYY-MM-DD HH:mm" (local time)
  }
}
```

### Features

- **Automatic VIN Lookup**: If `vehicle.vin` is provided, the API automatically fetches vehicle details from the CarAPI
- **Automatic License Plate Lookup**: If `vehicle.license_plate` and `vehicle.state` are provided (and no VIN), the API automatically fetches vehicle details
- **Phone Number Formatting**: Phone numbers are automatically formatted as `(XXX) XXX-XXXX`
- **Appointment Scheduling**: Supports appointment date/time with automatic timezone handling

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Chatbot form data received and lead created/updated in Salesforce",
  "salesforceLeadId": "00Q5g00000ABC123",
  "parsedData": { /* Original form data */ },
  "vehicleDetails": { /* Looked up vehicle details if VIN/license plate provided */ }
}
```

**Error (500):**
```json
{
  "error": "Failed to process chatbot form submission",
  "details": "Error message here",
  "stack": "Error stack trace (in development)"
}
```

### Example cURL Request

```bash
curl -X POST http://your-api-url/api/submit-chatbot-form \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "1234567890"
    },
    "vehicle": {
      "vin": "1HGBH41JXMN109186",
      "mileage": "50000"
    },
    "lead": {
      "source": "Website Chatbot"
    }
  }'
```

---

## Salesforce Field Mappings

### Standard Form Fields → Salesforce Fields

| Form Field | Salesforce Field | Notes |
|------------|------------------|-------|
| `firstName` | `FirstName` | |
| `lastName` | `LastName` | |
| `email` | `Email` | |
| `phone` | `Phone`, `MobilePhone` | Auto-formatted |
| `alternatePhone` | `Alternate_Phone_number__c` | |
| `year` | `Year__c` | |
| `make` | `Make__c` | |
| `model` | `Model__c` | |
| `trim` | `Trim__c` | |
| `vin` | `VIN__c` | |
| `mileage` | `Mileage__c` | |
| `licensePlate` | `License_Plate__c` | |
| `state` | `State__c` | |
| `zip` | `Zip_Code__c` | |
| `title` | `Title` | |
| `titleInName` | `Ownership_Type__c` | |
| `accident` | `Accident__c` | |
| `drivable` | `Operable_Status__c` | |
| `repainted` | `Repaint__c` | |
| `source` | `LeadSource` | |
| `subLeadSource` | `Sub_Lead_Source__c` | |

### Chatbot Form Fields → Salesforce Fields

| Form Field | Salesforce Field | Notes |
|------------|------------------|-------|
| `contact.first_name` | `FirstName` | Defaults to "Unknown" if missing |
| `contact.last_name` | `LastName` | Defaults to "Unknown" if missing |
| `contact.email` | `Email` | |
| `contact.phone` | `Phone`, `MobilePhone` | Auto-formatted |
| `contact.company` | `Company` | Defaults to "{name} Website Chatbot" |
| `vehicle.vin` | `VIN__c` | Triggers VIN lookup if provided |
| `vehicle.license_plate` | `License_Plate__c` | Triggers lookup if provided with state |
| `vehicle.state` | `State__c` | |
| `vehicle.year` | `Year__c` | |
| `vehicle.make` | `Make__c` | |
| `vehicle.model` | `Model__c` | |
| `vehicle.trim` | `Trim__c` | |
| `vehicle.mileage` | `Mileage__c` | |
| `vehicle.desired_price` | `Desired_Price__c` | Strips $ and commas |
| `appointment.requested_time` | `Appointment_Request_Date_Time__c` | Format: "YYYY-MM-DD HH:mm" |
| `lead.source` | `LeadSource` | Defaults to "Website Chatbot" |
| `lead.status` | `Status` | Defaults to "New" |

---

## Email Notifications

Both endpoints automatically send email notifications to:
- `Leads@thecartrackers.com`
- `hatzs001@gmail.com`

The email includes:
- Vehicle information
- Contact information
- Lead source
- Direct link to view the lead in Salesforce

---

## Notes

1. **Phone Number Formatting**: Phone numbers are automatically formatted as `(XXX) XXX-XXXX`. Input can be any format (with or without dashes, parentheses, spaces).

2. **Company Field**: The `Company` field is required by Salesforce. For `/api/submit-form`, it's automatically set to "CarTracker". For `/api/submit-chatbot-form`, it uses the provided company or defaults to "{name} Website Chatbot".

3. **Optional Fields**: All fields are optional except `Company` (which is auto-set). The API only includes fields in the Salesforce payload if they are present in the request.

4. **VIN/License Plate Lookups**: The chatbot endpoint automatically performs lookups and merges the results with provided form data. Lookup failures don't block lead creation.

5. **Error Handling**: Errors are logged to the console. Email notification failures don't prevent lead creation.

6. **CORS**: The API accepts requests from any origin (`*`).

---

## Testing

Use the health check endpoint to verify the API is running:

```bash
curl http://your-api-url/health
```

Response:
```json
{
  "status": "ok",
  "database": "disconnected",
  "message": "System is healthy"
}
```




