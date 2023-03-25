var transport = null;
var unreliableWriter = null;
var unreliableReader = null;
var stream = null;
var reliableWriter = null;
var reliableReader = null;

const encoder = new TextEncoder('utf-8');
const decoder = new TextDecoder('utf-8');

// Buttons
const btnConnect = document.getElementById("btnConnect");
const btnSend = document.getElementById("btnSend");

// Radio checks
const radioBoth = document.getElementById("radioBoth");
const radioReliable = document.getElementById("radioReliable");
const radioUnreliable = document.getElementById("radioUnreliable");

// Inputs
const txtServerUrl = document.getElementById("txtServerUrl");
const txtMessage = document.getElementById("txtMessage");

// Text areas
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

async function send() {
    const msg = txtMessage.value;

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

async function unreliableLoop() {
    while (true) {
        const { value, done } = await unreliableReader.read();

        if (done) {
            break;
        }

        const msg = decoder.decode(value);
        log(txtUnreliableLog, `[RECV] ${msg}`);
    }
}

async function connect() {
    try {
        const url = txtServerUrl.value;
        transport = new WebTransport(url);

        // Set up functions to respond to the connection closing
        transport.closed
            .then(() => logError(txtMainLog, `The connection to ${url} closed gracefully.`))
            .catch((error) => logError(txtMainLog, `The connection to ${url} closed due to ${error}.`));

        log(txtMainLog, `Connecting to ${url} ...`);

        // Once .ready fulfills, the connection can be used.
        await transport.ready;
    } catch (e) {
        logError(txtMainLog, `Connection failed. ${e}`);
        return;
    }

    // We should be OK at this point
    log(txtMainLog, 'Connected succesfully');

    btnSend.disabled = false;

    // Get streams for unreliable data transmission
    unreliableWriter = transport.datagrams.writable.getWriter();
    unreliableReader = transport.datagrams.readable.getReader();
    log(txtUnreliableLog, 'Initialized reader and writer');

    // Create reliable bidirectional stream
    stream = await transport.createBidirectionalStream();

    // Get streams for unreliable data transmission
    reliableWriter = stream.writable.getWriter();
    reliableReader = stream.readable.getReader();

    console.log(reliableWriter);
    console.log(reliableReader);

    log(txtReliableLog, 'Initialized reader and writer');

    // Execute both receiving loops at the same time
    const readers = [reliableLoop(), unreliableLoop()];
    await Promise.all(readers);
}

btnConnect.addEventListener("click", connect);
btnSend.addEventListener("click", send);
btnSend.disabled = true;