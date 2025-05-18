// Use the Material UI components from global scope
const {
  Button,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Grid,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Box,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  IconButton,
  Divider,
  CircularProgress,
  Snackbar,
  Alert
} = MaterialUI;

// Utility functions
const calculateDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

// LocalStorage keys
const RENTALS_KEY = 'rentals_data';
const READINGS_KEY = 'meter_readings';
const HISTORY_KEY = 'billing_history';

// Default rentals
const defaultRentals = [
  {
    id: 1,
    name: 'Rental 1',
    phone: '',
    motorCost: 200,
    monthlyRent: 6400,
    meterType: 'main-residual'
  },
  {
    id: 2,
    name: 'Rental 2',
    phone: '',
    motorCost: 200,
    monthlyRent: 6400,
    meterType: 'sub'
  }
];

// Function to load data from local storage
const loadData = (key, defaultValue) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

// Function to save data to local storage
const saveData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Function to test the date calculation logic - for debugging issues
const calculateBillingCycleDays = (readingDate) => {
  try {
    const dateOfReading = new Date(readingDate);
    if (isNaN(dateOfReading.getTime())) {
      return { error: 'Invalid date format' };
    }
    
    const currentMonth = dateOfReading.getMonth();
    const currentYear = dateOfReading.getFullYear();
    
    // Set the billing cycle start date to the 21st of the previous month
    // This ensures readings from after the 21st to the end of the month work correctly
    const startDate = new Date(currentYear, currentMonth - 1, 21);
    
    // Calculate days between the reading date and the start of the billing cycle
    const daysDifference = Math.round((dateOfReading - startDate) / (1000 * 60 * 60 * 24));
    
    return {
      readingDate: dateOfReading.toLocaleDateString(),
      cycleStartDate: startDate.toLocaleDateString(),
      daysDifference,
      isValid: daysDifference > 0
    };
  } catch (error) {
    return { error: error.message };
  }
};

// Test with your specific date
console.log('Debug - Date Calculation Test for 04/30/2025:', calculateBillingCycleDays('2025-04-30'));

