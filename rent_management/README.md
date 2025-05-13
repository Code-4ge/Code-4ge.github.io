# Rent Distribution

A modern, responsive web application for managing rental billing with main and sub-meter electricity distribution.

## Features

- **Rental Management**: Add, edit, and delete rentals with details like name, WhatsApp number, motor cost, and monthly rent.
- **Meter Reading Management**: Track main meter and sub-meter readings.
- **30-Day Normalization**: Automatically adjusts sub-meter readings to a 30-day period based on the billing cycle (21st to 21st).
- **Cost Distribution**: Accurately distributes electricity costs between rentals based on their meter type.
- **Billing History**: Keeps track of all generated bills for reference.
- **WhatsApp Integration**: Send bill receipts directly to tenants via WhatsApp.
- **Responsive Design**: Works on all device sizes.

## How It Works

1. **Main Meter vs Sub Meter**: The application handles two types of meter readings:
   - Main meter: The primary electricity meter for the entire building
   - Sub meter: A secondary meter assigned to Rental 2

2. **Billing Calculation**:
   - Rental 2 pays for the exact units consumed as measured by the sub meter
   - Rental 1 pays for the remaining units (Main meter total - Sub meter units)

3. **30-Day Normalization**:
   - If the sub meter reading date doesn't align with the main meter's billing cycle (21st to 21st), the application automatically adjusts the sub meter units to reflect a 30-day period.

4. **Cost Components**:
   - Electricity cost (based on meter readings)
   - Water bill (divided equally among rentals)
   - Motor charges (fixed amount per rental)
   - Monthly rent (fixed amount per rental)

## Usage

1. **Set Up Rentals**:
   - Navigate to the "Rentals" tab
   - Add rental details including WhatsApp number
   - Assign the appropriate meter type to each rental

2. **Enter Meter Readings**:
   - Navigate to the "Readings" tab
   - Enter main meter current reading
   - Enter sub meter current reading and the reading date
   - Enter the total electricity bill amount and water bill if applicable
   - Click "Calculate Bills"

3. **View and Share Bills**:
   - Navigate to the "Billing" tab
   - View detailed cost breakdown for each rental
   - Send bill receipts via WhatsApp with the provided button

## Installation

This is a static website that can be hosted on any free hosting platform:

1. Download all files
2. Upload to your hosting service (GitHub Pages, Netlify, Vercel, etc.)
3. Access the website and start using it

## Local Storage

The application uses browser local storage to save:
- Rental information
- Previous meter readings
- Billing history

This means your data is stored on your device and will persist between sessions.

## Technologies Used

- HTML5, CSS3, JavaScript
- React (via CDN)
- Material UI (via CDN)
- Day.js for date handling
- Local Storage for data persistence 