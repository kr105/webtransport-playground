// Transport and stream variables
var transport = null;
var unreliableWriter = null;
var unreliableReader = null;
var stream = null;
var reliableWriter = null;
var reliableReader = null;

// Text encoding and decoding utilities
const encoder = new TextEncoder('utf-8');
const decoder = new TextDecoder('utf-8');

// Grid dimensions
const gridNumRows = 10;
const gridNumCols = 10;

// Connection status indicator
const connectionStatus = document.getElementById("connectionStatus");

// Buttons
const btnConnect = document.getElementById("btnConnect");
const btnSend = document.getElementById("btnSend");
const btnStart1 = document.getElementById("btnStart1");

// Radio buttons
const radioBoth = document.getElementById("radioBoth");
const radioReliable = document.getElementById("radioReliable");
const radioUnreliable = document.getElementById("radioUnreliable");

// Input fields
const txtServerUrl = document.getElementById("txtServerUrl");
const txtMessage = document.getElementById("txtMessage");

// Log text areas
const txtMainLog = document.getElementById("txtMainLog");
const txtReliableLog = document.getElementById("txtReliableLog");
const txtUnreliableLog = document.getElementById("txtUnreliableLog");

function log(textArea, message) {
    const date = new Date();
    const dateStr = '[' + date.getHours() + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2) + '] ';

    textArea.innerHTML = dateStr + message + '\n' + textArea.innerHTML;
}

function logError(textArea, message) {
    log(textArea, '[ERROR] ' + message);
}

function updateConnectionStatus(status) {
    if (status === "connecting") {
        connectionStatus.textContent = "Connecting";
        connectionStatus.className = "bg-yellow-300 text-white text-xs font-bold rounded-full px-2 py-1";
    } else if (status === "connected") {
        connectionStatus.textContent = "Connected";
        connectionStatus.className = "bg-green-500 text-white text-xs font-bold rounded-full px-2 py-1";
    } else if (status === "disconnected") {
        connectionStatus.textContent = "Disconnected";
        connectionStatus.className = "bg-gray-300 text-white text-xs font-bold rounded-full px-2 py-1";
    } else if (status === "error") {
        connectionStatus.textContent = "Error";
        connectionStatus.className = "bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1";
    }
}

async function sendMsg(msg) {
    if (msg == '') {
        logError(txtMainLog, 'Nothing to send');
        return;
    }

    const bytes = encoder.encode(msg)
    let sendingPromises = [];

    if (radioBoth.checked || radioUnreliable.checked) {
        log(txtUnreliableLog, `[SEND] ${msg}`);
        sendingPromises.push(unreliableWriter.write(bytes));
    }

    if (radioBoth.checked || radioReliable.checked) {
        log(txtReliableLog, `[SEND] ${msg}`);
        sendingPromises.push(reliableWriter.write(bytes));
    }

    await Promise.allSettled(sendingPromises);
}

// Reliable message receiving loop
async function reliableLoop() {
    while (true) {
        const { value, done } = await reliableReader.read();

        if (done) {
            break;
        }

        const msg = decoder.decode(value);
        log(txtReliableLog, `[RECV] ${msg}`);
    }
}

// Unreliable message receiving loop
async function unreliableLoop() {
    while (true) {
        const { value, done } = await unreliableReader.read();

        if (done) {
            break;
        }

        const msg = decoder.decode(value);
        log(txtUnreliableLog, `[RECV] ${msg}`);

        // Check if the message is a response for test1
        const test1Pattern = /^test1-(\d{1,2}|100)$/;
        if (test1Pattern.test(msg) === true) {
            const number = msg.replace("test1-", "");

            const cell = document.getElementById(`cell-${number}`);
            const char = document.getElementById(`char-${number}`);

            // Change background color
            cell.classList.remove("bg-gray-200");
            cell.classList.add("bg-green-500");
        }
    }
}

// Draw the grid for the test
function drawGrid() {
    const grid = document.getElementById('grid');

    for (let row = 0; row < gridNumRows; row++) {
        for (let col = 0; col < gridNumCols; col++) {
            const cell = document.createElement('div');
            const cellId = row * gridNumRows + col + 1;
            cell.id = `cell-${cellId}`;
            cell.classList.add(
                'cell',
                'w-full',
                'h-full',
                'text-center',
                'flex',
                'items-center',
                'justify-center',
                'border',
                'border-gray-300',
                'cursor-pointer',
                'relative'
            );

            const char = document.createElement('span');
            char.id = `char-${cellId}`;
            char.classList.add('absolute', 'top-1/2', 'left-1/2', 'transform', '-translate-x-1/2', '-translate-y-1/2', 'whitespace-nowrap', 'max-w-full', 'overflow-hidden');

            cell.appendChild(char);
            grid.appendChild(cell);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startTest1() {
    if (radioUnreliable.checked === false) {
        log(txtMainLog, "The Test1 works only with unreliable connection");
        return;
    }

    for (let cellId = 1; cellId <= (gridNumCols * gridNumRows); cellId++) {
        const cell = document.getElementById(`cell-${cellId}`);
        sendMsg(`test1-${cellId}`);
        cell.classList.add("bg-gray-200");
        await sleep(100);
    }
}

async function connect() {
    try {
        updateConnectionStatus("connecting");

        const url = txtServerUrl.value;
        transport = new WebTransport(url);

        // Set up functions to respond to the connection closing
        transport.closed
            .then(() => {
                logError(txtMainLog, `The connection to ${url} closed gracefully.`);
                updateConnectionStatus("disconnected");
            })
            .catch((error) => {
                logError(txtMainLog, `The connection to ${url} closed due to ${error}.`);
                updateConnectionStatus("error");
            });

        log(txtMainLog, `Connecting to ${url} ...`);

        // Once .ready fulfills, the connection can be used.
        await transport.ready;
    } catch (e) {
        logError(txtMainLog, `Connection failed. ${e}`);
        updateConnectionStatus("error");
        return;
    }

    // We should be OK at this point
    log(txtMainLog, 'Connected succesfully');

    updateConnectionStatus("connected");

    btnSend.disabled = false;
    btnStart1.disabled = false;
    btnConnect.disabled = true;

    // Get streams for unreliable data transmission
    unreliableWriter = transport.datagrams.writable.getWriter();
    unreliableReader = transport.datagrams.readable.getReader();
    log(txtUnreliableLog, 'Initialized reader and writer');

    // Create reliable bidirectional stream
    stream = await transport.createBidirectionalStream();

    // Get streams for unreliable data transmission
    reliableWriter = stream.writable.getWriter();
    reliableReader = stream.readable.getReader();

    log(txtReliableLog, 'Initialized reader and writer');

    // Execute both receiving loops at the same time
    const readers = [reliableLoop(), unreliableLoop()];
    await Promise.all(readers);
}

// Draw the test grid
drawGrid();

// Event listeners
btnConnect.addEventListener("click", connect);
btnSend.addEventListener("click", () => sendMsg(txtMessage.value));
btnStart1.addEventListener("click", startTest1);

// Buttons initial status
btnSend.disabled = true;
btnStart1.disabled = true;