// Function to download bill as image
const downloadBillAsImage = (billElement, bill, showNotification) => {
  if (!html2canvas) {
    console.error('html2canvas library is not loaded');
    showNotification('Error: Image download functionality not available', 'error');
    return;
  }
  
  showNotification('Generating bill image...', 'info');
  
  // Create a temporary clone of the bill card with customized format
  const tempElement = billElement.cloneNode(true);
  tempElement.style.position = 'absolute';
  tempElement.style.left = '-9999px';
  tempElement.style.top = '-9999px';
  document.body.appendChild(tempElement);
  
  // Add month/year to the top-left of the card
  try {
    // Extract month and year from bill date
    const billDate = new Date(bill.date);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthYear = `${monthNames[billDate.getMonth()]} ${billDate.getFullYear()}`;
    
    // Find the card content element to add the month/year to
    const cardContent = tempElement.querySelector('.MuiCardContent-root');
    if (cardContent && cardContent.firstChild) {
      // Create the month/year element
      const monthYearElem = document.createElement('div');
      monthYearElem.className = 'bill-month-year';
      monthYearElem.innerText = monthYear;
      
      // Style the month/year text
      monthYearElem.style.fontSize = '10px';
      monthYearElem.style.color = '#757575';
      monthYearElem.style.position = 'absolute';
      monthYearElem.style.top = '12px';
      monthYearElem.style.left = '12px';
      
      // Add it as the first element in the card content
      cardContent.insertBefore(monthYearElem, cardContent.firstChild);
      
      // Add some padding to the rental name to ensure it doesn't overlap
      const rentalName = cardContent.querySelector('h6');
      if (rentalName) {
        rentalName.style.paddingTop = '10px';
      }
    }
  } catch (err) {
    console.error('Error adding month/year label:', err);
  }
  
  // Apply customized format for image download
  // 1. Remove Meter Type
  const meterTypeElem = tempElement.querySelector('.meter-type');
  if (meterTypeElem) {
    meterTypeElem.style.display = 'none';
  }
  
  // 2. Look at the meter-type text to determine which meter is being used
  let isSub = false;
  if (meterTypeElem) {
    isSub = meterTypeElem.textContent.includes('Sub Meter');
  }
  
  // Get the correct previous reading based on meter type
  const previousReading = isSub ? bill.subMeterReading.previous : bill.mainMeterReading.previous;
  const currentReading = previousReading + bill.units;
  
  const meterReadingsElems = tempElement.querySelectorAll('.meter-readings');
  meterReadingsElems.forEach(elem => {
    elem.innerText = `Previous: ${previousReading} → Current: ${currentReading}`;
  });
  
  // 3. Remove Cost per Unit
  const costPerUnitElem = tempElement.querySelector('.cost-per-unit');
  if (costPerUnitElem) {
    costPerUnitElem.style.display = 'none';
  }
  
  // 4. Combine electricity and motor charges
  const electricityCostElems = tempElement.querySelectorAll('.electricity-cost');
  const electricityCostValueElems = tempElement.querySelectorAll('.electricity-cost-value');
  const motorCostElems = tempElement.querySelectorAll('.motor-cost');
  
  const totalElectricity = bill.electricityCost + bill.motorCost;
  
  if (electricityCostElems.length > 0) {
    electricityCostElems.forEach(elem => {
      elem.innerText = 'Electricity';
    });
  }
  
  if (electricityCostValueElems.length > 0) {
    electricityCostValueElems.forEach(elem => {
      // Set the main electricity cost text
      elem.innerText = `${formatCurrency(totalElectricity)}`;
      
      try {
        // Find parent box that contains this value
        const rowBox = elem.closest('[class*="MuiBox-root"]');
        if (rowBox && rowBox.parentNode) {
          // Create breakdown text element
          const breakdownElem = document.createElement('div');
          breakdownElem.className = 'electricity-breakdown';
          breakdownElem.innerText = `(${formatCurrency(bill.electricityCost)} + ${formatCurrency(bill.motorCost)})`;
          
          // Style the breakdown text
          breakdownElem.style.fontSize = '10px';
          breakdownElem.style.color = '#757575';
          breakdownElem.style.textAlign = 'right';
          breakdownElem.style.marginTop = '-4px';
          breakdownElem.style.marginBottom = '6px';
          
          // Insert after the row
          if (rowBox.nextSibling) {
            rowBox.parentNode.insertBefore(breakdownElem, rowBox.nextSibling);
          } else {
            rowBox.parentNode.appendChild(breakdownElem);
          }
        }
      } catch (err) {
        console.error('Error adding electricity breakdown:', err);
      }
    });
  }
  
  if (motorCostElems.length > 0) {
    motorCostElems.forEach(elem => {
      elem.style.display = 'none';
    });
  }
  
  // Remove the action buttons from the clone
  const actionButtons = tempElement.querySelectorAll('.MuiCardActions-root');
  actionButtons.forEach(button => {
    button.style.display = 'none';
  });
  
  const options = {
    scale: 2, // Higher scale for better quality
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  };
  
  html2canvas(tempElement, options).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${bill.rentalName.replace(/\s+/g, '_')}_bill.png`;
    link.href = imgData;
    link.click();
    showNotification('Bill downloaded successfully!', 'success');
    
    // Clean up the temporary element
    document.body.removeChild(tempElement);
  }).catch(err => {
    console.error('Error generating bill image:', err);
    showNotification('Error downloading bill image', 'error');
    
    // Clean up the temporary element
    if (document.body.contains(tempElement)) {
      document.body.removeChild(tempElement);
    }
  });
};

// App component
function App() {
  const [activeTab, setActiveTab] = React.useState(0);
  const [rentals, setRentals] = React.useState(loadData(RENTALS_KEY, defaultRentals));
  const [readings, setReadings] = React.useState(loadData(READINGS_KEY, {
    mainMeterPrevious: 5014,
    mainMeterCurrent: 0,
    subMeterPrevious: 4041,
    subMeterCurrent: 0,
    subMeterCurrentDate: new Date().toISOString().split('T')[0],
    electricityCost: 0,
    waterBill: 0
  }));
  const [history, setHistory] = React.useState(loadData(HISTORY_KEY, []));
  const [newRental, setNewRental] = React.useState({
    name: '',
    phone: '',
    motorCost: 0,
    monthlyRent: 0,
    meterType: 'main-residual'
  });
  const [notification, setNotification] = React.useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Save data when state changes
  React.useEffect(() => {
    saveData(RENTALS_KEY, rentals);
  }, [rentals]);

  React.useEffect(() => {
    saveData(READINGS_KEY, readings);
  }, [readings]);

  React.useEffect(() => {
    saveData(HISTORY_KEY, history);
  }, [history]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleReadingsChange = (e) => {
    const { name, value } = e.target;
    setReadings({
      ...readings,
      [name]: name.includes('Date') ? value : parseFloat(value) || 0
    });
  };

  const handleNewRentalChange = (e) => {
    const { name, value } = e.target;
    setNewRental({
      ...newRental,
      [name]: name === 'motorCost' || name === 'monthlyRent' 
        ? parseFloat(value) || 0 
        : value
    });
  };

  const handleRentalChange = (id, field, value) => {
    setRentals(rentals.map(rental => 
      rental.id === id 
        ? { ...rental, [field]: field === 'motorCost' || field === 'monthlyRent' ? parseFloat(value) || 0 : value } 
        : rental
    ));
  };

  const addNewRental = () => {
    if (!newRental.name) {
      showNotification('Rental name is required', 'error');
      return;
    }
    
    const newId = Math.max(0, ...rentals.map(r => r.id)) + 1;
    setRentals([...rentals, { ...newRental, id: newId }]);
    setNewRental({
      name: '',
      phone: '',
      motorCost: 0,
      monthlyRent: 0,
      meterType: 'main-residual'
    });
    showNotification('New rental added successfully!', 'success');
  };

  const deleteRental = (id) => {
    setRentals(rentals.filter(rental => rental.id !== id));
    showNotification('Rental deleted successfully!', 'success');
  };

  const calculateBill = () => {
    // Validate required fields
    if (
      readings.mainMeterCurrent <= readings.mainMeterPrevious ||
      (readings.subMeterCurrent <= readings.subMeterPrevious && rentals.some(r => r.meterType === 'sub'))
    ) {
      showNotification('Current readings must be greater than previous readings', 'error');
      return;
    }

    if (!readings.electricityCost) {
      showNotification('Please enter electricity cost', 'error');
      return;
    }

    // Calculate total units consumed
    const mainMeterUnits = Math.round(readings.mainMeterCurrent - readings.mainMeterPrevious);
    
    // Prevent division by zero
    if (mainMeterUnits === 0) {
      showNotification('Main meter units cannot be zero. Please check your readings.', 'error');
      return;
    }
    
    const costPerUnit = readings.electricityCost / mainMeterUnits;
    
    let subMeterUnits = 0;
    let adjustedSubMeterCurrent = readings.subMeterCurrent;
    
    // Calculate sub meter units for 30 days if applicable
    if (rentals.some(r => r.meterType === 'sub')) {
      subMeterUnits = Math.round(readings.subMeterCurrent - readings.subMeterPrevious);
      
      // Adjust sub meter reading to 30 days if needed
      const dateOfReading = new Date(readings.subMeterCurrentDate);
      const currentMonth = dateOfReading.getMonth();
      const currentYear = dateOfReading.getFullYear();
      
      // Set the billing cycle start date to the 21st of the previous month
      // This ensures readings from after the 21st to the end of the month work correctly
      const startDate = new Date(currentYear, currentMonth - 1, 21);
      
      // Calculate days between the reading date and the start of the billing cycle
      const daysDifference = Math.round((dateOfReading - startDate) / (1000 * 60 * 60 * 24));
      
      // Prevent division by zero
      if (daysDifference <= 0) {
        showNotification('Invalid reading date. Please check your dates.', 'error');
        return;
      }
      
      if (daysDifference !== 30) {
        // Normalize to 30 days using rounded values throughout
        const unitsPerDay = subMeterUnits / daysDifference;
        const normalizedUnits = Math.round(unitsPerDay * 30);
        adjustedSubMeterCurrent = readings.subMeterPrevious + normalizedUnits;
        subMeterUnits = normalizedUnits; // Already rounded
      }
    }
    
    const mainResidualUnits = Math.round(mainMeterUnits - subMeterUnits);
    
    // Calculate bills for each rental
    const bills = rentals.map(rental => {
      let units = 0;
      if (rental.meterType === 'sub') {
        units = subMeterUnits; // Already rounded
      } else if (rental.meterType === 'main-residual') {
        units = mainResidualUnits; // Already rounded
      }
      
      const electricityCost = Math.round(units * costPerUnit);
      const waterBillShare = Math.round(readings.waterBill / rentals.length);
      const totalBill = electricityCost + rental.motorCost + waterBillShare + rental.monthlyRent;
      
      // Use the reading date instead of current date for the bill
      const readingDate = new Date(readings.subMeterCurrentDate);
      
      return {
        rentalId: rental.id,
        rentalName: rental.name,
        phone: rental.phone,
        units,
        electricityCost,
        motorCost: rental.motorCost,
        waterBill: waterBillShare,
        monthlyRent: rental.monthlyRent,
        totalBill,
        date: readingDate.toISOString(),
        readingMonth: readingDate.getMonth(),
        readingYear: readingDate.getFullYear(),
        mainMeterReading: {
          previous: readings.mainMeterPrevious,
          current: readings.mainMeterCurrent
        },
        subMeterReading: {
          previous: readings.subMeterPrevious,
          current: readings.subMeterCurrent,
          adjusted: adjustedSubMeterCurrent
        },
        costPerUnit
      };
    });
    
    // Add bills to history
    setHistory([...bills, ...history]);
    
    // Update previous readings for next month
    setReadings({
      ...readings,
      mainMeterPrevious: readings.mainMeterCurrent,
      subMeterPrevious: adjustedSubMeterCurrent,
      mainMeterCurrent: 0,
      subMeterCurrent: 0,
      electricityCost: 0,
      waterBill: 0
    });
    
    showNotification('Bills calculated successfully!', 'success');
    setActiveTab(2); // Navigate to billing tab
  };

  const sendWhatsApp = (bill) => {
    if (!bill.phone) {
      showNotification('No phone number available', 'error');
      return;
    }

    // Get month and year from bill date
    const billDate = new Date(bill.date);
    const monthYear = `${billDate.toLocaleString('default', { month: 'long' })} ${billDate.getFullYear()}`;
    
    // Determine the correct readings based on meter type
    const isSub = rentals.find(r => r.id === bill.rentalId)?.meterType === 'sub';
    const previousReading = isSub ? bill.subMeterReading.previous : bill.mainMeterReading.previous;
    const currentReading = isSub ? (bill.subMeterReading.previous + bill.units) : bill.mainMeterReading.current;
    // const actualCurrent = isSub ? bill.subMeterReading.current : bill.mainMeterReading.current;
    
    // Calculate the electricity + motor total
    const electricityMotorTotal = bill.electricityCost + bill.motorCost;
    
    const message = `🏠 *${monthYear}, Rent Bill for ${bill.rentalName}*
> Reading: ${previousReading} → ${currentReading}
> Units Used: ${Math.round(bill.units)}
> Rate: ${formatCurrency(bill.costPerUnit)}/unit

_Charges:_
> Electricity: ${formatCurrency(bill.electricityCost)}
> Motor Charges: ${formatCurrency(bill.motorCost)}
> Water: ${formatCurrency(bill.waterBill)}
> Rent: ${formatCurrency(bill.monthlyRent)}
💰 *Total Due: ${formatCurrency(bill.totalBill)}*

Thank you!`;


// Hindi message format...
// --------------------------------

// 🏠 *${monthYear}, ${bill.rentalName} साठी भाडे बिल*
// > मीटर रीडिंग: ${previousReading} → ${previousReading + bill.units}
// > युनिट्स: ${Math.round(bill.units)}
// > दर: ${formatCurrency(bill.costPerUnit)}/युनिट

// _शुल्क:_
// > विद्युत शुल्क: ${formatCurrency(bill.electricityCost)} + ${formatCurrency(bill.motorCost)} = ${formatCurrency(electricityMotorTotal)}
// > पाणी शुल्क: ${formatCurrency(bill.waterBill)}
// > भाडे: ${formatCurrency(bill.monthlyRent)}
// 💰 *एकूण देय: ${formatCurrency(bill.totalBill)}*

// *पेमेंट पर्याय:*
// 1️⃣ UPI: panmandneeraj@oksbi
// 2️⃣ Phone Pay: 8793044804

// धन्यवाद!


// Additional message format...
//     🔢 Reading: ${previousReading} ➡️ ${previousReading + bill.units}
// ⚡ Units Used: ${Math.round(bill.units)}
// 💸 Rate: ${formatCurrency(bill.costPerUnit)}/unit

// *Charges:*
// 🔌 Electricity: ${formatCurrency(bill.electricityCost)} + ${formatCurrency(bill.motorCost)} = ${formatCurrency(electricityMotorTotal)}
// 💧 Water: ${formatCurrency(bill.waterBill)}
// 🏠 Rent: ${formatCurrency(bill.monthlyRent)}
// 📦 *Total Due: ${formatCurrency(bill.totalBill)}*

// *Payment Options:*
// 1️⃣ UPI: example@upiZ
// 2️⃣ Phone Pay: example
// 3️⃣ Bank Transfer: 
//    Name: example
//    Acc: example
//    IFSC: example

// Thank you!




    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${bill.phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`, '_blank');
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // Render tabs
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      AppBar,
      { position: 'static' },
      React.createElement(
        Toolbar,
        null,
        React.createElement(
          Box,
          { display: 'flex', alignItems: 'center' },
          React.createElement(
            'img',
            { 
              src: './src/styles/modern-logo.svg',
              alt: 'Rent Management Logo',
              className: 'app-logo'
            }
          ),
          React.createElement(
            Typography,
            { variant: 'h6', className: 'app-title' },
            'Rent Management'
          )
        )
      )
    ),
    React.createElement(
      Container,
      { maxWidth: 'lg', style: { marginTop: '20px' } },
      React.createElement(
        Tabs,
        { 
          value: activeTab, 
          onChange: handleTabChange,
          variant: 'fullWidth',
          indicatorColor: 'primary',
          textColor: 'primary',
          style: { marginBottom: '20px' }
        },
        React.createElement(Tab, { label: 'Rentals' }),
        React.createElement(Tab, { label: 'Readings' }),
        React.createElement(Tab, { label: 'Billing' })
      ),
      // Rentals Tab
      activeTab === 0 && React.createElement(
        'div',
        null,
        React.createElement(
          Typography,
          { variant: 'h5', gutterBottom: true },
          'Manage Rentals'
        ),
        React.createElement(
          Grid,
          { container: true, spacing: 3 },
          // Existing Rentals
          rentals.map(rental => React.createElement(
            Grid,
            { item: true, xs: 12, sm: 6, md: 4, key: rental.id },
            React.createElement(
              Card,
              { className: 'rental-card', variant: 'outlined' },
              React.createElement(
                CardContent,
                null,
                React.createElement(
                  Typography,
                  { variant: 'h6', gutterBottom: true },
                  rental.name
                ),
                React.createElement(
                  TextField,
                  {
                    label: 'WhatsApp Number',
                    fullWidth: true,
                    margin: 'dense',
                    value: rental.phone,
                    onChange: (e) => handleRentalChange(rental.id, 'phone', e.target.value)
                  }
                ),
                React.createElement(
                  TextField,
                  {
                    label: 'Motor Cost',
                    type: 'number',
                    fullWidth: true,
                    margin: 'dense',
                    value: rental.motorCost,
                    onChange: (e) => handleRentalChange(rental.id, 'motorCost', e.target.value)
                  }
                ),
                React.createElement(
                  TextField,
                  {
                    label: 'Monthly Rent',
                    type: 'number',
                    fullWidth: true,
                    margin: 'dense',
                    value: rental.monthlyRent,
                    onChange: (e) => handleRentalChange(rental.id, 'monthlyRent', e.target.value)
                  }
                ),
                React.createElement(
                  FormControl,
                  { fullWidth: true, margin: 'dense' },
                  React.createElement(
                    InputLabel,
                    null,
                    'Meter Type'
                  ),
                  React.createElement(
                    Select,
                    {
                      value: rental.meterType,
                      onChange: (e) => handleRentalChange(rental.id, 'meterType', e.target.value),
                      label: 'Meter Type'
                    },
                    React.createElement(MenuItem, { value: 'main-residual' }, 'Main Meter - Residual'),
                    React.createElement(MenuItem, { value: 'sub' }, 'Sub Meter')
                  )
                )
              ),
              React.createElement(
                CardActions,
                null,
                React.createElement(
                  Button,
                  { 
                    size: 'small', 
                    color: 'secondary',
                    onClick: () => deleteRental(rental.id)
                  },
                  'Delete'
                )
              )
            )
          )),
          // Add New Rental
          React.createElement(
            Grid,
            { item: true, xs: 12 },
            React.createElement(
              Paper,
              { style: { padding: '16px', marginTop: '20px' } },
              React.createElement(
                Typography,
                { variant: 'h6', gutterBottom: true },
                'Add New Rental'
              ),
              React.createElement(
                Grid,
                { container: true, spacing: 2 },
                React.createElement(
                  Grid,
                  { item: true, xs: 12, sm: 6 },
                  React.createElement(
                    TextField,
                    {
                      label: 'Rental Name',
                      fullWidth: true,
                      required: true,
                      name: 'name',
                      value: newRental.name,
                      onChange: handleNewRentalChange
                    }
                  )
                ),
                React.createElement(
                  Grid,
                  { item: true, xs: 12, sm: 6 },
                  React.createElement(
                    TextField,
                    {
                      label: 'WhatsApp Number',
                      fullWidth: true,
                      name: 'phone',
                      value: newRental.phone,
                      onChange: handleNewRentalChange
                    }
                  )
                ),
                React.createElement(
                  Grid,
                  { item: true, xs: 12, sm: 6 },
                  React.createElement(
                    TextField,
                    {
                      label: 'Motor Cost',
                      type: 'number',
                      fullWidth: true,
                      name: 'motorCost',
                      value: newRental.motorCost,
                      onChange: handleNewRentalChange
                    }
                  )
                ),
                React.createElement(
                  Grid,
                  { item: true, xs: 12, sm: 6 },
                  React.createElement(
                    TextField,
                    {
                      label: 'Monthly Rent',
                      type: 'number',
                      fullWidth: true,
                      name: 'monthlyRent',
                      value: newRental.monthlyRent,
                      onChange: handleNewRentalChange
                    }
                  )
                ),
                React.createElement(
                  Grid,
                  { item: true, xs: 12 },
                  React.createElement(
                    FormControl,
                    { fullWidth: true },
                    React.createElement(
                      InputLabel,
                      null,
                      'Meter Type'
                    ),
                    React.createElement(
                      Select,
                      {
                        name: 'meterType',
                        value: newRental.meterType,
                        onChange: handleNewRentalChange,
                        label: 'Meter Type'
                      },
                      React.createElement(MenuItem, { value: 'main-residual' }, 'Main Meter - Residual'),
                      React.createElement(MenuItem, { value: 'sub' }, 'Sub Meter')
                    )
                  )
                ),
                React.createElement(
                  Grid,
                  { item: true, xs: 12 },
                  React.createElement(
                    Button,
                    {
                      variant: 'contained',
                      color: 'primary',
                      onClick: addNewRental
                    },
                    'Add Rental'
                  )
                )
              )
            )
          )
        )
      ),
      
      // Readings Tab
      activeTab === 1 && React.createElement(
        'div',
        null,
        React.createElement(
          Typography,
          { variant: 'h5', gutterBottom: true },
          'Meter Readings & Costs'
        ),
        React.createElement(
          Paper,
          { style: { padding: '16px' } },
          React.createElement(
            Grid,
            { container: true, spacing: 3 },
            React.createElement(
              Grid,
            //   { item: true, xs: 12 },
            //   React.createElement(
            //     Box,
            //     { mb: 2, p: 2, bgcolor: '#e8f4fd', borderRadius: 1 },
            //     React.createElement(
            //       Typography,
            //       { variant: 'body1', gutterBottom: true },
            //       'Billing Cycle: This application calculates from the 21st of the previous month to your current reading date.'
            //     ),
            //     React.createElement(
            //       Typography,
            //       { variant: 'body2', color: 'textSecondary' },
            //       'For example, if your reading date is April 30, the billing cycle is from March 21 to April 30. The consumption will be adjusted to a standard 30-day period for consistent billing.'
            //     )
            //   )
            // ),
            // React.createElement(
            //   Grid,
              { item: true, xs: 12, md: 6 },
              React.createElement(
                Typography,
                { variant: 'h6', gutterBottom: true },
                'Main Meter'
              ),
              React.createElement(
                TextField,
                {
                  label: 'Previous Reading',
                  type: 'number',
                  fullWidth: true,
                  margin: 'normal',
                  name: 'mainMeterPrevious',
                  value: readings.mainMeterPrevious,
                  onChange: handleReadingsChange,
                  disabled: true
                }
              ),
              React.createElement(
                TextField,
                {
                  label: 'Current Reading',
                  type: 'number',
                  fullWidth: true,
                  margin: 'normal',
                  name: 'mainMeterCurrent',
                  value: readings.mainMeterCurrent,
                  onChange: handleReadingsChange
                }
              ),
              readings.mainMeterCurrent > readings.mainMeterPrevious && React.createElement(
                Box,
                { mt: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 },
                React.createElement(
                  Typography,
                  { variant: 'body1' },
                  `Units Consumed: ${Math.round(readings.mainMeterCurrent - readings.mainMeterPrevious)}`
                )
              )
            ),
            React.createElement(
              Grid,
              { item: true, xs: 12, md: 6 },
              React.createElement(
                Typography,
                { variant: 'h6', gutterBottom: true },
                'Sub Meter'
              ),
              React.createElement(
                TextField,
                {
                  label: 'Previous Reading',
                  type: 'number',
                  fullWidth: true,
                  margin: 'normal',
                  name: 'subMeterPrevious',
                  value: readings.subMeterPrevious,
                  onChange: handleReadingsChange,
                  disabled: true
                }
              ),
              React.createElement(
                TextField,
                {
                  label: 'Current Reading',
                  type: 'number',
                  fullWidth: true,
                  margin: 'normal',
                  name: 'subMeterCurrent',
                  value: readings.subMeterCurrent,
                  onChange: handleReadingsChange
                }
              ),
              React.createElement(
                TextField,
                {
                  label: 'Reading Date',
                  type: 'date',
                  fullWidth: true,
                  margin: 'normal',
                  name: 'subMeterCurrentDate',
                  value: readings.subMeterCurrentDate,
                  onChange: handleReadingsChange,
                  InputLabelProps: { shrink: true }
                }
              ),
              readings.subMeterCurrent > readings.subMeterPrevious && React.createElement(
                Box,
                { mt: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 },
                React.createElement(
                  Typography,
                  { variant: 'body1' },
                  `Units Consumed: ${Math.round(readings.subMeterCurrent - readings.subMeterPrevious)}`
                ),
                // Add calculation breakdown
                readings.subMeterCurrentDate && React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    Typography,
                    { variant: 'body2', color: 'textSecondary', mt: 1 },
                    'Reading Date: ' + new Date(readings.subMeterCurrentDate).toLocaleDateString()
                  ),
                  React.createElement(
                    Typography,
                    { variant: 'body2', color: 'textSecondary' },
                    (() => {
                      const dateOfReading = new Date(readings.subMeterCurrentDate);
                      const currentMonth = dateOfReading.getMonth();
                      const currentYear = dateOfReading.getFullYear();
                      
                      // Set the billing cycle start date to the 21st of the previous month
                      // This ensures readings from after the 21st to the end of the month work correctly
                      const startDate = new Date(currentYear, currentMonth - 1, 21);
                      
                      // Calculate days between the reading date and the start of the billing cycle
                      const daysDifference = Math.round((dateOfReading - startDate) / (1000 * 60 * 60 * 24));
                      
                      if (daysDifference <= 0) {
                        return 'Invalid reading date - please check';
                      }
                      
                      if (daysDifference !== 30) {
                        const subMeterUnits = readings.subMeterCurrent - readings.subMeterPrevious;
                        const unitsPerDay = subMeterUnits / daysDifference;
                        const normalizedUnits = unitsPerDay * 30;
                        
                        return `Billing cycle: ${startDate.toLocaleDateString()} to ${dateOfReading.toLocaleDateString()} (${daysDifference} days)
                        Units per day: ${unitsPerDay.toFixed(2)}
                        Adjusted to 30 days: ${Math.round(normalizedUnits)} units`;
                      }
                      
                      return 'Billing cycle is exactly 30 days - no adjustment needed';
                    })()
                  )
                )
              )
            ),
            React.createElement(
              Grid,
              { item: true, xs: 12, md: 6 },
              React.createElement(
                Typography,
                { variant: 'h6', gutterBottom: true },
                'Cost Details'
              ),
              React.createElement(
                TextField,
                {
                  label: 'Total Electricity Bill (₹)',
                  type: 'number',
                  fullWidth: true,
                  margin: 'normal',
                  name: 'electricityCost',
                  value: readings.electricityCost,
                  onChange: handleReadingsChange
                }
              ),
              React.createElement(
                TextField,
                {
                  label: 'Water Bill (₹)',
                  type: 'number',
                  fullWidth: true,
                  margin: 'normal',
                  name: 'waterBill',
                  value: readings.waterBill,
                  onChange: handleReadingsChange
                }
              )
            ),
            React.createElement(
              Grid,
              { item: true, xs: 12, md: 6 },
              React.createElement(
                Box,
                { display: 'flex', alignItems: 'center', height: '100%' },
                React.createElement(
                  Button,
                  {
                    variant: 'contained',
                    color: 'primary',
                    fullWidth: true,
                    size: 'large',
                    onClick: calculateBill,
                    disabled: 
                      readings.mainMeterCurrent <= readings.mainMeterPrevious ||
                      !readings.electricityCost
                  },
                  'Calculate Bills'
                )
              )
            )
          )
        )
      ),
      
      // Billing Tab
      activeTab === 2 && React.createElement(
        'div',
        null,
        React.createElement(
          Typography,
          { variant: 'h5', gutterBottom: true },
          'Billing History'
        ),
        history.length === 0 
          ? React.createElement(
              Paper,
              { style: { padding: '20px', textAlign: 'center' } },
              React.createElement(
                Typography,
                { variant: 'body1' },
                'No billing history yet. Generate bills from the Readings tab.'
              )
            )
          : React.createElement(
              React.Fragment,
              null,
              // Group bills by date (most recent first)
              Object.entries(
                history.reduce((groups, bill) => {
                  // Use reading date from bill
                  const dateObj = new Date(bill.date);
                  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                  const monthYear = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                  
                  if (!groups[monthYear]) groups[monthYear] = [];
                  groups[monthYear].push(bill);
                  return groups;
                }, {})
              ).map(([monthYear, bills], index) => React.createElement(
                React.Fragment,
                { key: monthYear },
                React.createElement(
                  Typography,
                  { 
                    variant: 'h6', 
                    style: { 
                      marginTop: index > 0 ? '30px' : '0', 
                      marginBottom: '10px',
                      backgroundColor: '#f5f5f5',
                      padding: '8px',
                      borderRadius: '4px'
                    } 
                  },
                  `Bills for ${monthYear}`
                ),
                React.createElement(
                  Grid,
                  { container: true, spacing: 3 },
                  bills.map((bill, billIndex) => React.createElement(
                    Grid,
                    { item: true, xs: 12, sm: 6, md: 4, key: `${bill.rentalId}-${billIndex}` },
                    React.createElement(
                      Card,
                      { className: 'bill-card', variant: 'outlined' },
                      React.createElement(
                        CardContent,
                        null,
                        React.createElement(
                          Typography,
                          { variant: 'h6', color: 'primary', gutterBottom: true },
                          bill.rentalName
                        ),
                        React.createElement(
                          Box,
                          { mb: 2 },
                          React.createElement(
                            Typography,
                            { variant: 'body2', color: 'textSecondary', className: 'meter-type' },
                            `Meter Type: ${rentals.find(r => r.id === bill.rentalId)?.meterType === 'sub' ? 'Sub Meter' : 'Main Meter - Residual'}`
                          ),
                          React.createElement(
                            Box,
                            { mt: 1, mb: 1, p: 1, bgcolor: '#f9f9f9', borderRadius: 1 },
                            React.createElement(
                              Typography,
                              { variant: 'body2', fontWeight: 'medium' },
                              'Meter Readings:'
                            ),
                            rentals.find(r => r.id === bill.rentalId)?.meterType === 'sub' ?
                              React.createElement(
                                React.Fragment,
                                null,
                                React.createElement(
                                  Typography,
                                  { variant: 'body2', color: 'textSecondary', className: 'meter-readings' },
                                  `Previous: ${bill.subMeterReading.previous} → Adjusted Current: ${bill.subMeterReading.adjusted} (${bill.subMeterReading.current})`
                                )
                                // bill.subMeterReading.adjusted !== bill.subMeterReading.current && React.createElement(
                                //   Typography,
                                //   { variant: 'body2', color: 'textSecondary', fontStyle: 'italic' },
                                //   `Adjusted Current: ${bill.subMeterReading.adjusted} (30-day normalized)`
                                // )
                              )
                            :
                              React.createElement(
                                Typography,
                                { variant: 'body2', color: 'textSecondary', className: 'meter-readings' },
                                `Previous: ${bill.mainMeterReading.previous} → Current: ${bill.mainMeterReading.current}`
                              )
                          ),
                          React.createElement(
                            Typography,
                            { variant: 'body2', color: 'textSecondary' },
                            `Units: ${Math.round(bill.units)}`
                          ),
                          React.createElement(
                            Typography,
                            { variant: 'body2', color: 'textSecondary', className: 'cost-per-unit' },
                            `Cost per Unit: ${formatCurrency(bill.costPerUnit)}`
                          )
                        ),
                        React.createElement(Divider, null),
                        React.createElement(
                          Box,
                          { my: 1 },
                          React.createElement(
                            Box,
                            { display: 'flex', justifyContent: 'space-between', my: 1 },
                            React.createElement(
                              Typography,
                              { variant: 'body1', className: 'electricity-cost' },
                              'Electricity'
                            ),
                            React.createElement(
                              Typography,
                              { variant: 'body1', className: 'electricity-cost-value' },
                              formatCurrency(bill.electricityCost)
                            )
                          ),
                          React.createElement(
                            Box,
                            { display: 'flex', justifyContent: 'space-between', my: 1 },
                            React.createElement(
                              Typography,
                              { variant: 'body1' },
                              'Water'
                            ),
                            React.createElement(
                              Typography,
                              { variant: 'body1' },
                              formatCurrency(bill.waterBill)
                            )
                          ),
                          React.createElement(
                            Box,
                            { display: 'flex', justifyContent: 'space-between', my: 1, className: 'motor-cost' },
                            React.createElement(
                              Typography,
                              { variant: 'body1' },
                              'Motor Charges'
                            ),
                            React.createElement(
                              Typography,
                              { variant: 'body1' },
                              formatCurrency(bill.motorCost)
                            )
                          ),
                          React.createElement(
                            Box,
                            { display: 'flex', justifyContent: 'space-between', my: 1 },
                            React.createElement(
                              Typography,
                              { variant: 'body1' },
                              'Rent'
                            ),
                            React.createElement(
                              Typography,
                              { variant: 'body1' },
                              formatCurrency(bill.monthlyRent)
                            )
                          )
                        ),
                        React.createElement(Divider, null),
                        React.createElement(
                          Box,
                          { display: 'flex', justifyContent: 'space-between', my: 1, fontWeight: 'bold' },
                          React.createElement(
                            Typography,
                            { variant: 'h6' },
                            'Total'
                          ),
                          React.createElement(
                            Typography,
                            { variant: 'h6', color: 'primary' },
                            formatCurrency(bill.totalBill)
                          )
                        )
                      ),
                      React.createElement(
                        CardActions,
                        null,
                        React.createElement(
                          Box,
                          { display: 'flex', gap: 1, width: '100%', justifyContent: 'space-between' },
                          React.createElement(
                            Button,
                            { 
                              size: 'small', 
                              color: 'secondary',
                              onClick: (e) => {
                                // Get the parent Card element to capture
                                const cardElement = e.currentTarget.closest('.bill-card');
                                if (cardElement) {
                                  // Temporarily add a class to improve the image quality
                                  cardElement.classList.add('capturing');
                                  downloadBillAsImage(cardElement, bill, showNotification);
                                  // Remove the class after a delay
                                  setTimeout(() => cardElement.classList.remove('capturing'), 500);
                                }
                              },
                              startIcon: React.createElement('span', { className: 'material-symbols-outlined' }, 'download')
                            },
                            'Download'
                          ),
                          bill.phone && React.createElement(
                            Button,
                            { 
                              size: 'small', 
                              color: 'primary',
                              onClick: () => sendWhatsApp(bill),
                              startIcon: React.createElement('span', { className: 'material-symbols-outlined' }, 'send')
                            },
                            'Send on WhatsApp'
                          )
                        )
                      )
                    )
                  ))
                )
              ))
            )
      ),
      
      // Notification
      React.createElement(
        Snackbar,
        {
          open: notification.open,
          autoHideDuration: 6000,
          onClose: handleCloseNotification,
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' }
        },
        React.createElement(
          Alert,
          {
            onClose: handleCloseNotification,
            severity: notification.severity,
            variant: 'filled'
          },
          notification.message
        )
      )
    )
  );
}

// Initialize the app
const appContainer = document.getElementById('app');
const root = ReactDOM.createRoot(appContainer);
root.render(React.createElement(App, null)); 