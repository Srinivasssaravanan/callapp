document.addEventListener('deviceready', function () {
    loadCallLogs();  // Load call logs on deviceready event (initial fetch)
    listenForCallEvents();
}, false);

let ongoingCall = null; // To track the current outgoing call

// Fetch incoming, outgoing, and missed calls using the call log plugin
function loadCallLogs() {
    cordova.plugins.CallLog.getCallLog(function (logs) {
        console.log("Loaded call logs:", logs); // Debugging log to check fetched logs
        displayCalls(logs);
    }, function (error) {
        console.error("Failed to fetch call logs: ", error);
    });
}

function displayCalls(logs) {
    // Filter logs by type (incoming, outgoing, missed)
    const incoming = logs.filter(call => call.type === 'INCOMING');
    const outgoing = logs.filter(call => call.type === 'OUTGOING');
    const missed = logs.filter(call => call.type === 'MISSED');

    // Display the lists in respective tabs
    const incomingList = document.getElementById('incomingCalls');
    const outgoingList = document.getElementById('outgoingCalls');
    const missedList = document.getElementById('missedCalls');

    // Reset previous content
    incomingList.innerHTML = '';
    outgoingList.innerHTML = '';
    missedList.innerHTML = '';

    // Display the filtered calls for each type
    incoming.forEach(call => {
        const li = document.createElement('li');
        li.textContent = `${call.name || 'Unknown'} - ${call.number} - ${call.date}`;
        incomingList.appendChild(li);
    });

    outgoing.forEach(call => {
        const li = document.createElement('li');
        li.textContent = `${call.name || 'Unknown'} - ${call.number} - ${call.date} - Duration: ${call.duration || 'N/A'}`;
        outgoingList.appendChild(li);
    });

    missed.forEach(call => {
        const li = document.createElement('li');
        li.textContent = `${call.name || 'Unknown'} - ${call.number} - ${call.date}`;
        missedList.appendChild(li);
    });

    console.log("Outgoing calls count: ", outgoing.length); // Debugging log to check if the outgoing calls are present
}

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Show the selected tab
    document.getElementById(tabName).style.display = 'block';
}

function makeCall() {
    const phoneNumber = document.getElementById('phoneNumber').value;

    if (phoneNumber) {
        // Display contact details before making the call
        displayContactDetails(phoneNumber);

        // Using the CallNumber plugin to make the call
        window.plugins.CallNumber.callNumber(
            function (success) {
                console.log('Call initiated successfully');
                ongoingCall = { phone: phoneNumber, startTime: new Date() };
            },
            function (error) {
                console.error('Error initiating the call: ', error);
            },
            phoneNumber,
            true // Set to true to bypass the device's native dialer
        );
    } else {
        alert('Please enter a phone number');
    }
}

function displayContactDetails(phoneNumber) {
    const contactDetailsDiv = document.getElementById('contactDetails');
    contactDetailsDiv.innerHTML = ''; // Clear previous details

    // Fetch the contact name
    navigator.contacts.find(
        ["displayName", "phoneNumbers"],
        function (contacts) {
            const contact = contacts.find(c => c.phoneNumbers && c.phoneNumbers.some(p => p.value.includes(phoneNumber)));
            contactDetailsDiv.innerHTML = `Calling: ${contact ? contact.displayName : 'Unknown'}<br>Phone Number: ${phoneNumber}`;
        },
        function (error) {
            console.error("Error fetching contacts:", error);
            contactDetailsDiv.innerHTML = `Contact not found. Phone Number: ${phoneNumber}`;
        },
        { filter: phoneNumber, multiple: true }
    );
}

function listenForCallEvents() {
    window.PhoneCallTrap.onCall(function (state) {
        console.log("Call state:", state);

        const phoneNumber = state.phoneNumber;
        const callTime = new Date().toLocaleString();

        if (state.state === "RINGING") {
            // If the call is ringing but gets cut off immediately, mark it as missed
            addCallToLog(phoneNumber, 'Missed', callTime);
        } else if (state.state === "OFFHOOK") {
            ongoingCall = { phone: phoneNumber, startTime: new Date() }; // Track the start of the outgoing call
            addCallToLog(phoneNumber, 'Outgoing', callTime);
        } else if (state.state === "IDLE") {
            const callDuration = calculateCallDuration(ongoingCall ? ongoingCall.startTime : null);
            addCallToLog(phoneNumber, 'Missed', callTime);
            updateCallDuration(ongoingCall ? ongoingCall.phone : phoneNumber, callDuration); // Update call duration in outgoing
            ongoingCall = null; // Reset ongoing call
        }

        // Force UI update after detecting the call
        loadCallLogs();
    });
}

// Calculate call duration
function calculateCallDuration(startTime) {
    if (!startTime) return 'N/A';
    const endTime = new Date();
    const durationInSeconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}m ${seconds}s`;
}

function addCallToLog(phoneNumber, callType, callTime) {
    const logEntry = {
        phone: phoneNumber,
        type: callType,
        date: callTime
    };

    const callData = {
        incoming: [],
        outgoing: [],
        missed: []
    };

    // Add the log entry to the appropriate array
    if (callType === 'Incoming') {
        callData.incoming.push(logEntry);
    } else if (callType === 'Outgoing') {
        callData.outgoing.push(logEntry);
    } else if (callType === 'Missed') {
        callData.missed.push(logEntry);
    }

    // Update the UI with the new logs
    console.log("Updated call data:", callData); // Debugging log to check if call data is updated
    displayCalls(callData);
}

// Update the call log with duration for outgoing calls
function updateCallDuration(phoneNumber, duration) {
    const outgoingCalls = document.getElementById('outgoingCalls').children;
    console.log("Outgoing calls: ", outgoingCalls); // Debugging log to check the outgoing calls
    for (let li of outgoingCalls) {
        if (li.textContent.includes(phoneNumber)) {
            li.innerHTML = li.innerHTML + ` - Duration: ${duration}`;
        }
    }
}

// Show the incoming tab by default
showTab('incoming');
